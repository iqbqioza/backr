import { createSignal, onMount } from "solid-js";
import GoalCard from "../components/GoalCard";
import RelayBar from "../components/RelayBar";
import { EmptyState, ErrorState, Loading } from "../components/States";
import { DEFAULT_RELAY } from "../lib/const";
import {
  fetchGoalCards,
  fetchProfiles,
  sortGoalCards,
  type GoalCardData,
  type SortMode,
} from "../lib/goals";
import { fetchCardZapData, type ValidatedGoalZap } from "../lib/supporters";

const TABS: { id: SortMode; label: string }[] = [
  { id: "new", label: "新着" },
  { id: "progress", label: "達成率順" },
  { id: "deadline", label: "締切順" },
];

export default function Home() {
  const [relay, setRelay] = createSignal(DEFAULT_RELAY);
  const [cards, setCards] = createSignal<GoalCardData[]>([]);
  const [zapData, setZapData] = createSignal(new Map<string, ValidatedGoalZap>());
  const [mode, setMode] = createSignal<SortMode>("new");
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const url = relay();
    fetchGoalCards(url)
      .then((fetched) => {
        setCards(fetched);
        return fetchProfiles(url, fetched.map((c) => c.pubkey));
      })
      .then((profiles) => fetchCardZapData(url, cards(), profiles))
      .then(setZapData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  onMount(load);

  const totals = () =>
    new Map([...zapData()].map(([id, data]) => [id, data.totalMsats] as const));
  const sorted = () => sortGoalCards(cards(), totals(), mode());

  return (
    <div>
      <h1 class="mb-4 text-2xl font-bold">プロジェクトを探す</h1>
      <RelayBar relay={relay()} onChange={setRelay} />
      <div class="mb-4 flex gap-2">
        {TABS.map((tab) => (
          <button
            type="button"
            onClick={() => {
              setMode(tab.id);
            }}
            class={`rounded-full border px-4 py-1 text-sm ${
              mode() === tab.id
                ? "border-amber-400 text-amber-300"
                : "border-zinc-700 text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          onClick={load}
          class="ml-auto rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-400 hover:text-zinc-100"
        >
          更新
        </button>
      </div>
      {loading() && <Loading />}
      {error() !== null && !loading() && <ErrorState message={`リレー取得失敗: ${error()}`} onRetry={load} />}
      {!loading() && error() === null && sorted().length === 0 && (
        <EmptyState message="まだプロジェクトがありません。「作る」から最初の案件を公開しましょう。" />
      )}
      <div class="grid gap-4 md:grid-cols-2">
        {sorted().map((card) => (
          <GoalCard card={card} raisedMsats={zapData().get(card.id)?.totalMsats ?? 0n} />
        ))}
      </div>
    </div>
  );
}
