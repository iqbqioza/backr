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

/** sats 相当の BTC 表示 (例: 100000000n -> "1 BTC")。msats 端数は切り捨て */
export function formatSatsBtc(msats: bigint): string {
  const sats = msats / MSATS_PER_SAT;
  const intPart = sats / 100000000n;
  const fracPart = sats % 100000000n;
  if (fracPart === 0n) return `${intPart.toString()} BTC`;
  const fracStr = fracPart.toString().padStart(8, "0").replace(/0+$/, "");
  return `${intPart.toString()}.${fracStr} BTC`;
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

/**
 * メーター表示幅 (percent)。raised > 0 でも極小だと見えないため
 * 最小表示 (既定 2%) を保証する。上限 100。0 以下・目標不正は 0。
 */
export function meterWidthPercent(
  raisedMsats: bigint,
  goalMsats: bigint,
  minVisible = 2,
): number {
  if (raisedMsats <= 0n || goalMsats <= 0n) return 0;
  return Math.min(100, Math.max(minVisible, progressPercent(raisedMsats, goalMsats)));
}

/** 締切ラベル。now >= closedAt なら "Closed" */
export function remainingLabel(nowSec: number, closedAtSec: number): string {
  const diff = Math.floor(closedAtSec - nowSec);
  if (diff <= 0) return "Closed";
  if (diff >= 86400) return `${Math.floor(diff / 86400)}d left`;
  if (diff >= 3600) return `${Math.floor(diff / 3600)}h left`;
  return `${Math.max(1, Math.floor(diff / 60))}m left`;
}

/** 秒単位のカウントダウン (例: "1d 2h 3m 4s left")。now >= closedAt なら "Closed" */
export function countdownLabel(nowSec: number, closedAtSec: number): string {
  let diff = Math.floor(closedAtSec - nowSec);
  if (diff <= 0) return "Closed";
  const days = Math.floor(diff / 86400);
  diff -= days * 86400;
  const hours = Math.floor(diff / 3600);
  diff -= hours * 3600;
  const minutes = Math.floor(diff / 60);
  const seconds = diff - minutes * 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return `${parts.join(" ")} left`;
}

/** 相対時刻。未来・現在は "just now" */
export function timeAgo(nowSec: number, atSec: number): string {
  const diff = Math.floor(nowSec - atSec);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(atSec * 1000).toLocaleDateString("en-US");
}
