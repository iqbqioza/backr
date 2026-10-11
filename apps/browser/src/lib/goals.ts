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

/** zap receipt (kind:9735) を goalId で取得 */
export async function fetchReceipts(relayUrl: string, goalId: string): Promise<NostrEventLike[]> {
  const events = await fetchEvents([{ kinds: [9735], "#e": [goalId], limit: 500 }], relayUrl);
  return events.filter(
    (ev) => ev.kind === 9735 && ev.tags.some((t) => t[0] === "e" && t[1] === goalId),
  );
}

/** 集計: kind:9735 の #e=goalId。closedAt 以降は除外 */
export async function fetchGoalTally(relayUrl: string, goalId: string, closedAt?: number) {
  const receipts = await fetchReceipts(relayUrl, goalId);
  return tallyZaps(receipts, goalId, closedAt, (ev) => bolt11TagAmountMsats(ev.tags));
}

/** 一覧カード分の集計を一括取得 (失敗分は 0) */
export async function fetchCardTallies(
  relayUrl: string,
  cards: GoalCardData[],
): Promise<Map<string, bigint>> {
  const entries = await Promise.all(
    cards.map(async (card) => {
      try {
        const tally = await fetchGoalTally(relayUrl, card.id, card.closedAt);
        return [card.id, tally.totalMsats] as const;
      } catch {
        return [card.id, 0n] as const;
      }
    }),
  );
  return new Map(entries);
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

export interface ProfileView {
  pubkey: string;
  name: string;
  image?: string;
  lud16?: string;
  lud06?: string;
}

/** kind:0 content の JSON を表示用に整形 */
export function parseProfile(pubkey: string, content: string): ProfileView | null {
  let data: unknown;
  try {
    data = JSON.parse(content) as unknown;
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  let name = pubkey.slice(0, 12);
  if (typeof d["display_name"] === "string" && d["display_name"].length > 0) {
    name = d["display_name"];
  } else if (typeof d["name"] === "string" && d["name"].length > 0) {
    name = d["name"];
  }
  const profile: ProfileView = { pubkey, name };
  if (typeof d["picture"] === "string" && d["picture"].length > 0) profile.image = d["picture"];
  if (typeof d["lud16"] === "string" && d["lud16"].length > 0) profile.lud16 = d["lud16"];
  if (typeof d["lud06"] === "string" && d["lud06"].length > 0) profile.lud06 = d["lud06"];
  return profile;
}

/** 作成者プロフィール取得 (なければ null) */
export async function fetchProfile(
  relayUrl: string,
  pubkey: string,
): Promise<ProfileView | null> {
  const events = await fetchEvents([{ kinds: [0], authors: [pubkey], limit: 1 }], relayUrl);
  const found = events.find((ev) => ev.kind === 0);
  if (found === undefined) return null;
  return parseProfile(pubkey, found.content);
}

export type SortMode = "new" | "progress" | "deadline";

function progressRatio(card: GoalCardData, tallies: Map<string, bigint>): number {
  if (card.goalMsats <= 0n) return 0;
  return Number(tallies.get(card.id) ?? 0n) / Number(card.goalMsats);
}

/** 一覧ソート (純粋関数) */
export function sortGoalCards(
  cards: GoalCardData[],
  tallies: Map<string, bigint>,
  mode: SortMode,
): GoalCardData[] {
  const arr = [...cards];
  if (mode === "deadline") {
    arr.sort(
      (a, b) => (a.closedAt ?? Number.MAX_SAFE_INTEGER) - (b.closedAt ?? Number.MAX_SAFE_INTEGER),
    );
  } else if (mode === "progress") {
    arr.sort((a, b) => progressRatio(b, tallies) - progressRatio(a, tallies));
  } else {
    arr.sort((a, b) => b.createdAt - a.createdAt);
  }
  return arr;
}
