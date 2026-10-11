import {
  goalTitle,
  tallyZaps,
  validateGoal9041,
  type Goal9041View,
  type NostrEventLike,
} from "backr-nostr-nips";
import { bolt11TagAmountMsats } from "backr-nostr-utils";
import { fetchEvents } from "./relay";

export interface GoalCardData extends Goal9041View {
  title: string;
}

export function toGoalCard(ev: NostrEventLike): GoalCardData | null {
  const result = validateGoal9041(ev);
  if (!result.ok) return null;
  return { ...result.value, title: goalTitle(result.value) };
}

/** 一覧: kind:9041 + #t:backr */
export async function fetchGoalCards(relayUrl: string): Promise<GoalCardData[]> {
  const events = await fetchEvents([{ kinds: [9041], "#t": ["backr"], limit: 50 }], relayUrl);
  const cards: GoalCardData[] = [];
  for (const ev of events) {
    const card = toGoalCard(ev);
    if (card !== null) cards.push(card);
  }
  return cards.sort((a, b) => b.createdAt - a.createdAt);
}

/** 詳細: 単一 9041 を id 取得 */
export async function fetchGoalById(relayUrl: string, id: string): Promise<GoalCardData | null> {
  const events = await fetchEvents([{ ids: [id] }], relayUrl);
  const found = events.find((ev) => ev.id === id && ev.kind === 9041);
  return found === undefined ? null : toGoalCard(found);
}

/** 集計: kind:9735 の #e=goalId。closedAt 以降は除外 */
export async function fetchGoalTally(relayUrl: string, goalId: string, closedAt?: number) {
  const receipts = await fetchEvents([{ kinds: [9735], "#e": [goalId], limit: 500 }], relayUrl);
  return tallyZaps(receipts, goalId, closedAt, (ev) => bolt11TagAmountMsats(ev.tags));
}

export interface ReportData {
  id: string;
  title: string;
  createdAt: number;
}

/** 活動報告: kind:30023 のうち goal タグが goalId のもの */
export async function fetchReports(relayUrl: string, goalId: string): Promise<ReportData[]> {
  const events = await fetchEvents([{ kinds: [30023], limit: 50 }], relayUrl);
  const reports: ReportData[] = [];
  for (const ev of events) {
    const linked = ev.tags.some((t) => t[0] === "goal" && t[1] === goalId);
    if (!linked) continue;
    const title = ev.tags.find((t) => t[0] === "title")?.[1] ?? "活動報告";
    reports.push({ id: ev.id, title, createdAt: ev.created_at });
  }
  return reports.sort((a, b) => b.createdAt - a.createdAt);
}
