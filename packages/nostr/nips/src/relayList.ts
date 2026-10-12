import type { NostrEventLike } from "./event";

export interface RelayList {
  read: string[];
  write: string[];
}

function isWss(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "wss:" || u.protocol === "ws:";
  } catch {
    return false;
  }
}

/**
 * NIP-65 kind:10002 リレーリストを読み取り/書き込みに振り分ける。
 * marker なしは両方に含める。不正 URL・重複は除外する。
 */
export function parseRelayList(ev: NostrEventLike): RelayList | null {
  if (ev.kind !== 10002) return null;
  const read: string[] = [];
  const write: string[] = [];
  for (const t of ev.tags) {
    if (t[0] !== "r" || typeof t[1] !== "string" || !isWss(t[1])) continue;
    const marker = t[2];
    if (marker === "read" || marker === undefined) {
      if (!read.includes(t[1])) read.push(t[1]);
    }
    if (marker === "write" || marker === undefined) {
      if (!write.includes(t[1])) write.push(t[1]);
    }
  }
  return { read, write };
}
