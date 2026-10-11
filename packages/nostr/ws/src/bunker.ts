import {
  buildConnectParams,
  buildRpcRequest,
  decryptRpcResponse,
  derivePublicKey,
  generateSecretKey,
  isNostrEventLike,
  parseBunkerUrl,
  signEvent,
  verifyEventSignature,
  type NostrEventLike,
  type UnsignedEvent,
} from "backr-nostr-nips";
import { parseRelayMessage } from "./messages";

export class BunkerError extends Error {}

export class BunkerAuthRequired extends BunkerError {
  url: string;
  constructor(url: string) {
    super(`別画面での認証が必要です: ${url}`);
    this.url = url;
  }
}

export interface BunkerClient {
  readonly userPubkey: string;
  readonly remotePubkey: string;
  readonly clientPubkey: string;
  signEvent(unsigned: UnsignedEvent): Promise<NostrEventLike>;
  ping(): Promise<void>;
  close(): void;
}

interface Pending {
  settle: (result: string | undefined, error: string | undefined) => void;
  timer: ReturnType<typeof setTimeout>;
}

function openSocket(url: string, timeoutMs: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      reject(err instanceof Error ? err : new BunkerError("リレーに接続できません"));
      return;
    }
    const timer = setTimeout(() => {
      try {
        socket.close();
      } catch {
        // noop
      }
      reject(new BunkerError("リレーに接続できません"));
    }, timeoutMs);
    socket.addEventListener("open", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new BunkerError("リレーに接続できません"));
    });
  });
}

/**
 * NIP-46 bunker:// 接続。署名器の承認が必要なためタイムアウトは長め。
 * client 秘密鍵はメモリ保持のみ。
 */
export async function connectBunker(
  bunkerUrl: string,
  opts?: { clientSecretHex?: string; timeoutMs?: number; metadata?: string },
): Promise<BunkerClient> {
  const pointer = parseBunkerUrl(bunkerUrl);
  if (pointer === null) throw new BunkerError("bunker URL が不正です");
  const timeoutMs = opts?.timeoutMs ?? 120000;
  const clientSecret = opts?.clientSecretHex ?? generateSecretKey();
  const clientPubkey = derivePublicKey(clientSecret);
  if (clientPubkey === null) throw new BunkerError("クライアント鍵を生成できません");

  const socket = await openSocket(pointer.relays[0], Math.min(timeoutMs, 30000));
  const pending = new Map<string, Pending>();
  const subId = `backr-bunker-${clientPubkey.slice(0, 8)}`;
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    try {
      socket.send(JSON.stringify(["CLOSE", subId]));
    } catch {
      // noop
    }
    try {
      socket.close();
    } catch {
      // noop
    }
  };

  socket.addEventListener("message", (msg) => {
    const parsed = parseRelayMessage(String(msg.data));
    if (parsed === null || parsed.type !== "EVENT") return;
    const ev = parsed.event;
    if (ev.kind !== 24133 || ev.pubkey !== pointer.remotePubkey) return;
    if (!ev.tags.some((t) => t[0] === "p" && t[1] === clientPubkey)) return;
    const rpc = decryptRpcResponse(ev.content, clientSecret, pointer.remotePubkey);
    if (rpc === null) return;
    const entry = pending.get(rpc.id);
    if (entry === undefined) return;
    pending.delete(rpc.id);
    clearTimeout(entry.timer);
    entry.settle(rpc.result, rpc.error);
  });

  const request = (method: string, params: string[], ms: number): Promise<string> => {
    const built = buildRpcRequest({
      clientSecretHex: clientSecret,
      clientPubkeyHex: clientPubkey,
      remotePubkeyHex: pointer.remotePubkey,
      method,
      params,
    });
    if (built === null) return Promise.reject(new BunkerError("要求を組み立てられません"));
    const signed = signEvent(built.event, clientSecret);
    if (signed === null) return Promise.reject(new BunkerError("署名に失敗しました"));
    try {
      socket.send(JSON.stringify(["EVENT", signed]));
    } catch {
      return Promise.reject(new BunkerError("送信に失敗しました"));
    }
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(built.id);
        reject(new BunkerError(`応答がありません: ${method}`));
      }, ms);
      pending.set(built.id, {
        settle: (result, error) => {
          if (error !== undefined) {
            if (result === "auth_url") reject(new BunkerAuthRequired(error));
            else reject(new BunkerError(error));
            return;
          }
          if (result === undefined) {
            reject(new BunkerError("応答が空です"));
            return;
          }
          resolve(result);
        },
        timer,
      });
    });
  };

  // 応答購読を先に開始してから connect (競合回避)
  try {
    socket.send(
      JSON.stringify([
        "REQ",
        subId,
        { kinds: [24133], "#p": [clientPubkey], since: Math.floor(Date.now() / 1000) },
      ]),
    );
  } catch {
    close();
    throw new BunkerError("購読に失敗しました");
  }

  try {
    const ack = await request(
      "connect",
      buildConnectParams({
        remotePubkey: pointer.remotePubkey,
        secret: pointer.secret,
        metadata: opts?.metadata,
      }),
      timeoutMs,
    );
    if (ack !== "ack") throw new BunkerError(`接続が拒否されました: ${ack}`);
    try {
      await request("switch_relays", [], 15000);
    } catch {
      // 現在のリレーを維持
    }
    const userPubkey = await request("get_public_key", [], timeoutMs);
    if (!/^[0-9a-f]{64}$/.test(userPubkey)) throw new BunkerError("不正なユーザ公開鍵です");
    return {
      userPubkey,
      remotePubkey: pointer.remotePubkey,
      clientPubkey,
      signEvent: async (unsigned: UnsignedEvent) => {
        const result = await request(
          "sign_event",
          [
            JSON.stringify({
              kind: unsigned.kind,
              content: unsigned.content,
              tags: unsigned.tags,
              created_at: unsigned.created_at,
            }),
          ],
          timeoutMs,
        );
        let parsed: unknown;
        try {
          parsed = JSON.parse(result) as unknown;
        } catch {
          throw new BunkerError("署名応答を解釈できません");
        }
        if (!isNostrEventLike(parsed) || !verifyEventSignature(parsed)) {
          throw new BunkerError("署名を検証できません");
        }
        return parsed;
      },
      ping: async () => {
        const result = await request("ping", [], 15000);
        if (result !== "pong") throw new BunkerError("ping 失敗");
      },
      close,
    };
  } catch (err) {
    close();
    throw err;
  }
}
