import type { NostrEventLike } from "./event";

export interface ZapTally {
  totalMsats: bigint;
  count: number;
}

function hasETag(ev: NostrEventLike, id: string): boolean {
  return ev.tags.some((t) => t[0] === "e" && t[1] === id);
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
