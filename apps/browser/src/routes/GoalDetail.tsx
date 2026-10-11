import { useParams } from "@solidjs/router";
import { decodeNevent } from "backr-nostr-nips";
import { createSignal, onMount } from "solid-js";
import ProgressMeter from "../components/ProgressMeter";
import { DEFAULT_RELAY } from "../lib/const";
import {
  fetchGoalById,
  fetchGoalTally,
  fetchReports,
  type GoalCardData,
  type ReportData,
} from "../lib/goals";

export default function GoalDetail() {
  const params = useParams();
  const [card, setCard] = createSignal<GoalCardData | null>(null);
  const [raised, setRaised] = createSignal(0n);
  const [supporters, setSupporters] = createSignal(0);
  const [reports, setReports] = createSignal<ReportData[]>([]);
  const [error, setError] = createSignal<string | null>(null);

  onMount(() => {
    const decoded = decodeNevent(params["nevent"] ?? "");
    if (decoded === null) {
      setError("不正なプロジェクト ID です");
      return;
    }
    const goalId = decoded.id;
    const relay = decoded.relays[0] ?? DEFAULT_RELAY;
    fetchGoalById(relay, goalId)
      .then((found) => {
        if (found === null) {
          setError("プロジェクトが見つかりません");
          return;
        }
        setCard(found);
        return Promise.all([
          fetchGoalTally(relay, goalId, found.closedAt),
          fetchReports(relay, goalId),
        ]).then(([tally, fetchedReports]) => {
          setRaised(tally.totalMsats);
          setSupporters(tally.count);
          setReports(fetchedReports);
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      });
  });

  return (
    <div>
      {error() !== null && <p class="text-red-400">{error()}</p>}
      {card() !== null && (
        <article>
          {card()?.image !== undefined && (
            <img src={card()?.image} alt="" class="mb-4 h-56 w-full rounded-lg object-cover" />
          )}
          <h1 class="text-2xl font-bold">{card()?.title}</h1>
          <p class="mt-2 whitespace-pre-wrap text-zinc-300">{card()?.description}</p>
          <div class="mt-4">
            <ProgressMeter raisedMsats={raised()} goalMsats={card()?.goalMsats ?? 0n} />
            <p class="mt-1 text-sm text-zinc-400">支援 {supporters()} 件 (All-in・返金なし)</p>
          </div>
          <button
            type="button"
            disabled
            class="mt-4 rounded bg-amber-400 px-4 py-2 font-semibold text-zinc-950 opacity-50"
            title="Zap 支援は次のステップで対応"
          >
            Zapで支援 (近日対応)
          </button>
          <section class="mt-8">
            <h2 class="mb-2 text-xl font-semibold">活動報告</h2>
            {reports().length === 0 ? (
              <p class="text-zinc-400">まだ報告がありません。</p>
            ) : (
              <ul class="list-disc pl-5">
                {reports().map((report) => (
                  <li>{report.title}</li>
                ))}
              </ul>
            )}
          </section>
        </article>
      )}
    </div>
  );
}
