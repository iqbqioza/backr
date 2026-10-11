import {
  buildZapRequest,
  decodeLud06,
  encodeLud06,
  lud16ToPayUrl,
  type NostrEventLike,
} from "backr-nostr-nips";
import { decodeBolt11AmountMsats } from "backr-nostr-utils";
import { getSession, signWithSession } from "./auth";
import type { ProfileView } from "./goals";

export interface PayTarget {
  payUrl: string;
  lnurl: string;
}

/** プロフィール (lud16 優先、なければ lud06) から送金先を解決 */
export function resolvePayTarget(profile: ProfileView | null): PayTarget | null {
  if (profile === null) return null;
  if (profile.lud16 !== undefined) {
    const payUrl = lud16ToPayUrl(profile.lud16);
    if (payUrl === null) return null;
    const lnurl = encodeLud06(payUrl);
    if (lnurl === null) return null;
    return { payUrl, lnurl };
  }
  return null;
}

/** lud06 (lnurl bech32 / URL) から送金先を解決。lud16 不在時の代替 */
export function resolvePayTargetFromLud06(lud06: string): PayTarget | null {
  const trimmed = lud06.trim();
  if (trimmed.startsWith("lnurl1")) {
    const payUrl = decodeLud06(trimmed);
    return payUrl === null ? null : { payUrl, lnurl: trimmed };
  }
  const lnurl = encodeLud06(trimmed);
  return lnurl === null ? null : { payUrl: trimmed, lnurl };
}

export interface LnurlPayInfo {
  callback: string;
  minSendable: number;
  maxSendable: number;
  /** zap receipt 署名者。NIP-57 Appendix C で必須 */
  nostrPubkey: string;
}

/** LNURL-pay 初回取得。Zap 未対応・範囲外は投げる */
export async function fetchLnurlPay(payUrl: string): Promise<LnurlPayInfo> {
  let response: Response;
  try {
    response = await fetch(payUrl);
  } catch {
    throw new Error("LNURL サーバに接続できません");
  }
  if (!response.ok) throw new Error(`LNURL 取得失敗: ${response.status}`);
  const data = (await response.json()) as Record<string, unknown>;
  if (data["tag"] !== "payRequest") throw new Error("LNURL-pay ではありません");
  if (data["allowsNostr"] !== true) throw new Error("このウォレットは Zap に対応していません");
  if (typeof data["callback"] !== "string" || data["callback"].length === 0) {
    throw new Error("callback がありません");
  }
  if (typeof data["minSendable"] !== "number" || typeof data["maxSendable"] !== "number") {
    throw new Error("送金範囲が不正です");
  }
  if (typeof data["nostrPubkey"] !== "string" || !/^[0-9a-f]{64}$/.test(data["nostrPubkey"])) {
    throw new Error("nostrPubkey がありません");
  }
  return {
    callback: data["callback"],
    minSendable: data["minSendable"],
    maxSendable: data["maxSendable"],
    nostrPubkey: data["nostrPubkey"],
  };
}

const payInfoCache = new Map<string, { info: LnurlPayInfo; at: number }>();

/** LNURL-pay 取得 (5分キャッシュ)。Zap フローと集計検証で共有 */
export async function fetchLnurlPayCached(payUrl: string, ttlMs = 300000): Promise<LnurlPayInfo> {
  const cached = payInfoCache.get(payUrl);
  if (cached !== undefined && Date.now() - cached.at < ttlMs) return cached.info;
  const info = await fetchLnurlPay(payUrl);
  payInfoCache.set(payUrl, { info, at: Date.now() });
  return info;
}

export function checkAmountRange(amountMsats: bigint, info: LnurlPayInfo): string | null {
  if (amountMsats < BigInt(Math.floor(info.minSendable))) {
    return `最低 ${info.minSendable / 1000} sats から送金できます`;
  }
  if (amountMsats > BigInt(Math.floor(info.maxSendable))) {
    return `上限は ${info.maxSendable / 1000} sats です`;
  }
  return null;
}

/**
 * 署名済み 9734 を callback に送りインボイスを受け取る。
 * 返却インボイスの金額一致も検証する。
 */
export async function requestZapInvoice(
  callback: string,
  amountMsats: bigint,
  zapRequest: NostrEventLike,
  lnurl: string,
): Promise<string> {
  const query =
    `${callback.includes("?") ? "&" : "?"}amount=${amountMsats.toString()}` +
    `&nostr=${encodeURIComponent(JSON.stringify(zapRequest))}` +
    `&lnurl=${encodeURIComponent(lnurl)}`;
  let response: Response;
  try {
    response = await fetch(`${callback}${query}`);
  } catch {
    throw new Error("callback に接続できません");
  }
  if (!response.ok) throw new Error(`インボイス取得失敗: ${response.status}`);
  const data = (await response.json()) as Record<string, unknown>;
  if (typeof data["pr"] !== "string") {
    const reason = typeof data["reason"] === "string" ? data["reason"] : "unknown";
    throw new Error(`インボイスを取得できません: ${reason}`);
  }
  const decoded = decodeBolt11AmountMsats(data["pr"]);
  if (decoded !== amountMsats) throw new Error("インボイスの金額が一致しません");
  return data["pr"];
}

export interface SignedZapRequest {
  zapRequest: NostrEventLike;
  lnurl: string;
}

/** 9734 を組み立ててセッションで署名する */
export async function signZapRequest(args: {
  recipientPubkey: string;
  goalId: string;
  amountMsats: bigint;
  relays: string[];
  lnurl: string;
  comment: string;
}): Promise<SignedZapRequest> {
  const session = getSession();
  if (session === null) throw new Error("ログインが必要です");
  const draft = buildZapRequest({
    senderPubkey: session.pubkey,
    recipientPubkey: args.recipientPubkey,
    goalId: args.goalId,
    amountMsats: args.amountMsats,
    relays: args.relays,
    lnurl: args.lnurl,
    comment: args.comment,
  });
  if (draft === null) throw new Error("zap request を組み立てられません");
  const signed = await signWithSession(draft);
  if (signed === null) throw new Error("署名に失敗しました");
  return { zapRequest: signed, lnurl: args.lnurl };
}
