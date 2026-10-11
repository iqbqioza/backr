import { useParams } from "@solidjs/router";
import { decodeNevent } from "backr-nostr-nips";
import { formatSats, progressPercent, remainingLabel } from "backr-utils";
import { createSignal, onMount } from "solid-js";
import CreatorCard from "../components/CreatorCard";
import ProgressMeter from "../components/ProgressMeter";
import RelayBar from "../components/RelayBar";
import ReportList from "../components/ReportList";
import { EmptyState, ErrorState, Loading } from "../components/States";
import SupporterList from "../components/SupporterList";
import ZapPanel from "../components/ZapPanel";
import { DEFAULT_RELAY } from "../lib/const";
import {
  fetchGoalById,
  fetchGoalTally,
  fetchProfile,
  fetchReports,
  type GoalCardData,
  type ProfileView,
  type ReportData,
} from "../lib/goals";
import { fetchSupporters, type Supporter } from "../lib/supporters";

export default function GoalDetail() {
  const params = useParams();
  const [relay, setRelay] = createSignal(DEFAULT_RELAY);
  const [card, setCard] = createSignal<GoalCardData | null>(null);
  const [raised, setRaised] = createSignal(0n);
  const [supporters, setSupporters] = createSignal<Supporter[]>([]);
  const [reports, setReports] = createSignal<ReportData[]>([]);
  const [profile, setProfile] = createSignal<ProfileView | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const decoded = decodeNevent(params["nevent"] ?? "");
    if (decoded === null) {
      setError("不正なプロジェクト ID です");
      setLoading(false);
      return;
    }
    const goalId = decoded.id;
    const url = decoded.relays[0] ?? relay();
    setRelay(url);
    fetchGoalById(url, goalId)
      .then((found) => {
        if (found === null) {
          setError("プロジェクトが見つかりません");
          return;
        }
        setCard(found);
        return Promise.all([
          fetchGoalTally(url, goalId, found.closedAt),
          fetchSupporters(url, goalId, found.closedAt),
          fetchReports(url, goalId),
          fetchProfile(url, found.pubkey),
        ]).then(([tally, fetchedSupporters, fetchedReports, fetchedProfile]) => {
          setRaised(tally.totalMsats);
          setSupporters(fetchedSupporters);
          setReports(fetchedReports);
          setProfile(fetchedProfile);
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  onMount(load);

  const deadline = () => {
    const closedAt = card()?.closedAt;
    if (closedAt === undefined) return "期限なし";
    return remainingLabel(Math.floor(Date.now() / 1000), closedAt);
  };

  return (
    <div>
      <a href="/" class="text-sm text-zinc-400 hover:text-zinc-100">
        ← 一覧に戻る
      </a>
      <div class="mt-2">
        <RelayBar relay={relay()} onChange={setRelay} />
      </div>
      {loading() && <Loading />}
      {error() !== null && !loading() && <ErrorState message={error() ?? ""} onRetry={load} />}
      {!loading() && error() === null && card() === null && (
        <EmptyState message="プロジェクトが見つかりません。" />
      )}
      {card() !== null && (
        <article class="grid gap-6">
          {card()?.image !== undefined && (
            <img src={card()?.image} alt="" class="h-56 w-full rounded-lg object-cover" />
          )}
          <div>
            <h1 class="text-2xl font-bold">{card()?.title}</h1>
            <div class="mt-3">
              <CreatorCard profile={profile()} pubkey={card()?.pubkey ?? ""} />
            </div>
          </div>
          <div class="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-4">
            <div>
              <p class="text-xs text-zinc-500">支援総額</p>
              <p class="font-semibold text-amber-300">{formatSats(raised())}</p>
            </div>
            <div>
              <p class="text-xs text-zinc-500">目標</p>
              <p class="font-semibold">{formatSats(card()?.goalMsats ?? 0n)}</p>
            </div>
            <div>
              <p class="text-xs text-zinc-500">達成率</p>
              <p class="font-semibold">{progressPercent(raised(), card()?.goalMsats ?? 0n)}%</p>
            </div>
            <div>
              <p class="text-xs text-zinc-500">締切</p>
              <p class="font-semibold">{deadline()}</p>
            </div>
            <div class="sm:col-span-4">
              <ProgressMeter raisedMsats={raised()} goalMsats={card()?.goalMsats ?? 0n} />
            </div>
          </div>
          <ZapPanel goalMsats={card()?.goalMsats ?? 0n} />
          <section>
            <h2 class="mb-2 text-xl font-semibold">説明</h2>
            <p class="whitespace-pre-wrap text-zinc-300">{card()?.description}</p>
          </section>
          <SupporterList supporters={supporters()} />
          <ReportList reports={reports()} />
        </article>
      )}
    </div>
  );
}
