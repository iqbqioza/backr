export const MSATS_PER_SAT = 1000n;

/** millisats -> sats 文字列 (例: 1234567n -> "1,234.567") */
export function msatsToSatsString(msats: bigint): string {
  const negative = msats < 0n;
  const abs = negative ? -msats : msats;
  const intPart = abs / MSATS_PER_SAT;
  const fracPart = abs % MSATS_PER_SAT;
  const intStr = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = negative ? "-" : "";
  if (fracPart === 0n) return `${sign}${intStr}`;
  const fracStr = fracPart.toString().padStart(3, "0").replace(/0+$/, "");
  return `${sign}${intStr}.${fracStr}`;
}

export function formatSats(msats: bigint): string {
  return `${msatsToSatsString(msats)} sats`;
}

/**
 * 達成率 (percent)。goal <= 0 のとき 0。100 超え (超過達成) はそのまま返す。
 * 小数第1位に丸める。
 */
export function progressPercent(raisedMsats: bigint, goalMsats: bigint): number {
  if (goalMsats <= 0n) return 0;
  const pct = (Number(raisedMsats) / Number(goalMsats)) * 100;
  if (!Number.isFinite(pct) || pct < 0) return 0;
  return Math.round(pct * 10) / 10;
}

/** 締切ラベル。now >= closedAt なら "終了" */
export function remainingLabel(nowSec: number, closedAtSec: number): string {
  const diff = Math.floor(closedAtSec - nowSec);
  if (diff <= 0) return "終了";
  if (diff >= 86400) return `残り${Math.floor(diff / 86400)}日`;
  if (diff >= 3600) return `残り${Math.floor(diff / 3600)}時間`;
  return `残り${Math.max(1, Math.floor(diff / 60))}分`;
}

/** 相対時刻 (〜前)。未来・現在は "たった今" */
export function timeAgo(nowSec: number, atSec: number): string {
  const diff = Math.floor(nowSec - atSec);
  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}日前`;
  return new Date(atSec * 1000).toLocaleDateString("ja-JP");
}
