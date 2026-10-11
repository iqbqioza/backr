import { randomBytes } from "@noble/hashes/utils.js";
import { bytesToHex } from "./hex";
import { conversationKey, nip44Decrypt, nip44Encrypt } from "./nip44";
import type { UnsignedEvent } from "./crypto";

export interface BunkerPointer {
  remotePubkey: string;
  relays: string[];
  secret?: string;
}

/** bunker://<pubkey>?relay=…&secret=… を解釈する */
export function parseBunkerUrl(url: string): BunkerPointer | null {
  if (!url.startsWith("bunker://")) return null;
  const rest = url.slice("bunker://".length);
  const queryIndex = rest.indexOf("?");
  const pub = (queryIndex < 0 ? rest : rest.slice(0, queryIndex)).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(pub)) return null;
  const params = new URLSearchParams(queryIndex < 0 ? "" : rest.slice(queryIndex + 1));
  const relays = params.getAll("relay").filter((r) => {
    try {
      const u = new URL(r);
      return u.protocol === "wss:" || u.protocol === "ws:";
    } catch {
      return false;
    }
  });
  if (relays.length === 0) return null;
  const secret = params.get("secret");
  return secret !== null && secret.length > 0 ? { remotePubkey: pub, relays, secret } : { remotePubkey: pub, relays };
}

export interface RpcEnvelope {
  id: string;
  payload: string;
}

/** kind:24133 要求の中身を暗号化して組み立てる。戻り値は未署名イベントと要求 id */
export function buildRpcRequest(args: {
  clientSecretHex: string;
  clientPubkeyHex: string;
  remotePubkeyHex: string;
  method: string;
  params: string[];
  createdAt?: number;
}): { event: UnsignedEvent; id: string } | null {
  if (!/^[0-9a-f]{64}$/.test(args.clientPubkeyHex) || !/^[0-9a-f]{64}$/.test(args.remotePubkeyHex)) {
    return null;
  }
  const conv = conversationKey(args.clientSecretHex, args.remotePubkeyHex);
  if (conv === null) return null;
  const id = bytesToHex(randomBytes(16));
  const payload = nip44Encrypt(JSON.stringify({ id, method: args.method, params: args.params }), conv);
  if (payload === null) return null;
  return {
    id,
    event: {
      pubkey: args.clientPubkeyHex,
      created_at: args.createdAt ?? Math.floor(Date.now() / 1000),
      kind: 24133,
      tags: [["p", args.remotePubkeyHex]],
      content: payload,
    },
  };
}

export interface RpcResponse {
  id: string;
  result?: string;
  error?: string;
}

/** kind:24133 応答を復号・解釈する */
export function decryptRpcResponse(
  content: string,
  clientSecretHex: string,
  remotePubkeyHex: string,
): RpcResponse | null {
  const conv = conversationKey(clientSecretHex, remotePubkeyHex);
  if (conv === null) return null;
  const plaintext = nip44Decrypt(content, conv);
  if (plaintext === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(plaintext) as unknown;
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  if (typeof record["id"] !== "string") return null;
  const out: RpcResponse = { id: record["id"] };
  if (typeof record["result"] === "string") out.result = record["result"];
  if (typeof record["error"] === "string") out.error = record["error"];
  return out;
}

/**
 * connect params を組み立てる。空の任意値は後方から省略し、
 * metadata 単独時は perms に "" を入れる (NIP-46)。
 */
export function buildConnectParams(args: {
  remotePubkey: string;
  secret?: string;
  perms?: string;
  metadata?: string;
}): string[] {
  const params = [args.remotePubkey];
  if (args.metadata !== undefined) {
    params.push(args.secret ?? "", args.perms ?? "", args.metadata);
  } else if (args.perms !== undefined) {
    params.push(args.secret ?? "", args.perms);
  } else if (args.secret !== undefined) {
    params.push(args.secret);
  }
  return params;
}
