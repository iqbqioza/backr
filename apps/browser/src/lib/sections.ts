import type { GoalCardData } from "./goals";
import type { ValidatedGoalZap } from "./supporters";

export interface HomeSections {
  /** ヒーロー: 達成率トップ (なければ null) */
  featured: GoalCardData | null;
  /** おすすめ: 達成率順トップ */
  recommended: GoalCardData[];
  /** もうすぐ終了: 締切が近く未終了 */
  endingSoon: GoalCardData[];
  /** 新着: 作成順 */
  fresh: GoalCardData[];
}

function ratio(card: GoalCardData, zapData: Map<string, ValidatedGoalZap>): number {
  if (card.goalMsats <= 0n) return 0;
  return Number(zapData.get(card.id)?.totalMsats ?? 0n) / Number(card.goalMsats);
}

/** 一覧を CAMPFIRE 風セクションに振り分ける (純粋関数) */
export function pickSections(
  cards: GoalCardData[],
  zapData: Map<string, ValidatedGoalZap>,
  nowSec: number = Math.floor(Date.now() / 1000),
): HomeSections {
  if (cards.length === 0) {
    return { featured: null, recommended: [], endingSoon: [], fresh: [] };
  }
  const byProgress = [...cards].sort((a, b) => ratio(b, zapData) - ratio(a, zapData));
  const endingSoon = cards
    .filter((c) => c.closedAt !== undefined && c.closedAt > nowSec)
    .sort((a, b) => (a.closedAt ?? 0) - (b.closedAt ?? 0))
    .slice(0, 4);
  const fresh = [...cards].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
  return {
    featured: byProgress[0],
    recommended: byProgress.slice(0, 4),
    endingSoon,
    fresh,
  };
}
