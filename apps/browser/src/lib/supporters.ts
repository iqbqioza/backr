import { bolt11TagAmountMsats } from "backr-nostr-utils";
import type { NostrEventLike } from "backr-nostr-nips";
import { fetchReceipts } from "./goals";

export interface Supporter {
  pubkey: string;
  msats: bigint;
  comment: string;
  createdAt: number;
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
    });
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

/** 支援者一覧を取得 */
export async function fetchSupporters(
  relayUrl: string,
  goalId: string,
  closedAt?: number,
): Promise<Supporter[]> {
  const receipts = await fetchReceipts(relayUrl, goalId);
  return toSupporters(receipts, closedAt);
}
