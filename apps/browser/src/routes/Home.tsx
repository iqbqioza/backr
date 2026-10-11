import { createSignal, onMount } from "solid-js";
import GoalCard from "../components/GoalCard";
import { DEFAULT_RELAY } from "../lib/const";
import { fetchGoalCards, type GoalCardData } from "../lib/goals";

export default function Home() {
  const [cards, setCards] = createSignal<GoalCardData[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(() => {
    fetchGoalCards(DEFAULT_RELAY)
      .then(setCards)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => {
        setLoading(false);
      });
  });

  return (
    <div>
      <h1 class="mb-4 text-2xl font-bold">プロジェクトを探す</h1>
      {loading() && <p class="text-zinc-400">読み込み中…</p>}
      {error() !== null && <p class="text-red-400">リレー取得失敗: {error()}</p>}
      {!loading() && error() === null && cards().length === 0 && (
        <p class="text-zinc-400">まだプロジェクトがありません。</p>
      )}
      <div class="grid gap-4 md:grid-cols-2">
        {cards().map((card) => (
          <GoalCard card={card} />
        ))}
      </div>
    </div>
  );
}
