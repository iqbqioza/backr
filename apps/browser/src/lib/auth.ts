import { createSignal } from "solid-js";
import {
  isNostrEventLike,
  verifyEventSignature,
  type NostrEventLike,
  type UnsignedEvent,
} from "backr-nostr-nips";
import { connectBunker, type BunkerClient } from "backr-nostr-ws";
import { DEFAULT_RELAY } from "./const";
import { fetchRelayList } from "./goals";

export type AuthMethod = "nip07" | "bunker";

export interface Session {
  method: AuthMethod;
  pubkey: string;
}

export interface UserRelays {
  read: string[];
  write: string[];
}

const EMPTY_RELAYS: UserRelays = { read: [], write: [] };

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

const [userRelays, setUserRelays] = createSignal<UserRelays>(EMPTY_RELAYS);
/** ログイン者の NIP-65 リレーセット (取得失敗時は空) */
export function getUserRelays(): UserRelays {
  return userRelays();
}

/** kind:10002 を裏で取得して覚える。失敗してもログインは継続する */
function loadUserRelays(pubkey: string): void {
  fetchRelayList(DEFAULT_RELAY, pubkey).then(setUserRelays).catch(() => {
    setUserRelays(EMPTY_RELAYS);
  });
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
 * Reload survival: restores the extension session. Its key lives in the
 * extension, so a restore only revives the display identity. Bunker
 * connections are memory-only and cannot be restored.
 */
export function restoreSession(): void {
  const store = storage();
  if (store === null || session() !== null) return;
  try {
    const raw = store.getItem(SESSION_STORAGE_KEY);
    if (raw === null) return;
    const data = JSON.parse(raw) as { method?: unknown; pubkey?: unknown };
    if (typeof data.pubkey !== "string" || !/^[0-9a-f]{64}$/.test(data.pubkey)) return;
    if (data.method === "nip07") {
      setSession({ method: "nip07", pubkey: data.pubkey });
    }
  } catch {
    // corrupted entry: stay logged out
  }
}

/** bunker 接続はメモリ保持のみ。保存・送信しない */
let bunkerClient: BunkerClient | null = null;

export function loginNip07(pubkey: string): void {
  bunkerClient?.close();
  bunkerClient = null;
  setSession({ method: "nip07", pubkey });
  setUserRelays(EMPTY_RELAYS);
  loadUserRelays(pubkey);
  persistSession();
}

/** NIP-46 bunker 接続。署名器側の承認が必要 */
export async function loginBunker(bunkerUrl: string): Promise<void> {
  const client = await connectBunker(bunkerUrl, {
    metadata: JSON.stringify({ name: "Backr", url: "https://github.com/iqbqioza/backr" }),
  });
  bunkerClient?.close();
  bunkerClient = client;
  setSession({ method: "bunker", pubkey: client.userPubkey });
  setUserRelays(EMPTY_RELAYS);
  loadUserRelays(client.userPubkey);
  persistSession();
}

export function logout(): void {
  bunkerClient?.close();
  bunkerClient = null;
  setSession(null);
  setUserRelays(EMPTY_RELAYS);
  persistSession();
}

export function canSign(): boolean {
  return session() !== null;
}

export function hasNip07(): boolean {
  return typeof window !== "undefined" && window.nostr !== undefined;
}

/** セッションの手段で署名。未ログインは null */
export async function signWithSession(unsigned: UnsignedEvent): Promise<NostrEventLike | null> {
  const s = session();
  if (s === null) return null;
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
    // The extension could be buggy or tampered with: mirror the bunker path
    // and only publish events whose signature actually verifies.
    return isNostrEventLike(signed) && verifyEventSignature(signed) ? signed : null;
  } catch {
    return null;
  }
}

restoreSession();
{
  const s = getSession();
  if (s !== null) loadUserRelays(s.pubkey);
}
