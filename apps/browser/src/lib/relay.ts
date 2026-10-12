import { buildReq, parseRelayMessage, type NostrEventLike } from "backr-nostr-ws";
import { DEFAULT_RELAY } from "./const";

export type RelayFilter = Record<string, unknown>;

/** リレーにイベントを公開し OK を待つ */
export function publishEvent(
  relayUrl: string,
  event: NostrEventLike,
  timeoutMs = 10000,
): Promise<{ accepted: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    let socket: WebSocket;
    try {
      socket = new WebSocket(relayUrl);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("connect failed"));
      return;
    }
    const timer = setTimeout(() => {
      try {
        socket.close();
      } catch {
        // noop
      }
      reject(new Error("publish timeout"));
    }, timeoutMs);
    const finish = (fn: () => void) => {
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // noop
      }
      fn();
    };
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify(["EVENT", event]));
    });
    socket.addEventListener("message", (msg) => {
      const parsed = parseRelayMessage(String(msg.data));
      if (parsed === null) return;
      if (parsed.type === "OK" && parsed.eventId === event.id) {
        finish(() => {
          resolve({ accepted: parsed.accepted, message: parsed.message });
        });
      } else if (parsed.type === "CLOSED") {
        finish(() => {
          reject(new Error(parsed.message.length > 0 ? parsed.message : "relay closed"));
        });
      }
    });
    socket.addEventListener("error", () => {
      finish(() => {
        reject(new Error("relay connection failed"));
      });
    });
  });
}

/** REQ を投げて EOSE/CLOSED までの EVENT を集める */
export function fetchEvents(
  filters: RelayFilter[],
  relayUrl: string = DEFAULT_RELAY,
  timeoutMs = 10000,
): Promise<NostrEventLike[]> {
  const subId = `backr-${Math.random().toString(36).slice(2)}`;
  const req = buildReq(subId, filters);
  if (req === null) return Promise.reject(new Error("invalid request"));
  return new Promise((resolve, reject) => {
    const events: NostrEventLike[] = [];
    let socket: WebSocket;
    try {
      socket = new WebSocket(relayUrl);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("connect failed"));
      return;
    }
    const timer = setTimeout(() => {
      try {
        socket.close();
      } catch {
        // noop: タイムアウト時のクローズ失敗は無視
      }
      reject(new Error("relay timeout"));
    }, timeoutMs);
    const done = (result: NostrEventLike[]) => {
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // noop
      }
      resolve(result);
    };
    socket.addEventListener("open", () => {
      socket.send(req);
    });
    socket.addEventListener("message", (msg) => {
      const parsed = parseRelayMessage(String(msg.data));
      if (parsed === null) return;
      if (parsed.type === "EVENT") events.push(parsed.event);
      else if (parsed.type === "EOSE" || parsed.type === "CLOSED") done(events);
    });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("relay connection failed"));
    });
  });
}

/**
 * 複数リレーへ並列公開する。1件でも accepted なら成功。
 * kind:10002 の更新は行わない (読み取り専用)。
 */
export async function publishEventMulti(
  relayUrls: string[],
  event: NostrEventLike,
  timeoutMs = 10000,
): Promise<{ accepted: boolean; message: string; acceptedRelays: string[] }> {
  const urls = [...new Set(relayUrls)];
  const settled = await Promise.allSettled(urls.map((url) => publishEvent(url, event, timeoutMs)));
  const acceptedRelays: string[] = [];
  const failures: string[] = [];
  settled.forEach((s, i) => {
    const url = urls[i] ?? "";
    if (s.status === "fulfilled" && s.value.accepted) {
      acceptedRelays.push(url);
    } else if (s.status === "fulfilled") {
      failures.push(`${url}: ${s.value.message}`);
    } else {
      failures.push(`${url}: ${s.reason instanceof Error ? s.reason.message : "failed"}`);
    }
  });
  return {
    accepted: acceptedRelays.length > 0,
    message:
      acceptedRelays.length > 0
        ? `accepted by ${acceptedRelays.length} relay(s)`
        : failures.join("; "),
    acceptedRelays,
  };
}
