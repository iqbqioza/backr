/** NIP-01 イベントの最小形 */
export interface NostrEventLike {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export function isHex32(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

/** 形だけの軽量チェック (署名検証はしない) */
export function isNostrEventLike(value: unknown): value is NostrEventLike {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e["id"] === "string" &&
    typeof e["pubkey"] === "string" &&
    typeof e["created_at"] === "number" &&
    typeof e["kind"] === "number" &&
    Array.isArray(e["tags"]) &&
    typeof e["content"] === "string" &&
    typeof e["sig"] === "string"
  );
}
