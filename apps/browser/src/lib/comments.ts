import {
  buildReplyComment,
  buildTopLevelComment,
  isGoalComment,
  parseComment,
  type CommentTarget,
  type CommentView,
} from "backr-nostr-nips";
import { getSession, signWithSession } from "./auth";
import { fetchEvents, publishEvent } from "./relay";

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

/** コメント投稿 (トップレベル or 返信)。署名ログイン必須 */
export async function postComment(args: {
  relayUrl: string;
  root: CommentTarget;
  parent?: CommentTarget;
  content: string;
}): Promise<CommentView> {
  const session = getSession();
  if (session === null || session.method === "readonly") {
    throw new Error("コメントには署名ログインが必要です");
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
  if (draft === null) throw new Error("コメントを組み立てられません");
  const signed = await signWithSession(draft);
  if (signed === null) throw new Error("署名に失敗しました");
  const result = await publishEvent(args.relayUrl, signed);
  if (!result.accepted) throw new Error(`リレーに拒否されました: ${result.message}`);
  const view = parseComment(signed);
  if (view === null) throw new Error("unreachable");
  return view;
}
