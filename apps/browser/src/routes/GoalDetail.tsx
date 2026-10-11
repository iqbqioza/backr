import { useParams } from "@solidjs/router";
import { decodeNevent } from "backr-nostr-nips";
import { formatSats, progressPercent, remainingLabel } from "backr-utils";
import { createSignal, onMount } from "solid-js";
import CommentSection from "../components/CommentSection";
import CreatorCard from "../components/CreatorCard";
import ReportForm from "../components/ReportForm";
import ProgressMeter from "../components/ProgressMeter";
import RelayBar from "../components/RelayBar";
import ReportList from "../components/ReportList";
import { EmptyState, ErrorState, Loading } from "../components/States";
import SupporterList from "../components/SupporterList";
import ZapPanel from "../components/ZapPanel";
import { getSession } from "../lib/auth";
import { DEFAULT_RELAY } from "../lib/const";
import { requestDeletion } from "../lib/deletion";
import {
  fetchGoalById,
  fetchProfile,
  fetchProfiles,
  fetchReports,
  type GoalCardData,
  type ProfileView,
  type ReportData,
} from "../lib/goals";
import { mergeReports } from "../lib/reports";
import { fetchGoalZapData, type Supporter } from "../lib/supporters";

export default function GoalDetail() {
  const params = useParams();
  const [relay, setRelay] = createSignal(DEFAULT_RELAY);
  const [card, setCard] = createSignal<GoalCardData | null>(null);
  const [raised, setRaised] = createSignal(0n);
  const [supporters, setSupporters] = createSignal<Supporter[]>([]);
  const [verified, setVerified] = createSignal(false);
  const [supporterProfiles, setSupporterProfiles] = createSignal(new Map<string, ProfileView>());
  const [reports, setReports] = createSignal<ReportData[]>([]);
  const [profile, setProfile] = createSignal<ProfileView | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [confirming, setConfirming] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [deleted, setDeleted] = createSignal(false);

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
        return fetchProfile(url, found.pubkey).then((fetchedProfile) => {
          setProfile(fetchedProfile);
          return Promise.all([
            refreshStats(fetchedProfile),
            fetchReports(url, goalId),
          ]).then(([, fetchedReports]) => {
            setReports(fetchedReports);
          });
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const refreshStats = (profile: ProfileView | null) => {
    const current = card();
    if (current === null) return Promise.resolve();
    return fetchGoalZapData(relay(), current, profile).then((data) => {
      setRaised(data.totalMsats);
      setSupporters(data.supporters);
      setVerified(data.verified);
      return fetchProfiles(
        relay(),
        data.supporters.map((s) => s.pubkey),
      );
    }).then(setSupporterProfiles);
  };

  onMount(load);

  const deadline = () => {
    const closedAt = card()?.closedAt;
    if (closedAt === undefined) return "期限なし";
    return remainingLabel(Math.floor(Date.now() / 1000), closedAt);
  };

  const isAuthor = () => {
    const s = getSession();
    return s !== null && s.method !== "readonly" && s.pubkey === card()?.pubkey;
  };

  const onDelete = () => {
    const id = card()?.id;
    if (id === undefined || deleting()) return;
    setDeleting(true);
    requestDeletion(relay(), [id], "goal deleted by author")
      .then(() => {
        setDeleted(true);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "削除に失敗しました");
      })
      .finally(() => {
        setDeleting(false);
        setConfirming(false);
      });
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
        <article>
          {card()?.image !== undefined && (
            <img src={card()?.image} alt="" class="h-64 w-full rounded-xl object-cover" />
          )}
          <h1 class="mt-4 text-2xl font-bold md:text-3xl">{card()?.title}</h1>
          <div class="mt-3 grid gap-8 lg:grid-cols-3">
            <div class="grid content-start gap-8 lg:col-span-2">
              <section>
                <h2 class="mb-2 text-xl font-semibold">説明</h2>
                <p class="whitespace-pre-wrap text-zinc-300">{card()?.description}</p>
              </section>
              <SupporterList supporters={supporters()} profiles={supporterProfiles()} />
              <CommentSection relayUrl={relay()} goalId={card()?.id ?? ""} goalAuthor={card()?.pubkey ?? ""} />
              {isAuthor() && (
                <ReportForm
                  relayUrl={relay()}
                  goalId={card()?.id ?? ""}
                  onPosted={(report) => {
                    setReports(mergeReports(reports(), [report]));
                  }}
                />
              )}
              <ReportList
                reports={reports()}
                relayUrl={relay()}
                goalId={card()?.id ?? ""}
                onChange={setReports}
              />
            </div>
            <aside class="grid content-start gap-4 self-start lg:sticky lg:top-4">
              <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <p class="text-4xl font-bold text-amber-300">
                  {progressPercent(raised(), card()?.goalMsats ?? 0n)}%
                </p>
                <div class="mt-2">
                  <ProgressMeter raisedMsats={raised()} goalMsats={card()?.goalMsats ?? 0n} compact />
                </div>
                <p class="mt-2 text-lg font-semibold">{formatSats(raised())}</p>
                <p class="text-sm text-zinc-400">目標 {formatSats(card()?.goalMsats ?? 0n)}</p>
                <div class="mt-3 flex justify-between border-t border-zinc-800 pt-3 text-sm">
                  <span class="text-zinc-400">支援者</span>
                  <span class="font-semibold">{supporters().length}人</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-400">残り時間</span>
                  <span class="font-semibold">{deadline()}</span>
                </div>
                <p class="mt-2 text-xs text-zinc-500">
                  {verified()
                    ? "検証済み集計 (LNURL署名者・金額を照合)"
                    : "未検証: 作成者の送金先が不明のため集計できません"}
                </p>
              </div>
              <ZapPanel
                goalId={card()?.id ?? ""}
                recipientPubkey={card()?.pubkey ?? ""}
                profile={profile()}
                relays={card()?.relays ?? []}
                goalMsats={card()?.goalMsats ?? 0n}
                onPaid={() => {
                  void refreshStats(profile());
                }}
              />
              <CreatorCard profile={profile()} pubkey={card()?.pubkey ?? ""} />
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard !== undefined) {
                    void navigator.clipboard.writeText(window.location.href);
                  }
                }}
                class="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
              >
                このページのURLをコピー
              </button>
              {isAuthor() && !deleted() && (
                <section class="rounded-lg border border-red-900 p-4">
                  <h2 class="font-semibold text-red-300">このプロジェクトを削除する</h2>
                  {!confirming() ? (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirming(true);
                      }}
                      class="mt-2 rounded border border-red-700 px-3 py-1 text-sm text-red-300 hover:bg-red-950"
                    >
                      削除する
                    </button>
                  ) : (
                    <div class="mt-2 flex items-center gap-2">
                      <p class="text-sm text-zinc-300">本当に削除しますか?</p>
                      <button
                        type="button"
                        onClick={onDelete}
                        disabled={deleting()}
                        class="rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {deleting() ? "削除中…" : "削除を実行"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirming(false);
                        }}
                        class="rounded border border-zinc-700 px-3 py-1 text-sm"
                      >
                        やめる
                      </button>
                    </div>
                  )}
                </section>
              )}
              {deleted() && (
                <p class="rounded border border-green-800 bg-green-950/40 p-3 text-sm text-green-300">
                  削除要求を送信しました。リレーへの反映に時間がかかる場合があります。
                  <a class="ml-2 underline" href="/">
                    一覧に戻る
                  </a>
                </p>
              )}
            </aside>
          </div>
        </article>
      )}
    </div>
  );
}
