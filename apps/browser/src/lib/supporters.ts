import { bolt11TagAmountMsats } from "backr-nostr-utils";
import { validateZapReceipt, type NostrEventLike } from "backr-nostr-nips";
import { fetchReceipts, fetchReceiptsMulti, type GoalCardData, type ProfileView } from "./goals";
import { fetchLnurlPayCached, resolvePayTarget, type PayTarget } from "./zap";

export interface Supporter {
  pubkey: string;
  msats: bigint;
  comment: string;
  createdAt: number;
  /** description/P なしの匿名 Zap */
  anonymous: boolean;
}

function isAnonymous(receipt: NostrEventLike): boolean {
  if (receipt.tags.some((t) => t[0] === "P" && t[1].length > 0)) return false;
  const description = receipt.tags.find((t) => t[0] === "description")?.[1];
  if (description === undefined) return true;
  try {
    const parsed = JSON.parse(description) as { pubkey?: unknown };
    return typeof parsed.pubkey !== "string" || parsed.pubkey.length === 0;
  } catch {
    return true;
  }
}

function senderOf(receipt: NostrEventLike): string {
  const pTag = receipt.tags.find((t) => t[0] === "P")?.[1];
  if (pTag !== undefined && pTag.length > 0) return pTag;
  const description = receipt.tags.find((t) => t[0] === "description")?.[1];
  if (description !== undefined) {
    try {
      const parsed = JSON.parse(description) as { pubkey?: unknown };
      if (typeof parsed.pubkey === "string" && parsed.pubkey.length > 0) return parsed.pubkey;
    } catch {
      // zap request の JSON でなければ無視
    }
  }
  return receipt.pubkey;
}

function commentOf(receipt: NostrEventLike): string {
  const description = receipt.tags.find((t) => t[0] === "description")?.[1];
  if (description === undefined) return "";
  try {
    const parsed = JSON.parse(description) as { content?: unknown };
    return typeof parsed.content === "string" ? parsed.content : "";
  } catch {
    return "";
  }
}

/** receipt 群を表示用に整形 (金額不正は除外、closedAt 以降は除外) */
export function toSupporters(
  receipts: NostrEventLike[],
  closedAt?: number,
): Supporter[] {
  const out: Supporter[] = [];
  for (const receipt of receipts) {
    if (closedAt !== undefined && receipt.created_at > closedAt) continue;
    const msats = bolt11TagAmountMsats(receipt.tags);
    if (msats === null || msats <= 0n) continue;
    out.push({
      pubkey: senderOf(receipt),
      msats,
      comment: commentOf(receipt),
      createdAt: receipt.created_at,
      anonymous: isAnonymous(receipt),
    });
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

/** 最初に支援した人 (最古。同着は合計額? 先に来た方を優先) */
export function firstSupporter(supporters: Supporter[]): Supporter | null {
  if (supporters.length === 0) return null;
  return supporters.reduce((earliest, s) => (s.createdAt < earliest.createdAt ? s : earliest));
}

/** 支援額トップ n (同額は早い方を優先) */
export function topSupporters(supporters: Supporter[], count = 3): Supporter[] {
  return [...supporters]
    .sort((a, b) => {
      if (a.msats !== b.msats) return a.msats > b.msats ? -1 : 1;
      return a.createdAt - b.createdAt;
    })
    .slice(0, count);
}

export interface ValidatedGoalZap {
  totalMsats: bigint;
  count: number;
  supporters: Supporter[];
  /** LNURL 署名者まで照合できたか */
  verified: boolean;
}

const UNVERIFIED: ValidatedGoalZap = { totalMsats: 0n, count: 0, supporters: [], verified: false };

async function resolveSigner(
  profile: ProfileView | null,
): Promise<{ target: PayTarget; signer: string } | null> {
  const target = resolvePayTarget(profile);
  if (target === null) return null;
  try {
    const signer = (await fetchLnurlPayCached(target.payUrl)).nostrPubkey;
    return { target, signer };
  } catch {
    return null;
  }
}

function tallyValidated(
  receipts: NostrEventLike[],
  card: GoalCardData,
  signer: string,
  lnurl: string,
): ValidatedGoalZap {
  const valid = receipts.filter(
    (receipt) =>
      validateZapReceipt(
        receipt,
        {
          goalId: card.id,
          closedAt: card.closedAt,
          expectedSigner: signer,
          expectedLnurl: lnurl,
        },
        (tags) => bolt11TagAmountMsats(tags),
      ).length === 0,
  );
  const supporters = toSupporters(valid, card.closedAt);
  return {
    totalMsats: supporters.reduce((sum, s) => sum + s.msats, 0n),
    count: supporters.length,
    supporters,
    verified: true,
  };
}

/**
 * 検証済み集計: LNURL-pay の nostrPubkey と各 receipt を照合 (NIP-57 Appendix F)。
 * 送金先不明・取得失敗時は未検証 (集計 0) を返す。
 */
export async function fetchGoalZapData(
  relayUrl: string,
  card: GoalCardData,
  profile: ProfileView | null,
): Promise<ValidatedGoalZap> {
  const resolved = await resolveSigner(profile);
  if (resolved === null) return UNVERIFIED;
  let receipts: NostrEventLike[];
  try {
    receipts = await fetchReceipts(relayUrl, card.id);
  } catch {
    return { ...UNVERIFIED, verified: true };
  }
  return tallyValidated(receipts, card, resolved.signer, resolved.target.lnurl);
}

/** 複数リレーの receipt を統合して検証済み集計する */
export async function fetchGoalZapDataMulti(
  relayUrls: string[],
  card: GoalCardData,
  profile: ProfileView | null,
): Promise<ValidatedGoalZap> {
  const resolved = await resolveSigner(profile);
  if (resolved === null) return UNVERIFIED;
  const receipts = await fetchReceiptsMulti(relayUrls, card.id);
  return tallyValidated(receipts, card, resolved.signer, resolved.target.lnurl);
}

/** 一覧カード分の検証済み集計を一括取得 (失敗分は未検証) */
export async function fetchCardZapData(
  relayUrl: string,
  cards: GoalCardData[],
  profiles: Map<string, ProfileView>,
): Promise<Map<string, ValidatedGoalZap>> {
  const entries = await Promise.all(
    cards.map(async (card) => {
      try {
        const data = await fetchGoalZapData(relayUrl, card, profiles.get(card.pubkey) ?? null);
        return [card.id, data] as const;
      } catch {
        return [card.id, UNVERIFIED] as const;
      }
    }),
  );
  return new Map(entries);
}
