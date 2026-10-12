import { createSignal, onMount } from "solid-js";
import { canSign, getSession } from "../lib/auth";
import {
  buildCommentTree,
  countDescendants,
  fetchCommentsMulti,
  flattenVisible,
  postComment,
  type CommentView,
  type ThreadNode,
} from "../lib/comments";
import { requestDeletion } from "../lib/deletion";
import { fetchProfiles, type ProfileView } from "../lib/goals";
import { avatarImage, displayName } from "./people";
import SafeImage from "./SafeImage";

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
            class="h-6 w-6 shrink-0 rounded text-center font-mono text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            title={props.collapsed ? "Open" : "Collapse"}
          >
            {props.collapsed ? "+" : "–"}
          </button>
        ) : (
          <span class="h-6 w-6 shrink-0 text-center font-mono text-sm text-zinc-700">•</span>
        )}
        <SafeImage
          src={avatarImage(props.profiles, comment().pubkey)}
          alt=""
          imgClass="h-6 w-6 shrink-0 rounded-full object-cover"
          fallback={
            <span class="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700" />
          }
        />
        <p class="truncate text-sm font-medium">{displayName(props.profiles, comment().pubkey)}</p>
        {props.node.depth > 1 && (
          <span class="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
            Reply L{props.node.depth}
          </span>
        )}
        <span class="ml-auto flex shrink-0 items-center gap-2">
          {props.node.depth < 3 && (
            <button
              type="button"
              onClick={() => props.onReply(comment())}
              class="text-xs text-zinc-400 hover:text-zinc-100"
            >
              {props.replying ? "Replying…" : "Reply"}
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
                  Delete
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
                Delete
              </button>
            ))}
        </span>
      </div>
      {props.collapsed ? (
        <p class="mt-1 truncate text-sm text-zinc-500">
          {excerpt()}
          {replies() > 0 && <span class="ml-2 text-xs">({replies()} replies)</span>}
        </p>
      ) : (
        <p class="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-200">{comment().content}</p>
      )}
    </li>
  );
}

export default function CommentSection(props: {
  relayUrl: string;
  relays?: string[];
  goalId: string;
  goalAuthor: string;
  onCount?: (count: number) => void;
  onComments?: (comments: CommentView[]) => void;
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
    fetchCommentsMulti(props.relays ?? [props.relayUrl], props.goalId)
      .then((fetched) => {
        setComments(fetched);
        props.onCount?.(fetched.length);
        props.onComments?.(fetched);
        return fetchProfiles(
          props.relayUrl,
          fetched.map((c) => c.pubkey),
        );
      })
      .then(setProfiles)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to fetch");
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
        const next = [...comments(), view].sort((a, b) => a.createdAt - b.createdAt);
        setComments(next);
        props.onCount?.(next.length);
        props.onComments?.(next);
        setBody("");
        setReplyTo(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to post");
      })
      .finally(() => {
        setPosting(false);
      });
  };

  const isMine = (comment: CommentView) => {
    const session = getSession();
    return session !== null && session.pubkey === comment.pubkey;
  };

  const remove = (comment: CommentView) => {
    if (working()) return;
    setWorking(true);
    setError(null);
    requestDeletion(props.relayUrl, [comment.id], "comment deleted by author")
      .then(() => {
        const next = comments().filter((c) => c.id !== comment.id);
        setComments(next);
        props.onCount?.(next.length);
        props.onComments?.(next);
        setConfirming(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to delete");
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
          class="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
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
          {props.posting ? "Posting…" : props.submitLabel}
        </button>
        {props.onCancel !== null && (
          <button
            type="button"
            onClick={props.onCancel}
            class="shrink-0 rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-100"
          >
            Cancel
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
      {!loading() && comments().length === 0 && (
        <p class="mb-2 text-sm text-zinc-400">No comments yet. Be the first!</p>
      )}
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
                  submitLabel="Reply"
                  placeholder={`Replying to ${displayName(profiles(), node.comment.pubkey)}`}
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
      {canSign() ? (
        <div class="mt-3">
          <ReplyForm
            body={body()}
            posting={posting()}
            submitLabel="Post"
            placeholder="Write a comment (plain text)"
            indentRem={0}
            onBody={(value) => {
              setReplyTo(null);
              setBody(value);
            }}
            onSubmit={() => onPost(null)}
            onCancel={null}
          />
        </div>
      ) : (
        <p class="mt-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">
          Please log in to post a comment.
        </p>
      )}
      {error() !== null && <p class="mt-2 text-sm text-red-400">{error()}</p>}
    </section>
  );
}
