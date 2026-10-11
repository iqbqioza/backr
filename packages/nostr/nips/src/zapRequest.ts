import { isHex32, type NostrEventLike } from "./event";
import { verifyEventSignature } from "./crypto";
import type { UnsignedEvent } from "./crypto";

export interface ZapRequestArgs {
  senderPubkey: string;
  recipientPubkey: string;
  goalId: string;
  amountMsats: bigint;
  relays: string[];
  lnurl?: string;
  comment?: string;
}

/**
 * NIP-57 Appendix A: kind:9734 zap request (未署名)。
 * リレーに publish せず LNURL callback へ GET する。
 */
export function buildZapRequest(args: ZapRequestArgs): UnsignedEvent | null {
  if (!isHex32(args.senderPubkey) || !isHex32(args.recipientPubkey)) return null;
  if (!isHex32(args.goalId)) return null;
  if (args.amountMsats <= 0n) return null;
  if (args.relays.length === 0) return null;
  if (args.comment !== undefined && typeof args.comment !== "string") return null;
  const tags: string[][] = [
    ["relays", ...args.relays],
    ["amount", args.amountMsats.toString()],
    ["p", args.recipientPubkey],
    ["e", args.goalId],
    ["k", "9041"],
  ];
  if (args.lnurl !== undefined) tags.push(["lnurl", args.lnurl]);
  return {
    pubkey: args.senderPubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind: 9734,
    tags,
    content: args.comment ?? "",
  };
}

/**
 * NIP-57 Appendix D: zap request の検証。空配列 = 妥当。
 * amountMsats 指定時は amount タグ一致も確認する。
 */
export function validateZapRequest(ev: NostrEventLike, amountMsats?: bigint): string[] {
  const errors: string[] = [];
  if (ev.kind !== 9734) errors.push("kind must be 9734");
  if (!verifyEventSignature(ev)) errors.push("invalid signature");
  const pTags = ev.tags.filter((t) => t[0] === "p");
  if (pTags.length !== 1) errors.push("must have exactly one p tag");
  if (ev.tags.filter((t) => t[0] === "e").length > 1) errors.push("must have 0 or 1 e tags");
  if (!ev.tags.some((t) => t[0] === "relays" && t.length > 1)) {
    errors.push("missing relays tag");
  }
  const amountTag = ev.tags.find((t) => t[0] === "amount")?.[1];
  if (amountMsats !== undefined) {
    if (amountTag !== amountMsats.toString()) errors.push("amount mismatch");
  } else if (amountTag !== undefined && !/^\d+$/.test(amountTag)) {
    errors.push("invalid amount tag");
  }
  return errors;
}
