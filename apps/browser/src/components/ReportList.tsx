import { createSignal } from "solid-js";
import type { ReportData } from "../lib/goals";

export default function ReportList(props: { reports: ReportData[] }) {
  const [expanded, setExpanded] = createSignal<string | null>(null);

  const toggle = (id: string) => {
    setExpanded(expanded() === id ? null : id);
  };

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
                    <img src={report.image} alt="" class="mb-2 h-40 w-full rounded object-cover" />
                  )}
                  <p class="whitespace-pre-wrap break-words text-sm text-zinc-200">{report.content}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
