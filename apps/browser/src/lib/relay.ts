import { buildReq, parseRelayMessage, type NostrEventLike } from "backr-nostr-ws";
import { DEFAULT_RELAY } from "./const";

export type RelayFilter = Record<string, unknown>;

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
