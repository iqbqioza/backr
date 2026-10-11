import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hashes, schnorr } from "@noble/secp256k1";
import { bytesToHex, hexToBytes } from "./hex";
import { isHex32, normalizeEventLike, type NostrEventLike } from "./event";

// noble v3 は sync 署名用のハッシュ実装を外部注入する (公式の wiring 手順)
hashes.sha256 = sha256;
hashes.hmacSha256 = (key, message) => hmac(sha256, key, message);

export interface UnsignedEvent {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

/** NIP-01: id = sha256(utf8(JSON([0, pubkey, created_at, kind, tags, content]))) */
export function computeEventId(ev: UnsignedEvent): string | null {
  if (!isHex32(ev.pubkey)) return null;
  if (!Number.isInteger(ev.created_at) || !Number.isInteger(ev.kind)) return null;
  if (
    !Array.isArray(ev.tags) ||
    !ev.tags.every((t) => Array.isArray(t) && t.every((x) => typeof x === "string"))
  ) {
    return null;
  }
  if (typeof ev.content !== "string") return null;
  const serialized = JSON.stringify([0, ev.pubkey, ev.created_at, ev.kind, ev.tags, ev.content]);
  return bytesToHex(sha256(new TextEncoder().encode(serialized)));
}

/** 秘密鍵 (hex) から公開鍵 (hex)。不正なら null */
export function derivePublicKey(secretHex: string): string | null {
  const secret = hexToBytes(secretHex);
  if (secret === null || secret.length !== 32) return null;
  try {
    return bytesToHex(schnorr.getPublicKey(secret));
  } catch {
    return null;
  }
}

/** 署名して完全なイベントにする。不正なら null */
export function signEvent(ev: UnsignedEvent, secretHex: string): NostrEventLike | null {
  const id = computeEventId(ev);
  const secret = hexToBytes(secretHex);
  if (id === null || secret === null || secret.length !== 32) return null;
  const idBytes = hexToBytes(id);
  if (idBytes === null) return null;
  try {
    const sig = schnorr.sign(idBytes, secret);
    return { ...ev, id, sig: bytesToHex(sig) };
  } catch {
    return null;
  }
}

/** id 再計算 + Schnorr 検証 (大文字 hex は正規化して扱う) */
export function verifyEventSignature(input: NostrEventLike): boolean {
  const ev = normalizeEventLike(input);
  const recomputed = computeEventId(ev);
  if (recomputed === null || recomputed !== ev.id) return false;
  if (!/^[0-9a-f]{128}$/.test(ev.sig)) return false;
  const sig = hexToBytes(ev.sig);
  const pub = hexToBytes(ev.pubkey);
  const id = hexToBytes(ev.id);
  if (sig === null || pub === null || id === null) return false;
  try {
    return schnorr.verify(sig, id, pub);
  } catch {
    return false;
  }
}
