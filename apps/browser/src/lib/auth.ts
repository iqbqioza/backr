import { createSignal } from "solid-js";
import {
  bytesToHex,
  decodeBare,
  derivePublicKey,
  hexToBytes,
  isNostrEventLike,
  signEvent,
  type NostrEventLike,
  type UnsignedEvent,
} from "backr-nostr-nips";

export type AuthMethod = "nip07" | "nsec" | "readonly";

export interface Session {
  method: AuthMethod;
  pubkey: string;
}

export interface NostrExtension {
  getPublicKey(): Promise<string>;
  signEvent(unsigned: UnsignedEvent): Promise<unknown>;
}

declare global {
  interface Window {
    nostr?: NostrExtension;
  }
}

const [session, setSession] = createSignal<Session | null>(null);
export function getSession(): Session | null {
  return session();
}

/** 秘密鍵はメモリ保持のみ。保存・送信しない */
let nsecSecret: Uint8Array | null = null;

export function loginNip07(pubkey: string): void {
  nsecSecret = null;
  setSession({ method: "nip07", pubkey });
}

export function loginNsec(secretHex: string, pubkey: string): void {
  const bytes = hexToBytes(secretHex);
  nsecSecret = bytes === null ? null : bytes.slice();
  setSession({ method: "nsec", pubkey });
}

export function loginReadonly(pubkey: string): void {
  nsecSecret = null;
  setSession({ method: "readonly", pubkey });
}

export function logout(): void {
  nsecSecret = null;
  setSession(null);
}

export function canSign(): boolean {
  const s = session();
  return s !== null && s.method !== "readonly";
}

export function hasNip07(): boolean {
  return typeof window !== "undefined" && window.nostr !== undefined;
}

export interface SecretInfo {
  secretHex: string;
  pubkey: string;
}

/** nsec1… または 64桁hex (秘密鍵として解釈) */
export function resolveSecret(input: string): SecretInfo | null {
  const trimmed = input.trim();
  let hex: string | null = null;
  if (trimmed.startsWith("nsec1")) {
    hex = decodeBare(trimmed, "nsec");
  } else if (/^[0-9a-f]{64}$/.test(trimmed)) {
    hex = trimmed;
  }
  if (hex === null) return null;
  const pubkey = derivePublicKey(hex);
  return pubkey === null ? null : { secretHex: hex, pubkey };
}

/** npub1… または 64桁hex (公開鍵として解釈) */
export function resolvePubkeyInput(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.startsWith("npub1")) return decodeBare(trimmed, "npub");
  return /^[0-9a-f]{64}$/.test(trimmed) ? trimmed : null;
}

/** セッションの手段で署名。readonly・未ログインは null */
export async function signWithSession(unsigned: UnsignedEvent): Promise<NostrEventLike | null> {
  const s = session();
  if (s === null || s.method === "readonly") return null;
  if (s.method === "nsec") {
    if (nsecSecret === null) return null;
    return signEvent(unsigned, bytesToHex(nsecSecret));
  }
  if (typeof window === "undefined" || window.nostr === undefined) return null;
  try {
    const signed = await window.nostr.signEvent(unsigned);
    return isNostrEventLike(signed) ? signed : null;
  } catch {
    return null;
  }
}
