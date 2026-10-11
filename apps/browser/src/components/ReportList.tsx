import type { ReportData } from "../lib/goals";

export default function ReportList(props: { reports: ReportData[] }) {
  return (
    <section>
      <h2 class="mb-2 text-xl font-semibold">活動報告 ({props.reports.length})</h2>
      {props.reports.length === 0 ? (
        <p class="text-zinc-400">まだ報告がありません。</p>
      ) : (
        <ul class="grid gap-2">
          {props.reports.map((report) => (
            <li class="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <p class="font-medium">{report.title}</p>
              <p class="mt-1 font-mono text-xs text-zinc-500">
                {new Date(report.createdAt * 1000).toLocaleDateString("ja-JP")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
