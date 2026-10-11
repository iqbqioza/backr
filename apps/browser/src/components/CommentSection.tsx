import { createSignal, onMount } from "solid-js";
import { canSign, getSession } from "../lib/auth";
import {
  buildCommentTree,
  countDescendants,
  fetchComments,
  flattenVisible,
  postComment,
  type CommentView,
  type ThreadNode,
} from "../lib/comments";
import { requestDeletion } from "../lib/deletion";
import { fetchProfiles, type ProfileView } from "../lib/goals";
import { avatarImage, displayName } from "./SupporterList";

function CommentRow(props: {
  node: ThreadNode;
  profiles: Map<string, ProfileView>;
  collapsed: boolean;
  replying: boolean;
  working: boolean;
  confirming: boolean;
  onToggle: (id: string) => void;
  onReply: (comment: CommentView) => void;
  onRemove: (comment: CommentView) => void;
  onConfirm: (id: string | null) => void;
  isMine: (comment: CommentView) => boolean;
}) {
  const comment = () => props.node.comment;
  const replies = () => countDescendants(props.node);
  const excerpt = () => {
    const first = comment().content.split("\n")[0] ?? "";
    return first.length > 60 ? `${first.slice(0, 60)}…` : first;
  };
  return (
    <li
      class="rounded-lg border border-zinc-800 bg-zinc-900 p-3"
      style={{ "margin-left": `${(props.node.depth - 1) * 1.5}rem` }}
    >
      <div class="flex items-center gap-2">
        {props.node.children.length > 0 ? (
          <button
            type="button"
            onClick={() => props.onToggle(comment().id)}
            class="w-5 shrink-0 rounded text-center font-mono text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            title={props.collapsed ? "開く" : "折りたたむ"}
          >
            {props.collapsed ? "+" : "–"}
          </button>
        ) : (
          <span class="w-5 shrink-0 text-center font-mono text-sm text-zinc-700">•</span>
        )}
        {avatarImage(props.profiles, comment().pubkey) !== undefined ? (
          <img
            src={avatarImage(props.profiles, comment().pubkey)}
            alt=""
            class="h-6 w-6 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span class="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700" />
        )}
        <p class="truncate text-sm font-medium">{displayName(props.profiles, comment().pubkey)}</p>
        {props.node.depth > 1 && (
          <span class="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
            返信 L{props.node.depth}
          </span>
        )}
        <span class="ml-auto flex shrink-0 items-center gap-2">
          {props.node.depth < 3 && (
            <button
              type="button"
              onClick={() => props.onReply(comment())}
              class="text-xs text-zinc-400 hover:text-zinc-100"
            >
              {props.replying ? "返信中" : "返信する"}
            </button>
          )}
          {props.isMine(comment()) &&
            (props.confirming ? (
              <span class="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => props.onRemove(comment())}
                  disabled={props.working}
                  class="rounded bg-red-600 px-2 py-0.5 font-semibold text-white disabled:opacity-50"
                >
                  削除
                </button>
                <button
                  type="button"
                  onClick={() => props.onConfirm(null)}
                  class="text-zinc-400 hover:text-zinc-100"
                >
                  ×
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => props.onConfirm(comment().id)}
                class="text-xs text-red-400 hover:text-red-300"
              >
                削除
              </button>
            ))}
        </span>
      </div>
      {props.collapsed ? (
        <p class="mt-1 truncate text-sm text-zinc-500">
          {excerpt()}
          {replies() > 0 && <span class="ml-2 text-xs">({replies()}件の返信)</span>}
        </p>
      ) : (
        <p class="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-200">{comment().content}</p>
      )}
    </li>
  );
}

export default function CommentSection(props: {
  relayUrl: string;
  goalId: string;
  goalAuthor: string;
}) {
  const [comments, setComments] = createSignal<CommentView[]>([]);
  const [profiles, setProfiles] = createSignal(new Map<string, ProfileView>());
  const [loading, setLoading] = createSignal(true);
  const [body, setBody] = createSignal("");
  const [replyTo, setReplyTo] = createSignal<CommentView | null>(null);
  const [posting, setPosting] = createSignal(false);
  const [confirming, setConfirming] = createSignal<string | null>(null);
  const [collapsed, setCollapsed] = createSignal(new Set<string>());
  const [working, setWorking] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const toggle = (id: string) => {
    const next = new Set(collapsed());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsed(next);
  };

  const load = () => {
    setLoading(true);
    fetchComments(props.relayUrl, props.goalId)
      .then((fetched) => {
        setComments(fetched);
        return fetchProfiles(
          props.relayUrl,
          fetched.map((c) => c.pubkey),
        );
      })
      .then(setProfiles)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => {
        setLoading(false);
      });
  };
  onMount(load);

  const onPost = (parent: CommentView | null) => {
    if (posting() || body().trim().length === 0) return;
    setPosting(true);
    setError(null);
    postComment({
      relayUrl: props.relayUrl,
      root: { id: props.goalId, pubkey: props.goalAuthor, kind: 9041 },
      parent:
        parent === null ? undefined : { id: parent.id, pubkey: parent.pubkey, kind: 1111 },
      content: body(),
    })
      .then((view) => {
        setComments([...comments(), view].sort((a, b) => a.createdAt - b.createdAt));
        setBody("");
        setReplyTo(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "投稿に失敗しました");
      })
      .finally(() => {
        setPosting(false);
      });
  };

  const isMine = (comment: CommentView) => {
    const session = getSession();
    return session !== null && session.method !== "readonly" && session.pubkey === comment.pubkey;
  };

  const remove = (comment: CommentView) => {
    if (working()) return;
    setWorking(true);
    setError(null);
    requestDeletion(props.relayUrl, [comment.id], "comment deleted by author")
      .then(() => {
        setComments(comments().filter((c) => c.id !== comment.id));
        setConfirming(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "削除に失敗しました");
      })
      .finally(() => {
        setWorking(false);
      });
  };

function ReplyForm(props: {
  body: string;
  posting: boolean;
  submitLabel: string;
  placeholder: string;
  indentRem: number;
  onBody: (value: string) => void;
  onSubmit: () => void;
  onCancel: (() => void) | null;
}) {
  return (
    <div
      class="rounded-lg border border-zinc-800 bg-zinc-900 p-3"
      style={{ "margin-left": `${props.indentRem}rem` }}
    >
      <div class="flex gap-2">
        <input
          class="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm"
          placeholder={props.placeholder}
          value={props.body}
          onInput={(e) => {
            props.onBody(e.currentTarget.value);
          }}
        />
        <button
          type="button"
          onClick={props.onSubmit}
          disabled={props.posting}
          class="shrink-0 rounded bg-amber-400 px-3 py-1.5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
        >
          {props.posting ? "投稿中…" : props.submitLabel}
        </button>
        {props.onCancel !== null && (
          <button
            type="button"
            onClick={props.onCancel}
            class="shrink-0 rounded border border-zinc-700 px-3 py-1.5 text-sm"
          >
            やめる
          </button>
        )}
      </div>
    </div>
  );
}

  const tree = () => buildCommentTree(comments(), props.goalId);
  const rows = () => flattenVisible(tree(), collapsed());

  return (
    <section>
      <h2 class="mb-2 text-xl font-semibold">コメント ({comments().length})</h2>
      {loading() && <p class="text-zinc-400">読み込み中…</p>}
      <ul class="grid gap-2 border-l-2 border-zinc-800 pl-2">
        {rows().map((node) => (
          <>
            <CommentRow
              node={node}
              profiles={profiles()}
              collapsed={collapsed().has(node.comment.id)}
              replying={replyTo()?.id === node.comment.id}
              working={working()}
              confirming={confirming() === node.comment.id}
              onToggle={toggle}
              onReply={setReplyTo}
              onRemove={remove}
              onConfirm={setConfirming}
              isMine={isMine}
            />
            {replyTo()?.id === node.comment.id && canSign() && (
              <li class="list-none">
                <ReplyForm
                  body={body()}
                  posting={posting()}
                  submitLabel="返信する"
                  placeholder={`${displayName(profiles(), node.comment.pubkey)} への返信`}
                  indentRem={node.depth * 1.5}
                  onBody={setBody}
                  onSubmit={() => onPost(node.comment)}
                  onCancel={() => {
                    setReplyTo(null);
                  }}
                />
              </li>
            )}
          </>
        ))}
      </ul>
      <div class="mt-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        {canSign() ? (
          <ReplyForm
            body={body()}
            posting={posting()}
            submitLabel="投稿"
            placeholder="コメントを書く (プレーンテキスト)"
            indentRem={0}
            onBody={(value) => {
              setReplyTo(null);
              setBody(value);
            }}
            onSubmit={() => onPost(null)}
            onCancel={null}
          />
        ) : (
          <p class="text-sm text-zinc-400">コメントには署名ログインが必要です。</p>
        )}
      </div>
      {error() !== null && <p class="mt-2 text-sm text-red-400">{error()}</p>}
    </section>
  );
}
