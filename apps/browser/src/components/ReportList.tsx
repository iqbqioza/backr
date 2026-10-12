import { createSignal } from "solid-js";
import { encodeNaddr } from "backr-nostr-nips";
import { OGP_ASPECT_CLASS } from "../components/thumb";
import Markdown from "../components/Markdown";
import SafeImage from "../components/SafeImage";
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
  const [editSummary, setEditSummary] = createSignal("");
  const [editImage, setEditImage] = createSignal("");
  const [editBody, setEditBody] = createSignal("");
  const [confirming, setConfirming] = createSignal<string | null>(null);
  const [working, setWorking] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [shared, setShared] = createSignal<string | null>(null);

  const share = (report: ReportData) => {
    const naddr = encodeNaddr({
      identifier: report.identifier,
      author: report.author,
      kind: 30023,
      relays: [props.relayUrl],
    });
    if (naddr === null || typeof navigator === "undefined" || navigator.clipboard === undefined) {
      setError("Could not copy");
      return;
    }
    navigator.clipboard
      .writeText(`nostr:${naddr}`)
      .then(() => {
        setShared(report.id);
      })
      .catch(() => {
        setError("Could not copy");
      });
  };

  const toggle = (id: string) => {
    setExpanded(expanded() === id ? null : id);
  };

  const isMine = (report: ReportData) => {
    const session = getSession();
    return session !== null && session.pubkey === report.author;
  };

  const startEdit = (report: ReportData) => {
    setEditing(report.id);
    setEditTitle(report.title);
    setEditSummary(report.summary ?? "");
    setEditImage(report.image ?? "");
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
      summary: editSummary().trim().length > 0 ? editSummary().trim() : undefined,
      image: editImage().trim().length > 0 ? editImage().trim() : undefined,
      content: editBody(),
    })
      .then((updated) => {
        props.onChange(mergeReports(props.reports, [updated]));
        setEditing(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to update");
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
        setError(err instanceof Error ? err.message : "Failed to delete");
      })
      .finally(() => {
        setWorking(false);
      });
  };

  const input = "w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none";

  return (
    <section>
      <h2 class="mb-2 text-xl font-semibold">Updates ({props.reports.length})</h2>
      {props.reports.length === 0 ? (
        <p class="text-zinc-400">No updates yet.</p>
      ) : (
        <ul class="grid gap-2">
          {props.reports.map((report) => (
            <li class="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <button type="button" onClick={() => toggle(report.id)} class="w-full text-left">
                <p class="font-medium hover:text-amber-200">{report.title}</p>
                <p class="mt-1 font-mono text-xs text-zinc-500">
                  {new Date(report.createdAt * 1000).toLocaleDateString("en-US")}
                  {expanded() === report.id ? " ▲" : " ▼"}
                </p>
              </button>
              {expanded() === report.id && (
                <div class="mt-2 border-t border-zinc-800 pt-2">
                  {report.image !== undefined && (
                    <SafeImage
                      src={report.image}
                      alt=""
                      imgClass={`mb-2 w-full rounded object-cover ${OGP_ASPECT_CLASS}`}
                      fallback={<div class={`mb-2 hidden w-full ${OGP_ASPECT_CLASS}`} />}
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
                      <input
                        class={input}
                        placeholder="Summary (optional)"
                        value={editSummary()}
                        onInput={(e) => {
                          setEditSummary(e.currentTarget.value);
                        }}
                      />
                      <input
                        class={input}
                        placeholder="Image URL (optional)"
                        value={editImage()}
                        onInput={(e) => {
                          setEditImage(e.currentTarget.value);
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
                          {working() ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(null);
                          }}
                          class="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Markdown
                      class="min-w-0 break-words text-sm text-zinc-200 [&_a]:text-amber-300 [&_h1]:font-bold [&_h1]:text-base [&_img]:h-auto [&_img]:max-w-full [&_img]:my-2 [&_img]:rounded [&_li]:ml-5 [&_li]:list-disc [&_p]:my-2 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-zinc-950 [&_pre]:p-2 [&_table]:block [&_table]:overflow-x-auto [&_ul]:grid [&_ul]:gap-1"
                      source={report.content}
                    />
                  )}
                  {editing() !== report.id && (
                    <div class="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => share(report)}
                        class="text-xs text-zinc-400 hover:text-zinc-100"
                      >
                        {shared() === report.id ? "Copied" : "Share"}
                      </button>
                      {isMine(report) && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(report)}
                            class="text-xs text-zinc-400 hover:text-zinc-100"
                          >
                            Edit
                          </button>
                          {confirming() === report.id ? (
                          <span class="flex items-center gap-2 text-xs">
                            <span class="text-zinc-300">Delete this update?</span>
                            <button
                              type="button"
                              onClick={() => remove(report)}
                              disabled={working()}
                              class="rounded bg-red-600 px-2 py-0.5 font-semibold text-white disabled:opacity-50"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirming(null);
                              }}
                              class="text-zinc-400 hover:text-zinc-100"
                            >
                              Cancel
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
                            Delete
                          </button>
                      )}
                        </>
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
