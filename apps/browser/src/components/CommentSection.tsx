import { createSignal, onMount } from "solid-js";
import { canSign, getSession } from "../lib/auth";
import { fetchComments, postComment, type CommentView } from "../lib/comments";
import { requestDeletion } from "../lib/deletion";
import { fetchProfiles, type ProfileView } from "../lib/goals";
import { avatarImage, displayName } from "./SupporterList";

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
  const [working, setWorking] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

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

  const onPost = () => {
    if (posting() || body().trim().length === 0) return;
    setPosting(true);
    setError(null);
    const parent = replyTo();
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

  const isReply = (comment: CommentView) =>
    comment.parentId !== null && comment.parentId !== props.goalId;

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

  return (
    <section>
      <h2 class="mb-2 text-xl font-semibold">コメント ({comments().length})</h2>
      {loading() && <p class="text-zinc-400">読み込み中…</p>}
      <ul class="grid gap-2">
        {comments().map((comment) => (
          <li class="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            {avatarImage(profiles(), comment.pubkey) !== undefined ? (
              <img
                src={avatarImage(profiles(), comment.pubkey)}
                alt=""
                class="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span class="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700" />
            )}
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-medium">{displayName(profiles(), comment.pubkey)}</p>
                {isReply(comment) && (
                  <span class="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">返信</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(comment);
                  }}
                  class="ml-auto shrink-0 text-xs text-zinc-400 hover:text-zinc-100"
                >
                  返信する
                </button>
                {isMine(comment) &&
                  (confirming() === comment.id ? (
                    <span class="flex shrink-0 items-center gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => remove(comment)}
                        disabled={working()}
                        class="rounded bg-red-600 px-2 py-0.5 font-semibold text-white disabled:opacity-50"
                      >
                        削除
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirming(null);
                        }}
                        class="text-zinc-400 hover:text-zinc-100"
                      >
                        ×
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirming(comment.id);
                      }}
                      class="shrink-0 text-xs text-red-400 hover:text-red-300"
                    >
                      削除
                    </button>
                  ))}
              </div>
              <p class="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-200">{comment.content}</p>
            </div>
          </li>
        ))}
      </ul>
      <div class="mt-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        {replyTo() !== null && (
          <p class="mb-2 text-xs text-zinc-400">
            {displayName(profiles(), replyTo()?.pubkey ?? "")} への返信
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
              }}
              class="ml-2 underline"
            >
              やめる
            </button>
          </p>
        )}
        {canSign() ? (
          <div class="flex gap-2">
            <input
              class="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm"
              placeholder="コメントを書く (プレーンテキスト)"
              value={body()}
              onInput={(e) => {
                setBody(e.currentTarget.value);
              }}
            />
            <button
              type="button"
              onClick={onPost}
              disabled={posting()}
              class="shrink-0 rounded bg-amber-400 px-3 py-1.5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
            >
              {posting() ? "投稿中…" : "投稿"}
            </button>
          </div>
        ) : (
          <p class="text-sm text-zinc-400">コメントには署名ログインが必要です。</p>
        )}
      </div>
      {error() !== null && <p class="mt-2 text-sm text-red-400">{error()}</p>}
    </section>
  );
}
