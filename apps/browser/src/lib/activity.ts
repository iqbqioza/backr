import type { ReportData } from "./goals";
import type { Supporter } from "./supporters";
import type { CommentView } from "./comments";
import { formatSats } from "backr-utils";

export interface ActivityItem {
  kind: "zap" | "comment" | "report";
  at: number;
  pubkey: string | null;
  text: string;
}

/**
 * 支援・コメント・報告を混ぜた新着アクティビティ (純粋関数)。
 * 新しい順・上限付き。
 */
export function buildActivityFeed(
  supporters: Supporter[],
  comments: CommentView[],
  reports: ReportData[],
  limit = 5,
): ActivityItem[] {
  const items: ActivityItem[] = [
    ...supporters.map((s): ActivityItem => ({
      kind: "zap",
      at: s.createdAt,
      pubkey: s.pubkey,
      text: `Zapped ${formatSats(s.msats)}`,
    })),
    ...comments.map((c): ActivityItem => ({
      kind: "comment",
      at: c.createdAt,
      pubkey: c.pubkey,
      text: "Commented",
    })),
    ...reports.map((r): ActivityItem => ({
      kind: "report",
      at: r.createdAt,
      pubkey: r.author,
      text: `Update "${r.title}"`,
    })),
  ];
  return items.sort((a, b) => b.at - a.at).slice(0, limit);
}

/** 直近24時間の支援者数 */
export function recentSupporterCount(supporters: Supporter[], nowSec: number): number {
  return supporters.filter((s) => nowSec - s.createdAt < 86400).length;
}
