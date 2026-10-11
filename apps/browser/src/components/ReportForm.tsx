import { createSignal } from "solid-js";
import { canSign } from "../lib/auth";
import type { ReportData } from "../lib/goals";
import { postReport } from "../lib/reports";

export default function ReportForm(props: {
  relayUrl: string;
  goalId: string;
  onPosted: (report: ReportData) => void;
}) {
  const [title, setTitle] = createSignal("");
  const [body, setBody] = createSignal("");
  const [posting, setPosting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const onSubmit = () => {
    if (posting() || title().trim().length === 0 || body().trim().length === 0) return;
    setPosting(true);
    setError(null);
    postReport({ relayUrl: props.relayUrl, goalId: props.goalId, title: title().trim(), content: body() })
      .then((report) => {
        props.onPosted(report);
        setTitle("");
        setBody("");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "投稿に失敗しました");
      })
      .finally(() => {
        setPosting(false);
      });
  };

  if (!canSign()) {
    return <p class="text-sm text-zinc-400">報告の投稿には署名ログインが必要です。</p>;
  }

  return (
    <div class="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <h3 class="mb-2 font-medium">活動報告を書く</h3>
      <input
        class="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm"
        placeholder="タイトル"
        value={title()}
        onInput={(e) => {
          setTitle(e.currentTarget.value);
        }}
      />
      <textarea
        class="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm"
        rows={4}
        placeholder="進捗・お知らせ (Markdown)"
        value={body()}
        onInput={(e) => {
          setBody(e.currentTarget.value);
        }}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={posting()}
        class="mt-2 rounded bg-amber-400 px-3 py-1.5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
      >
        {posting() ? "公開中…" : "報告を公開する"}
      </button>
      {error() !== null && <p class="mt-2 text-sm text-red-400">{error()}</p>}
    </div>
  );
}
