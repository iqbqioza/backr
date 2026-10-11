import { useParams } from "@solidjs/router";
import { decodeNevent, encodeNevent } from "backr-nostr-nips";
import { formatSats, progressPercent, remainingLabel, timeAgo } from "backr-utils";
import { createSignal, onMount } from "solid-js";
import { OGP_ASPECT_CLASS } from "../components/thumb";
import CommentSection from "../components/CommentSection";
import ProgressMeter from "../components/ProgressMeter";
import ReportForm from "../components/ReportForm";
import RelayBar from "../components/RelayBar";
import ReportList from "../components/ReportList";
import { avatarImage } from "../components/people";
import SupporterHighlights from "../components/SupporterHighlights";
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
  goalRemaining,
  goalStatus,
  GOAL_STATUS_LABEL,
  type GoalCardData,
  type ProfileView,
  type ReportData,
} from "../lib/goals";
import { buildActivityFeed, recentSupporterCount } from "../lib/activity";
import type { CommentView } from "../lib/comments";
import { mergeReports } from "../lib/reports";
import { fetchGoalZapData, type Supporter } from "../lib/supporters";

export default function GoalDetail() {
  const params = useParams();
  const [relay, setRelay] = createSignal(DEFAULT_RELAY);
  const [card, setCard] = createSignal<GoalCardData | null>(null);
  const [raised, setRaised] = createSignal(0n);
  const [supporters, setSupporters] = createSignal<Supporter[]>([]);
  const [verified, setVerified] = createSignal(false);
  const [allComments, setAllComments] = createSignal<CommentView[]>([]);
  const [supporterProfiles, setSupporterProfiles] = createSignal(new Map<string, ProfileView>());
  const [reports, setReports] = createSignal<ReportData[]>([]);
  const [profile, setProfile] = createSignal<ProfileView | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [confirming, setConfirming] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [deleted, setDeleted] = createSignal(false);
  const [tab, setTab] = createSignal<"desc" | "supporters" | "comments" | "reports" | "owner">(
    "desc",
  );
  const [commentCount, setCommentCount] = createSignal(0);

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

  const status = () =>
    goalStatus(raised(), card()?.goalMsats ?? 0n, Math.floor(Date.now() / 1000), card()?.closedAt);

  const feed = () => buildActivityFeed(supporters(), allComments(), reports());
  const recentCount = () => recentSupporterCount(supporters(), Math.floor(Date.now() / 1000));
  const remaining = () => goalRemaining(raised(), card()?.goalMsats ?? 0n);

  const shareNevent = () => {
    const id = card()?.id ?? "";
    if (id.length === 0) return "";
    return encodeNevent({ id, relays: card()?.relays.slice(0, 3) ?? [] }) ?? "";
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
          <div class="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            <div class="flex flex-wrap items-center gap-2 px-4 py-3">
              <span
                class={`rounded-full px-3 py-1 text-sm font-semibold ${
                  status() === "achieved"
                    ? "bg-amber-400 text-zinc-950"
                    : status() === "active"
                      ? "bg-green-900 text-green-200"
                      : status() === "ending-soon"
                        ? "bg-orange-900 text-orange-200"
                        : "bg-zinc-700 text-zinc-300"
                }`}
              >
                {GOAL_STATUS_LABEL[status()]}
              </span>
              <span class="text-sm text-zinc-400">{deadline()}</span>
            </div>
            <h1 class="px-4 pb-3 text-2xl font-bold leading-tight md:text-3xl">{card()?.title}</h1>
            {card()?.image !== undefined ? (
              <img src={card()?.image} alt="" class={`w-full object-cover ${OGP_ASPECT_CLASS}`} />
            ) : (
              <div
                class={`flex w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-7xl ${OGP_ASPECT_CLASS}`}
              >
                ⚡
              </div>
            )}
          </div>
          <div class="mt-3 grid gap-8 lg:grid-cols-3">
            <div class="grid content-start gap-8 lg:col-span-2">
              <div class="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-950/95 px-1 py-1 backdrop-blur">
                {(
                  [
                    ["desc", "説明"],
                    ["supporters", `支援者 (${supporters().length})`],
                    ["comments", `コメント (${commentCount()})`],
                    ["reports", `活動報告 (${reports().length})`],
                    ["owner", "プロジェクトオーナー"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    type="button"
                    onClick={() => {
                      setTab(id);
                    }}
                    class={`shrink-0 border-b-2 px-4 py-2 text-sm font-medium ${
                      tab() === id
                        ? "border-amber-400 text-amber-300"
                        : "border-transparent text-zinc-400 hover:text-zinc-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <section classList={{ hidden: tab() !== "desc" }}>
                <p class="whitespace-pre-wrap text-zinc-300">{card()?.description}</p>
              </section>
              <div classList={{ hidden: tab() !== "supporters" }}>
                <SupporterHighlights supporters={supporters()} profiles={supporterProfiles()} />
                <SupporterList supporters={supporters()} profiles={supporterProfiles()} />
              </div>
              <div classList={{ hidden: tab() !== "comments" }}>
                <CommentSection
                  relayUrl={relay()}
                  goalId={card()?.id ?? ""}
                  goalAuthor={card()?.pubkey ?? ""}
                  onCount={setCommentCount}
                  onComments={setAllComments}
                />
              </div>
              <div classList={{ hidden: tab() !== "reports" }}>
                <div class="grid gap-6">
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
              </div>
              <div classList={{ hidden: tab() !== "owner" }}>
                <div class="flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
                  {profile()?.image !== undefined ? (
                    <img
                      src={profile()?.image}
                      alt=""
                      class="h-20 w-20 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span class="h-20 w-20 shrink-0 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700" />
                  )}
                  <div class="min-w-0">
                    <p class="text-xl font-bold">{profile()?.name ?? "読み込み中…"}</p>
                    {profile()?.about !== undefined && (
                      <p class="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-300">
                        {profile()?.about}
                      </p>
                    )}
                    <div class="mt-3 flex flex-wrap gap-2">
                      {profile()?.lud16 !== undefined && (
                        <span class="rounded bg-zinc-800 px-2 py-1 font-mono text-xs text-amber-300">
                          {profile()?.lud16}
                        </span>
                      )}
                      <span class="rounded bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-400">
                        {card()?.pubkey.slice(0, 16)}…
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
                {remaining() > 0n && (
                  <p class="mt-1 text-sm font-semibold text-amber-300">
                    あと {formatSats(remaining())} で達成！
                  </p>
                )}
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
                goalTitle={card()?.title ?? ""}
                ended={card()?.closedAt !== undefined && Math.floor(Date.now() / 1000) >= (card()?.closedAt ?? 0)}
                onPaid={() => {
                  void refreshStats(profile());
                }}
              />
              <div class="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <div class="flex -space-x-2">
                  {supporters().slice(0, 5).map((s) =>
                    avatarImage(supporterProfiles(), s.pubkey) !== undefined ? (
                      <img
                        src={avatarImage(supporterProfiles(), s.pubkey)}
                        alt=""
                        class="h-8 w-8 rounded-full border-2 border-zinc-900 object-cover"
                      />
                    ) : (
                      <span class="h-8 w-8 rounded-full border-2 border-zinc-900 bg-gradient-to-br from-amber-400 to-orange-600" />
                    ),
                  )}
                </div>
                <p class="text-sm text-zinc-300">
                  {supporters().length > 0
                    ? `${supporters().length}人が支援しています`
                    : "最初の支援者になりましょう"}
                </p>
                {recentCount() > 0 && (
                  <p class="mt-1 text-xs font-semibold text-amber-300">
                    直近24時間で{recentCount()}人が支援！
                  </p>
                )}
              </div>
              {feed().length > 0 && (
                <section class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <h2 class="mb-2 font-semibold">新着アクティビティ</h2>
                  <ul class="grid gap-2">
                    {feed().map((item) => (
                      <li class="flex items-center gap-2 text-sm">
                        <span
                          class={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
                            item.kind === "zap"
                              ? "bg-amber-400/20 text-amber-300"
                              : item.kind === "comment"
                                ? "bg-zinc-700 text-zinc-300"
                                : "bg-green-900 text-green-200"
                          }`}
                        >
                          {item.kind === "zap" ? "支援" : item.kind === "comment" ? "コメント" : "報告"}
                        </span>
                        <span class="truncate text-zinc-300">{item.text}</span>
                        <span class="ml-auto shrink-0 text-xs text-zinc-500">
                          {timeAgo(Math.floor(Date.now() / 1000), item.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <div class="grid gap-2">
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
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.clipboard !== undefined) {
                      void navigator.clipboard.writeText(`nostr:${shareNevent()}`);
                    }
                  }}
                  class="rounded-lg border border-zinc-700 px-4 py-2 font-mono text-xs text-zinc-400 hover:border-zinc-500"
                >
                  neventをコピー
                </button>
              </div>
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
