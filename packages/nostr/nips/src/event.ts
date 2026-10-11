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
export function isNostrEventLike(value: unknown): value is NostrEventLike {  if (typeof value !== "object" || value === null) return false;
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

function lowerHex(value: string, length: 64 | 128): string {
  const pattern = length === 64 ? /^[0-9a-fA-F]{64}$/ : /^[0-9a-fA-F]{128}$/;
  return pattern.test(value) ? value.toLowerCase() : value;
}

function lowerTagId(value: string): string {
  return /^[0-9a-fA-F]{64}$/.test(value) ? value.toLowerCase() : value;
}

/**
 * 取り込み正規化: 一部クライアントが大文字 hex で送る id/pubkey/sig および
 * e/p タグ参照を小文字に揃える。hex でなければそのまま (検証で弾く)。
 */
export function normalizeEventLike(ev: NostrEventLike): NostrEventLike {
  return {
    ...ev,
    id: lowerHex(ev.id, 64),
    pubkey: lowerHex(ev.pubkey, 64),
    sig: lowerHex(ev.sig, 128),
    tags: ev.tags.map((t) =>
      t.length >= 2 && (t[0] === "e" || t[0] === "p" || t[0] === "P")
        ? [t[0], lowerTagId(t[1]), ...t.slice(2)]
        : t,
    ),
  };
}
