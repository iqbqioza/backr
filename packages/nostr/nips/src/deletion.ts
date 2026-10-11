import type { UnsignedEvent } from "./crypto";

function isHex32(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

/**
 * NIP-09: kind:5 削除要求を組み立てる (署名は signEvent で別途)。
 * 通常イベントは e タグで指定する。
 */
export function buildDeletionEvent(args: {
  pubkey: string;
  eventIds: string[];
  relayHint?: string;
  reason?: string;
  createdAt?: number;
}): UnsignedEvent | null {
  if (!isHex32(args.pubkey)) return null;
  const ids = [...new Set(args.eventIds)];
  if (ids.length === 0 || !ids.every(isHex32)) return null;
  const hint = args.relayHint !== undefined && args.relayHint.length > 0 ? args.relayHint : null;
  return {
    pubkey: args.pubkey,
    created_at: args.createdAt ?? Math.floor(Date.now() / 1000),
    kind: 5,
    tags: ids.map((id) => (hint === null ? ["e", id] : ["e", id, hint])),
    content: args.reason ?? "",
  };
}
