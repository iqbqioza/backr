import { createSignal } from "solid-js";
import { OGP_ASPECT_CLASS } from "../components/thumb";
import { getSession } from "../lib/auth";
import { requestDeletion } from "../lib/deletion";
import type { ReportData } from "../lib/goals";
import { mergeReports, updateReport } from "../lib/reports";

export default function ReportList(props: {
  reports: ReportData[];
  relayUrl: string;
  goalId: string;
  onChange: (next: ReportData[]) => void;
}) {
  const [expanded, setExpanded] = createSignal<string | null>(null);
  const [editing, setEditing] = createSignal<string | null>(null);
  const [editTitle, setEditTitle] = createSignal("");
  const [editBody, setEditBody] = createSignal("");
  const [confirming, setConfirming] = createSignal<string | null>(null);
  const [working, setWorking] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const toggle = (id: string) => {
    setExpanded(expanded() === id ? null : id);
  };

  const isMine = (report: ReportData) => {
    const session = getSession();
    return session !== null && session.method !== "readonly" && session.pubkey === report.author;
  };

  const startEdit = (report: ReportData) => {
    setEditing(report.id);
    setEditTitle(report.title);
    setEditBody(report.content);
    setError(null);
  };

  const saveEdit = (report: ReportData) => {
    if (working() || editTitle().trim().length === 0 || editBody().trim().length === 0) return;
    setWorking(true);
    setError(null);
    updateReport({
      relayUrl: props.relayUrl,
      goalId: props.goalId,
      identifier: report.identifier,
      title: editTitle().trim(),
      content: editBody(),
    })
      .then((updated) => {
        props.onChange(mergeReports(props.reports, [updated]));
        setEditing(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "更新に失敗しました");
      })
      .finally(() => {
        setWorking(false);
      });
  };

  const remove = (report: ReportData) => {
    if (working()) return;
    setWorking(true);
    setError(null);
    requestDeletion(props.relayUrl, [report.id], "report deleted by author")
      .then(() => {
        props.onChange(props.reports.filter((r) => r.id !== report.id));
        setConfirming(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "削除に失敗しました");
      })
      .finally(() => {
        setWorking(false);
      });
  };

  const input = "w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm";

  return (
    <section>
      <h2 class="mb-2 text-xl font-semibold">活動報告 ({props.reports.length})</h2>
      {props.reports.length === 0 ? (
        <p class="text-zinc-400">まだ報告がありません。</p>
      ) : (
        <ul class="grid gap-2">
          {props.reports.map((report) => (
            <li class="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <button type="button" onClick={() => toggle(report.id)} class="w-full text-left">
                <p class="font-medium hover:text-amber-200">{report.title}</p>
                <p class="mt-1 font-mono text-xs text-zinc-500">
                  {new Date(report.createdAt * 1000).toLocaleDateString("ja-JP")}
                  {expanded() === report.id ? " ▲" : " ▼"}
                </p>
              </button>
              {expanded() === report.id && (
                <div class="mt-2 border-t border-zinc-800 pt-2">
                  {report.image !== undefined && (
                    <img
                      src={report.image}
                      alt=""
                      class={`mb-2 w-full rounded object-cover ${OGP_ASPECT_CLASS}`}
                    />
                  )}
                  {editing() === report.id ? (
                    <div class="grid gap-2">
                      <input
                        class={input}
                        value={editTitle()}
                        onInput={(e) => {
                          setEditTitle(e.currentTarget.value);
                        }}
                      />
                      <textarea
                        class={input}
                        rows={4}
                        value={editBody()}
                        onInput={(e) => {
                          setEditBody(e.currentTarget.value);
                        }}
                      />
                      <div class="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(report)}
                          disabled={working()}
                          class="rounded bg-amber-400 px-3 py-1 text-sm font-semibold text-zinc-950 disabled:opacity-50"
                        >
                          {working() ? "保存中…" : "保存する"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(null);
                          }}
                          class="rounded border border-zinc-700 px-3 py-1 text-sm"
                        >
                          やめる
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p class="whitespace-pre-wrap break-words text-sm text-zinc-200">{report.content}</p>
                  )}
                  {isMine(report) && editing() !== report.id && (
                    <div class="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(report)}
                        class="text-xs text-zinc-400 hover:text-zinc-100"
                      >
                        編集する
                      </button>
                      {confirming() === report.id ? (
                        <span class="flex items-center gap-2 text-xs">
                          <span class="text-zinc-300">削除しますか?</span>
                          <button
                            type="button"
                            onClick={() => remove(report)}
                            disabled={working()}
                            class="rounded bg-red-600 px-2 py-0.5 font-semibold text-white disabled:opacity-50"
                          >
                            削除を実行
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirming(null);
                            }}
                            class="text-zinc-400 hover:text-zinc-100"
                          >
                            やめる
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirming(report.id);
                          }}
                          class="text-xs text-red-400 hover:text-red-300"
                        >
                          削除する
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {error() !== null && <p class="mt-2 text-sm text-red-400">{error()}</p>}
    </section>
  );
}
