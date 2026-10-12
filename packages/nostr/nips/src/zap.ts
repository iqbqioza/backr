import { verifyEventSignature } from "./crypto";
import type { NostrEventLike } from "./event";

export interface ZapTally {
  totalMsats: bigint;
  count: number;
}

function hasETag(ev: NostrEventLike, id: string): boolean {
  return ev.tags.some((t) => t[0] === "e" && t[1] === id);
}

export interface ZapReceiptContext {
  goalId: string;
  closedAt?: number;
  /** LNURL-pay の nostrPubkey。receipt 署名者と一致必須 (NIP-57 Appendix F) */
  expectedSigner: string;
  /** 受取人の lnurl。request の lnurl タグと照合 (あれば) */
  expectedLnurl?: string;
}

/** zap request (description タグ) を取り出す */
export function parseZapRequest(receipt: NostrEventLike): NostrEventLike | null {
  const raw = receipt.tags.find((t) => t[0] === "description")?.[1];
  if (raw === undefined) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const ev = data as NostrEventLike;
  if (ev.kind !== 9734 || !Array.isArray(ev.tags)) return null;
  return ev;
}

/**
 * NIP-57 Appendix F: zap receipt の検証。空配列 = 妥当。
 * 金額は amountOf (bolt11 デコード) で取得する。
 */
export function validateZapReceipt(
  receipt: NostrEventLike,
  ctx: ZapReceiptContext,
  amountOf: (tags: string[][]) => bigint | null,
): string[] {
  const errors: string[] = [];
  if (receipt.kind !== 9735) errors.push("kind must be 9735");
  if (!verifyEventSignature(receipt)) errors.push("invalid signature");
  if (!/^[0-9a-f]{64}$/.test(ctx.expectedSigner)) {
    errors.push("bad validation context");
    return errors;
  }
  if (receipt.pubkey !== ctx.expectedSigner) errors.push("unexpected signer");
  if (ctx.closedAt !== undefined && receipt.created_at > ctx.closedAt) {
    errors.push("after closed_at");
  }
  if (!hasETag(receipt, ctx.goalId)) errors.push("not for this goal");
  const amount = amountOf(receipt.tags);
  if (amount === null || amount <= 0n) {
    errors.push("undecodable invoice");
    return errors;
  }
  const request = parseZapRequest(receipt);
  if (request === null) {
    // NIP-57 匿名 receipt (description なし) は金額・lnurl 照合を省略する
    if (receipt.tags.some((t) => t[0] === "description")) {
      errors.push("missing zap request");
    }
    return errors;
  }
  const requestAmount = request.tags.find((t) => t[0] === "amount")?.[1];
  if (requestAmount !== undefined && requestAmount !== amount.toString()) {
    errors.push("amount mismatch");
  }
  const requestLnurl = request.tags.find((t) => t[0] === "lnurl")?.[1];
  if (
    requestLnurl !== undefined &&
    ctx.expectedLnurl !== undefined &&
    requestLnurl.toLowerCase() !== ctx.expectedLnurl.toLowerCase()
  ) {
    errors.push("lnurl mismatch");
  }
  return errors;
}

/**
 * NIP-57 zap receipt (kind:9735) の集計。
 * - kind 9735 のみ、e タグが goalId に一致するもの
 * - closedAt があれば created_at > closedAt を除外 (NIP-75)
 * - 金額は amountOf (bolt11 デコード) で取得。null/0以下は除外
 */
export function tallyZaps(
  events: NostrEventLike[],
  goalId: string,
  closedAt: number | undefined,
  amountOf: (ev: NostrEventLike) => bigint | null,
): ZapTally {
  let totalMsats = 0n;
  let count = 0;
  for (const ev of events) {
    if (ev.kind !== 9735) continue;
    if (!hasETag(ev, goalId)) continue;
    if (closedAt !== undefined && ev.created_at > closedAt) continue;
    const amount = amountOf(ev);
    if (amount === null || amount <= 0n) continue;
    totalMsats += amount;
    count += 1;
  }
  return { totalMsats, count };
}
