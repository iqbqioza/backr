import { isHex32, type NostrEventLike } from "./event";
import type { UnsignedEvent } from "./crypto";

export interface CommentTarget {
  id: string;
  pubkey: string;
  kind: number;
}

export interface TopLevelCommentArgs {
  authorPubkey: string;
  root: CommentTarget;
  relayHint?: string;
  content: string;
  createdAt?: number;
}

function firstTag(tags: string[][], name: string): string[] | undefined {
  return tags.find((t) => t[0] === name);
}

/**
 * NIP-22 トップレベルコメント (kind:1111)。
 * 通常イベント (9041) 宛: E/e に goal id、K/k に 9041。
 */
export function buildTopLevelComment(args: TopLevelCommentArgs): UnsignedEvent | null {
  if (!isHex32(args.authorPubkey)) return null;
  if (!isHex32(args.root.id) || !isHex32(args.root.pubkey)) return null;
  if (!Number.isInteger(args.root.kind) || args.root.kind < 0) return null;
  if (typeof args.content !== "string" || args.content.trim().length === 0) return null;
  const hint = args.relayHint ?? "";
  const kindStr = String(args.root.kind);
  return {
    pubkey: args.authorPubkey,
    created_at: args.createdAt ?? Math.floor(Date.now() / 1000),
    kind: 1111,
    tags: [
      ["E", args.root.id, hint, args.root.pubkey],
      ["K", kindStr],
      ["P", args.root.pubkey, hint],
      ["e", args.root.id, hint, args.root.pubkey],
      ["k", kindStr],
      ["p", args.root.pubkey, hint],
    ],
    content: args.content,
  };
}

export interface ReplyCommentArgs extends TopLevelCommentArgs {
  parent: CommentTarget;
}

/** NIP-22 返信: E/K/P は root のまま、e/k/p を親コメントに向ける */
export function buildReplyComment(args: ReplyCommentArgs): UnsignedEvent | null {
  if (!isHex32(args.parent.id) || !isHex32(args.parent.pubkey)) return null;
  if (!Number.isInteger(args.parent.kind) || args.parent.kind < 0) return null;
  const base = buildTopLevelComment(args);
  if (base === null) return null;
  const hint = args.relayHint ?? "";
  const parentKind = String(args.parent.kind);
  return {
    ...base,
    tags: [
      ["E", args.root.id, hint, args.root.pubkey],
      ["K", String(args.root.kind)],
      ["P", args.root.pubkey, hint],
      ["e", args.parent.id, hint, args.parent.pubkey],
      ["k", parentKind],
      ["p", args.parent.pubkey, hint],
    ],
  };
}

export interface CommentView {
  id: string;
  pubkey: string;
  createdAt: number;
  content: string;
  rootId: string | null;
  rootKind: string | null;
  parentId: string | null;
  parentKind: string | null;
}

/** kind:1111 を表示用に解釈。K/k 必須 (NIP-22) */
export function parseComment(ev: NostrEventLike): CommentView | null {
  if (ev.kind !== 1111 || typeof ev.content !== "string") return null;
  const kTag = firstTag(ev.tags, "K");
  const parentKindTag = firstTag(ev.tags, "k");
  if (kTag === undefined || parentKindTag === undefined) return null;
  // root は大文字タグ優先、なければ小文字にフォールバック
  const rootId = firstTag(ev.tags, "E")?.[1] ?? firstTag(ev.tags, "e")?.[1] ?? null;
  const parentId = firstTag(ev.tags, "e")?.[1] ?? null;
  return {
    id: ev.id,
    pubkey: ev.pubkey,
    createdAt: ev.created_at,
    content: ev.content,
    rootId,
    rootKind: kTag[1] ?? null,
    parentId,
    parentKind: parentKindTag[1] ?? null,
  };
}

/** 指定 goal を root とするコメントか */
export function isGoalComment(ev: NostrEventLike, goalId: string): boolean {
  if (ev.kind !== 1111) return false;
  const view = parseComment(ev);
  return view !== null && view.rootId === goalId;
}
