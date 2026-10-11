import { isNostrEventLike, normalizeEventLike, type NostrEventLike } from "backr-nostr-nips";

export type { NostrEventLike };

export type RelayInbound =
  | { type: "EVENT"; subscriptionId: string; event: NostrEventLike }
  | { type: "EOSE"; subscriptionId: string }
  | { type: "CLOSED"; subscriptionId: string; message: string }
  | { type: "NOTICE"; message: string }
  | { type: "OK"; eventId: string; accepted: boolean; message: string };

/** ["REQ", subId, ...filters] を組み立てる。不正なら null */
export function buildReq(subscriptionId: string, filters: unknown[]): string | null {
  if (subscriptionId.length === 0 || subscriptionId.length > 256) return null;
  try {
    return JSON.stringify(["REQ", subscriptionId, ...filters]);
  } catch {
    return null;
  }
}

/** ["CLOSE", subId] を組み立てる。不正なら null */
export function buildClose(subscriptionId: string): string | null {
  if (subscriptionId.length === 0 || subscriptionId.length > 256) return null;
  return JSON.stringify(["CLOSE", subscriptionId]);
}

/** リレー受信メッセージを判別する。不正なら null */
export function parseRelayMessage(raw: string): RelayInbound | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || typeof parsed[0] !== "string") {
    return null;
  }
  const [verb, ...rest] = parsed as unknown[];
  if (verb === "EVENT") {
    const [subId, event] = rest;
    if (typeof subId !== "string" || !isNostrEventLike(event)) return null;
    return { type: "EVENT", subscriptionId: subId, event: normalizeEventLike(event) };
  }
  if (verb === "EOSE") {
    const [subId] = rest;
    if (typeof subId !== "string") return null;
    return { type: "EOSE", subscriptionId: subId };
  }
  if (verb === "CLOSED") {
    const [subId, message] = rest;
    if (typeof subId !== "string") return null;
    return {
      type: "CLOSED",
      subscriptionId: subId,
      message: typeof message === "string" ? message : "",
    };
  }
  if (verb === "NOTICE") {
    const [message] = rest;
    if (typeof message !== "string") return null;
    return { type: "NOTICE", message };
  }
  if (verb === "OK") {
    const [eventId, accepted, message] = rest;
    if (typeof eventId !== "string" || typeof accepted !== "boolean") return null;
    return {
      type: "OK",
      eventId,
      accepted,
      message: typeof message === "string" ? message : "",
    };
  }
  return null;
}
