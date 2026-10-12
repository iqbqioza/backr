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
import { connectBunker, type BunkerClient } from "backr-nostr-ws";

export type AuthMethod = "nip07" | "nsec" | "bunker" | "readonly";

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

const SESSION_STORAGE_KEY = "backr:session";

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function persistSession(): void {
  const store = storage();
  if (store === null) return;
  const s = session();
  try {
    if (s === null) store.removeItem(SESSION_STORAGE_KEY);
    else store.setItem(SESSION_STORAGE_KEY, JSON.stringify(s));
  } catch {
    // private mode etc: stay memory-only
  }
}

/**
 * Reload survival: restores the display session for methods whose keys
 * live outside the page (extension / none). nsec/bunker secrets are
 * memory-only by policy and cannot be restored.
 */
export function restoreSession(): void {
  const store = storage();
  if (store === null || session() !== null) return;
  try {
    const raw = store.getItem(SESSION_STORAGE_KEY);
    if (raw === null) return;
    const data = JSON.parse(raw) as { method?: unknown; pubkey?: unknown };
    if (typeof data.pubkey !== "string" || !/^[0-9a-f]{64}$/.test(data.pubkey)) return;
    if (data.method === "readonly" || data.method === "nip07") {
      setSession({ method: data.method, pubkey: data.pubkey });
    }
  } catch {
    // corrupted entry: stay logged out
  }
}

/** 秘密鍵・bunker 接続はメモリ保持のみ。保存・送信しない */
let nsecSecret: Uint8Array | null = null;
let bunkerClient: BunkerClient | null = null;

export function loginNip07(pubkey: string): void {
  nsecSecret = null;
  bunkerClient?.close();
  bunkerClient = null;
  setSession({ method: "nip07", pubkey });
  persistSession();
}

export function loginNsec(secretHex: string, pubkey: string): void {
  const bytes = hexToBytes(secretHex);
  nsecSecret = bytes === null ? null : bytes.slice();
  bunkerClient?.close();
  bunkerClient = null;
  setSession({ method: "nsec", pubkey });
  persistSession();
}

export function loginReadonly(pubkey: string): void {
  nsecSecret = null;
  bunkerClient?.close();
  bunkerClient = null;
  setSession({ method: "readonly", pubkey });
  persistSession();
}

/** NIP-46 bunker 接続。署名器側の承認が必要 */
export async function loginBunker(bunkerUrl: string): Promise<void> {
  const client = await connectBunker(bunkerUrl, {
    metadata: JSON.stringify({ name: "Backr", url: "https://github.com/iqbqioza/backr" }),
  });
  nsecSecret = null;
  bunkerClient?.close();
  bunkerClient = client;
  setSession({ method: "bunker", pubkey: client.userPubkey });
  persistSession();
}

export function logout(): void {
  nsecSecret = null;
  bunkerClient?.close();
  bunkerClient = null;
  setSession(null);
  persistSession();
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
  if (s.method === "bunker") {
    if (bunkerClient === null) return null;
    try {
      return await bunkerClient.signEvent(unsigned);
    } catch {
      return null;
    }
  }
  if (typeof window === "undefined" || window.nostr === undefined) return null;
  try {
    const signed = await window.nostr.signEvent(unsigned);
    return isNostrEventLike(signed) ? signed : null;
  } catch {
    return null;
  }
}

restoreSession();
