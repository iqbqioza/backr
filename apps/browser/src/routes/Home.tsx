import { encodeNevent } from "backr-nostr-nips";
import { formatSats, progressPercent, remainingLabel } from "backr-utils";
import { createEffect, createSignal, onMount, type JSX } from "solid-js";
import GoalCard from "../components/GoalCard";
import SafeImage from "../components/SafeImage";
import { EmptyState, ErrorState } from "../components/States";
import { DEFAULT_RELAY } from "../lib/const";
import { getUserRelays } from "../lib/auth";
import { fetchGoalCardsMulti, fetchProfiles, type GoalCardData } from "../lib/goals";
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
  const [cards, setCards] = createSignal<GoalCardData[]>([]);
  const [zapData, setZapData] = createSignal(new Map<string, ValidatedGoalZap>());
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [query, setQuery] = createSignal("");
  const [sort, setSort] = createSignal<"new" | "top" | "ending">("new");
  const [visibleCount, setVisibleCount] = createSignal(12);

  const load = () => {
    setLoading(true);
    setError(null);
    const urls = [...new Set([DEFAULT_RELAY, ...getUserRelays().read.slice(0, 3)])];
    const url = DEFAULT_RELAY;
    fetchGoalCardsMulti(urls)
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

  onMount(() => {
    load();
    if (typeof document !== "undefined") document.title = "Backr — Nostr crowdfunding";
  });

  // 本人のリレーセットが届いたら発見範囲を広げて再取得 (初回のみ)
  let relayExpanded = false;
  createEffect(() => {
    if (getUserRelays().read.length > 0 && !relayExpanded) {
      relayExpanded = true;
      load();
    }
  });

  const sections = () => pickSections(cards(), zapData());
  const zapOf = (id: string) => zapData().get(id);

  const progressOf = (card: GoalCardData): number => {
    const zap = zapOf(card.id);
    const raised = zap?.totalMsats ?? 0n;
    return card.goalMsats > 0n ? Number(raised) / Number(card.goalMsats) : 0;
  };

  const allCards = () => {
    const q = query().trim().toLowerCase();
    const filtered =
      q.length === 0
        ? [...cards()]
        : cards().filter(
            (c) =>
              c.title.toLowerCase().includes(q) ||
              c.summary.toLowerCase().includes(q) ||
              c.description.toLowerCase().includes(q),
          );
    const mode = sort();
    filtered.sort((a, b) => {
      if (mode === "top") return progressOf(b) - progressOf(a);
      if (mode === "ending") {
        if (a.closedAt === undefined) return 1;
        if (b.closedAt === undefined) return -1;
        return a.closedAt - b.closedAt;
      }
      return b.createdAt - a.createdAt;
    });
    return filtered;
  };

  const featuredNevent = () => {
    const featured = sections().featured;
    if (featured === null) return "";
    return encodeNevent({ id: featured.id, relays: featured.relays.slice(0, 3) }) ?? "";
  };

  return (
    <div>
      {error() !== null && !loading() && <ErrorState message={`Relay fetch failed: ${error()}`} onRetry={load} />}
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
                <SafeImage
                  src={featured.image}
                  alt=""
                  imgClass={`w-full object-cover md:col-span-3 ${OGP_ASPECT_CLASS}`}
                  fallback={
                    <div
                      class={`flex w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-7xl md:col-span-3 ${OGP_ASPECT_CLASS}`}
                    >
                      ⚡
                    </div>
                  }
                />
                <div class="p-6 md:col-span-2">
                  <p class="text-xs font-semibold tracking-wider text-amber-300">{HOME.heroTag}</p>
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
                    {zap?.count ?? 0} supporters /{" "}
                    {featured.closedAt === undefined
                      ? "No deadline"
                      : remainingLabel(Math.floor(Date.now() / 1000), featured.closedAt)}
                  </p>
                </div>
              </>
            );
          })()}
        </a>
      )}
      {!loading() && sections().endingSoon.length > 0 && (
        <Section title={HOME.endingSoon} >
          {sections().endingSoon.map((card) => (
            <div class="w-64 shrink-0">
              <GoalCard card={card} zap={zapOf(card.id)} />
            </div>
          ))}
        </Section>
      )}
      {!loading() && sections().fresh.length > 0 && (
        <section class="mt-10">
          <h2 class="mb-3 text-xl font-bold">{HOME.fresh}</h2>
          <div class="flex gap-4 overflow-x-auto pb-2">
            {sections().fresh.map((card) => (
              <div class="w-64 shrink-0">
                <GoalCard card={card} zap={zapOf(card.id)} />
              </div>
            ))}
          </div>
        </section>
      )}
      {!loading() && error() === null && cards().length > 0 && (
        <section class="mt-10">
          <h2 class="mb-3 text-xl font-bold">All projects ({allCards().length})</h2>
          <div class="mb-3 flex flex-wrap gap-2">
            <input
              class="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
              placeholder="Search projects"
              value={query()}
              onInput={(e) => {
                setQuery(e.currentTarget.value);
                setVisibleCount(12);
              }}
            />
            <select
              class="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
              value={sort()}
              onChange={(e) => {
                setSort(e.currentTarget.value as "new" | "top" | "ending");
              }}
            >
              <option value="new">Newest</option>
              <option value="top">Top funded</option>
              <option value="ending">Ending soon</option>
            </select>
          </div>
          {allCards().length === 0 ? (
            <p class="text-sm text-zinc-400">No projects match "{query().trim()}".</p>
          ) : (
            <>
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allCards()
                  .slice(0, visibleCount())
                  .map((card) => (
                    <GoalCard card={card} zap={zapOf(card.id)} />
                  ))}
              </div>
              {visibleCount() < allCards().length && (
                <button
                  type="button"
                  onClick={() => {
                    setVisibleCount(visibleCount() + 12);
                  }}
                  class="mt-4 w-full rounded border border-zinc-600 px-4 py-2 text-sm text-zinc-100 hover:border-zinc-300"
                >
                  Show more ({allCards().length - visibleCount()} remaining)
                </button>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
