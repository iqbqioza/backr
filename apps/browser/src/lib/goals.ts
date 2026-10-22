import {
  goalTitle,
  parseRelayList,
  validateGoal9041,
  type Goal9041View,
  type NostrEventLike,
} from "backr-nostr-nips";
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

/** 複数リレーから一覧を集めて id で重複排除 (新しい順) */
export async function fetchGoalCardsMulti(relayUrls: string[]): Promise<GoalCardData[]> {
  const settled = await Promise.allSettled(relayUrls.map((url) => fetchGoalCards(url)));
  const seen = new Map<string, GoalCardData>();
  for (const s of settled) {
    if (s.status !== "fulfilled") continue;
    for (const card of s.value) {
      const current = seen.get(card.id);
      if (current === undefined || card.createdAt > current.createdAt) {
        seen.set(card.id, card);
      }
    }
  }
  return [...seen.values()].sort((a, b) => b.createdAt - a.createdAt);
}

/** 詳細: 単一 9041 を id 取得 */
export async function fetchGoalById(relayUrl: string, id: string): Promise<GoalCardData | null> {
  const events = await fetchEvents([{ ids: [id] }], relayUrl);
  const found = events.find((ev) => ev.id === id && ev.kind === 9041);
  return found === undefined ? null : toGoalCard(found);
}

/** 複数リレーを順に試し、最初に見つかった goal を返す */
export async function fetchGoalByIdMulti(relayUrls: string[], id: string): Promise<GoalCardData | null> {
  for (const url of [...new Set(relayUrls)]) {
    try {
      const found = await fetchGoalById(url, id);
      if (found !== null) return found;
    } catch {
      // 次のリレーへ
    }
  }
  return null;
}

/** zap receipt (kind:9735) を goalId で取得 */
export async function fetchReceipts(relayUrl: string, goalId: string): Promise<NostrEventLike[]> {
  const events = await fetchEvents([{ kinds: [9735], "#e": [goalId], limit: 500 }], relayUrl);
  return events.filter(
    (ev) => ev.kind === 9735 && ev.tags.some((t) => t[0] === "e" && t[1] === goalId),
  );
}

/** 複数リレーから receipt を集めて id で重複排除 */
export async function fetchReceiptsMulti(
  relayUrls: string[],
  goalId: string,
): Promise<NostrEventLike[]> {
  const settled = await Promise.allSettled(relayUrls.map((url) => fetchReceipts(url, goalId)));
  const seen = new Set<string>();
  const out: NostrEventLike[] = [];
  for (const s of settled) {
    if (s.status !== "fulfilled") continue;
    for (const ev of s.value) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        out.push(ev);
      }
    }
  }
  return out;
}

export interface ReportData {
  id: string;
  author: string;
  identifier: string;
  title: string;
  summary?: string;
  createdAt: number;
  content: string;
  image?: string;
}

/** 30023 イベントを表示用に整形 (goal 不一致は null) */
export function toReportData(ev: NostrEventLike, goalId: string): ReportData | null {
  if (ev.kind !== 30023) return null;
  const linked = ev.tags.some((t) => t[0] === "goal" && t[1] === goalId);
  if (!linked) return null;
  const identifier = ev.tags.find((t) => t[0] === "d")?.[1] ?? "";
  if (identifier.length === 0) return null;
  const report: ReportData = {
    id: ev.id,
    author: ev.pubkey,
    identifier,
    title: ev.tags.find((t) => t[0] === "title")?.[1] ?? "Update",
    createdAt: ev.created_at,
    content: ev.content,
  };
  const summary = ev.tags.find((t) => t[0] === "summary")?.[1];
  if (summary !== undefined && summary.length > 0) report.summary = summary;
  const image = ev.tags.find((t) => t[0] === "image")?.[1];
  if (image !== undefined && image.length > 0) report.image = image;
  return report;
}

/** 同一 (author, d) は最新のみ残す (NIP-23 編集対応) */
export function dedupeReports(reports: ReportData[]): ReportData[] {
  const latest = new Map<string, ReportData>();
  for (const report of reports) {
    const key = `${report.author}:${report.identifier}`;
    const current = latest.get(key);
    if (current === undefined || report.createdAt > current.createdAt) {
      latest.set(key, report);
    }
  }
  return [...latest.values()].sort((a, b) => b.createdAt - a.createdAt);
}

/** 活動報告: kind:30023 のうち goal タグが goalId のもの (編集は最新のみ) */
export async function fetchReports(relayUrl: string, goalId: string): Promise<ReportData[]> {
  const events = await fetchEvents(
    [{ kinds: [30023], "#goal": [goalId], limit: 50 }],
    relayUrl,
  );
  const reports: ReportData[] = [];
  for (const ev of events) {
    const report = toReportData(ev, goalId);
    if (report !== null) reports.push(report);
  }
  return dedupeReports(reports);
}

/** 複数リレーから報告を集めて統合 (同一 author/d は最新のみ) */
export async function fetchReportsMulti(
  relayUrls: string[],
  goalId: string,
): Promise<ReportData[]> {
  const settled = await Promise.allSettled(relayUrls.map((url) => fetchReports(url, goalId)));
  const all: ReportData[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") all.push(...s.value);
  }
  return dedupeReports(all);
}

export interface ProfileView {
  pubkey: string;
  name: string;
  image?: string;
  lud16?: string;
  lud06?: string;
  about?: string;
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
  if (typeof d["picture"] === "string" && d["picture"].length > 0) {
    try {
      const u = new URL(d["picture"]);
      if (u.protocol === "http:" || u.protocol === "https:") profile.image = d["picture"];
    } catch {
      // ignore invalid picture URLs
    }
  }
  if (typeof d["lud16"] === "string" && d["lud16"].length > 0) profile.lud16 = d["lud16"];
  if (typeof d["lud06"] === "string" && d["lud06"].length > 0) profile.lud06 = d["lud06"];
  if (typeof d["about"] === "string" && d["about"].length > 0) profile.about = d["about"];
  return profile;
}

/** 作成者プロフィール取得 (なければ null) */
export async function fetchProfile(
  relayUrl: string,
  pubkey: string,
): Promise<ProfileView | null> {
  const profiles = await fetchProfiles(relayUrl, [pubkey]);
  return profiles.get(pubkey) ?? null;
}

/** 複数リレーを順に試すプロフィール取得 */
export async function fetchProfileMulti(
  relayUrls: string[],
  pubkey: string,
): Promise<ProfileView | null> {
  for (const url of [...new Set(relayUrls)]) {
    try {
      const profiles = await fetchProfiles(url, [pubkey]);
      const found = profiles.get(pubkey);
      if (found !== undefined) return found;
    } catch {
      // 次のリレーへ
    }
  }
  return null;
}

/** kind:0 群を pubkey → ProfileView に整形 (純粋関数) */
export function profilesByKey(events: NostrEventLike[]): Map<string, ProfileView> {
  const map = new Map<string, ProfileView>();
  for (const ev of events) {
    if (ev.kind !== 0 || map.has(ev.pubkey)) continue;
    const profile = parseProfile(ev.pubkey, ev.content);
    if (profile !== null) map.set(ev.pubkey, profile);
  }
  return map;
}

/** 複数プロフィールを一括取得 */
export async function fetchProfiles(
  relayUrl: string,
  pubkeys: string[],
): Promise<Map<string, ProfileView>> {
  const unique = [...new Set(pubkeys)];
  if (unique.length === 0) return new Map();
  const events = await fetchEvents([{ kinds: [0], authors: unique, limit: unique.length }], relayUrl);
  return profilesByKey(events);
}

/** 複数リレーからプロフィールを集めて統合 (先勝ち) */
export async function fetchProfilesMulti(
  relayUrls: string[],
  pubkeys: string[],
): Promise<Map<string, ProfileView>> {
  const settled = await Promise.allSettled(relayUrls.map((url) => fetchProfiles(url, pubkeys)));
  const merged = new Map<string, ProfileView>();
  for (const s of settled) {
    if (s.status !== "fulfilled") continue;
    for (const [key, value] of s.value) {
      if (!merged.has(key)) merged.set(key, value);
    }
  }
  return merged;
}

/** NIP-65 リレーリスト (kind:10002) を取得する。失敗時は空 */
export async function fetchRelayList(
  relayUrl: string,
  pubkey: string,
): Promise<{ read: string[]; write: string[] }> {
  try {
    const events = await fetchEvents([{ kinds: [10002], authors: [pubkey], limit: 1 }], relayUrl);
    const found = events.find((ev) => ev.kind === 10002 && ev.pubkey === pubkey);
    if (found === undefined) return { read: [], write: [] };
    const parsed = parseRelayList(found);
    if (parsed === null) return { read: [], write: [] };
    return { read: parsed.read.slice(0, 5), write: parsed.write.slice(0, 5) };
  } catch {
    return { read: [], write: [] };
  }
}

/** 作成者の NIP-65 read リレー (最大3件)。取得失敗時は空 */
export async function fetchAuthorReadRelays(relayUrl: string, pubkey: string): Promise<string[]> {
  const list = await fetchRelayList(relayUrl, pubkey);
  return list.read.slice(0, 3);
}

export type GoalStatus = "achieved" | "ended" | "ending-soon" | "active";

/** ステータス判定 (純粋関数): 達成 > 終了 > 残り3日以内 > 募集中 */
export function goalStatus(
  raisedMsats: bigint,
  goalMsats: bigint,
  nowSec: number,
  closedAt?: number,
): GoalStatus {
  const ended = closedAt !== undefined && nowSec >= closedAt;
  const pct = goalMsats > 0n ? Number(raisedMsats) / Number(goalMsats) : 0;
  if (pct >= 1) return "achieved";
  if (ended) return "ended";
  if (closedAt !== undefined && closedAt - nowSec < 3 * 86400) return "ending-soon";
  return "active";
}

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  achieved: "Goal reached!",
  ended: "Closed",
  "ending-soon": "Almost there",
  active: "Funding now",
};

/** 達成までの残額。達成済み・目標不正は 0 */
export function goalRemaining(raisedMsats: bigint, goalMsats: bigint): bigint {
  if (goalMsats <= 0n) return 0n;
  const diff = goalMsats - raisedMsats;
  return diff > 0n ? diff : 0n;
}
