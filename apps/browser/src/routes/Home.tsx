import { encodeNevent } from "backr-nostr-nips";
import { formatSats, progressPercent, remainingLabel } from "backr-utils";
import { createSignal, onMount, type JSX } from "solid-js";
import GoalCard from "../components/GoalCard";
import RelayBar from "../components/RelayBar";
import { EmptyState, ErrorState, Loading } from "../components/States";
import { DEFAULT_RELAY } from "../lib/const";
import { fetchGoalCards, fetchProfiles, type GoalCardData } from "../lib/goals";
import { pickSections } from "../lib/sections";
import { fetchCardZapData, type ValidatedGoalZap } from "../lib/supporters";
import ProgressMeter from "../components/ProgressMeter";
import { OGP_ASPECT_CLASS } from "../components/thumb";
import { HOME, STATES } from "../lib/copy";

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <section class="mt-10">
      <h2 class="mb-3 text-xl font-bold">{props.title}</h2>
      <div class="flex gap-4 overflow-x-auto pb-2">{props.children}</div>
    </section>
  );
}

export default function Home() {
  const [relay, setRelay] = createSignal(DEFAULT_RELAY);
  const [cards, setCards] = createSignal<GoalCardData[]>([]);
  const [zapData, setZapData] = createSignal(new Map<string, ValidatedGoalZap>());
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
        setError(err instanceof Error ? err.message : STATES.fetchFailed);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  onMount(load);

  const sections = () => pickSections(cards(), zapData());
  const zapOf = (id: string) => zapData().get(id);

  const featuredNevent = () => {
    const featured = sections().featured;
    if (featured === null) return "";
    return encodeNevent({ id: featured.id, relays: featured.relays.slice(0, 3) }) ?? "";
  };

  return (
    <div>
      <RelayBar relay={relay()} onChange={setRelay} />
      {loading() && <Loading />}
      {error() !== null && !loading() && <ErrorState message={`リレー取得失敗: ${error()}`} onRetry={load} />}
      {!loading() && error() === null && cards().length === 0 && (
        <EmptyState message='No projects yet. Publish the first one from "Start a project".' />
      )}
      {!loading() && sections().featured !== null && (
        <a
          href={`/g/${featuredNevent()}`}
          class="grid overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 md:grid-cols-5"
        >
          {(() => {
            const featured = sections().featured;
            if (featured === null) return null;
            const zap = zapOf(featured.id);
            const raised = zap?.totalMsats ?? 0n;
            return (
              <>
                {featured.image !== undefined ? (
                  <img
                    src={featured.image}
                    alt=""
                    class={`w-full object-cover md:col-span-3 ${OGP_ASPECT_CLASS}`}
                  />
                ) : (
                  <div
                    class={`flex w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-7xl md:col-span-3 ${OGP_ASPECT_CLASS}`}
                  >
                    ⚡
                  </div>
                )}
                <div class="p-6 md:col-span-2">
                  <p class="text-xs font-semibold tracking-wider text-amber-300">注目のプロジェクト</p>
                  <h1 class="mt-2 text-2xl font-bold leading-tight">{featured.title}</h1>
                  {featured.summary.length > 0 && (
                    <p class="mt-2 line-clamp-3 text-sm text-zinc-400">{featured.summary}</p>
                  )}
                  <p class="mt-4 text-4xl font-bold text-amber-300">
                    {progressPercent(raised, featured.goalMsats)}%
                  </p>
                  <div class="mt-2">
                    <ProgressMeter raisedMsats={raised} goalMsats={featured.goalMsats} compact />
                  </div>
                  <p class="mt-2 text-lg font-semibold">{formatSats(raised)}</p>
                  <p class="mt-1 text-sm text-zinc-400">
                    {zap?.count ?? 0}人が支援 /{" "}
                    {featured.closedAt === undefined
                      ? "期限なし"
                      : remainingLabel(Math.floor(Date.now() / 1000), featured.closedAt)}
                  </p>
                </div>
              </>
            );
          })()}
        </a>
      )}
      {!loading() && sections().recommended.length > 0 && (
        <Section title={HOME.recommended} >
          {sections().recommended.map((card) => (
            <GoalCard card={card} zap={zapOf(card.id)} />
          ))}
        </Section>
      )}
      {!loading() && sections().endingSoon.length > 0 && (
        <Section title={HOME.endingSoon} >
          {sections().endingSoon.map((card) => (
            <GoalCard card={card} zap={zapOf(card.id)} />
          ))}
        </Section>
      )}
      {!loading() && sections().fresh.length > 0 && (
        <section class="mt-10">
          <h2 class="mb-3 text-xl font-bold">{HOME.fresh}</h2>
          <div class="flex gap-4 overflow-x-auto pb-2">
            {sections().fresh.map((card) => (
              <GoalCard card={card} zap={zapOf(card.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
