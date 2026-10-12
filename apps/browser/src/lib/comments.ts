import {
  buildReplyComment,
  buildTopLevelComment,
  isGoalComment,
  parseComment,
  type CommentTarget,
  type CommentView,
} from "backr-nostr-nips";
import { getSession, getUserRelays, signWithSession } from "./auth";
import { DEFAULT_RELAY } from "./const";
import { fetchEvents, publishEventMulti } from "./relay";

export type { CommentView };

/** goal 宛てのコメント一覧 (E/e 照合。古い順) */
export async function fetchComments(
  relayUrl: string,
  goalId: string,
): Promise<CommentView[]> {
  const events = await fetchEvents([{ kinds: [1111], limit: 100 }], relayUrl);
  const out: CommentView[] = [];
  for (const ev of events) {
    if (!isGoalComment(ev, goalId)) continue;
    const view = parseComment(ev);
    if (view !== null) out.push(view);
  }
  return out.sort((a, b) => a.createdAt - b.createdAt);
}

/** 複数リレーからコメントを集めて id で重複排除 (古い順) */
export async function fetchCommentsMulti(
  relayUrls: string[],
  goalId: string,
): Promise<CommentView[]> {
  const settled = await Promise.allSettled(relayUrls.map((url) => fetchComments(url, goalId)));
  const seen = new Set<string>();
  const out: CommentView[] = [];
  for (const s of settled) {
    if (s.status !== "fulfilled") continue;
    for (const view of s.value) {
      if (!seen.has(view.id)) {
        seen.add(view.id);
        out.push(view);
      }
    }
  }
  return out.sort((a, b) => a.createdAt - b.createdAt);
}

export const MAX_THREAD_DEPTH = 3;

export interface ThreadNode {
  comment: CommentView;
  depth: number;
  children: ThreadNode[];
}

/** 子孫コメント数 (自分は含まず) */
export function countDescendants(node: ThreadNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

/**
 * ツリーを深さ優先で平坦化する (純粋関数)。
 * collapsed に含まれるノードの子孫は除外する。
 */
export function flattenVisible(nodes: ThreadNode[], collapsed: Set<string>): ThreadNode[] {
  const out: ThreadNode[] = [];
  const walk = (list: ThreadNode[], hidden: boolean) => {
    for (const node of list) {
      if (!hidden) out.push(node);
      walk(node.children, hidden || collapsed.has(node.comment.id));
    }
  };
  walk(nodes, false);
  return out;
}

/**
 * コメントをスレッド化する (純粋関数)。
 * - 親が goal・不明・自分自身のものはトップレベル
 * - 循環参照は子から外す
 * - 深さは MAX_THREAD_DEPTH で頭打ち (それ以深は同階層に畳む)
 */
export function buildCommentTree(comments: CommentView[], goalId: string): ThreadNode[] {
  const byId = new Map(comments.map((c) => [c.id, c]));
  const childrenOf = new Map<string, CommentView[]>();
  const roots: CommentView[] = [];
  for (const comment of comments) {
    const parentId = comment.parentId;
    if (parentId === null || parentId === goalId || parentId === comment.id || !byId.has(parentId)) {
      roots.push(comment);
    } else {
      const siblings = childrenOf.get(parentId) ?? [];
      siblings.push(comment);
      childrenOf.set(parentId, siblings);
    }
  }
  const byTime = (a: CommentView, b: CommentView) => a.createdAt - b.createdAt;
  roots.sort(byTime);
  for (const siblings of childrenOf.values()) siblings.sort(byTime);

  const build = (comment: CommentView, depth: number, ancestors: Set<string>): ThreadNode => {
    const next = new Set(ancestors);
    next.add(comment.id);
    const children: ThreadNode[] = [];
    for (const child of childrenOf.get(comment.id) ?? []) {
      if (next.has(child.id)) continue;
      children.push(build(child, Math.min(depth + 1, MAX_THREAD_DEPTH), next));
    }
    return { comment, depth, children };
  };
  return roots.map((root) => build(root, 1, new Set()));
}

/** コメント投稿 (トップレベル or 返信)。署名ログイン必須 */
export async function postComment(args: {
  relayUrl: string;
  root: CommentTarget;
  parent?: CommentTarget;
  content: string;
}): Promise<CommentView> {
  const session = getSession();
  if (session === null) {
    throw new Error("Signing required to comment");
  }
  const relayHint = args.relayUrl;
  const draft =
    args.parent === undefined
      ? buildTopLevelComment({
          authorPubkey: session.pubkey,
          root: args.root,
          relayHint,
          content: args.content,
        })
      : buildReplyComment({
          authorPubkey: session.pubkey,
          root: args.root,
          parent: args.parent,
          relayHint,
          content: args.content,
        });
  if (draft === null) throw new Error("Could not build comment");
  const signed = await signWithSession(draft);
  if (signed === null) throw new Error("Signing failed");
  const result = await publishEventMulti(
    [...new Set([args.relayUrl, DEFAULT_RELAY, ...getUserRelays().write.slice(0, 3)])],
    signed,
  );
  if (!result.accepted) throw new Error(`Relay rejected: ${result.message}`);
  const view = parseComment(signed);
  if (view === null) throw new Error("unreachable");
  return view;
}
