import { useParams } from "@solidjs/router";
import { decodeNevent, encodeNevent } from "backr-nostr-nips";
import { countdownLabel, formatSats, formatSatsBtc, progressPercent, timeAgo } from "backr-utils";
import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { OGP_ASPECT_CLASS } from "../components/thumb";
import CommentSection from "../components/CommentSection";
import Markdown from "../components/Markdown";
import SafeImage from "../components/SafeImage";
import ProgressMeter from "../components/ProgressMeter";
import ReportForm from "../components/ReportForm";
import RelayBar from "../components/RelayBar";
import ReportList from "../components/ReportList";
import { avatarImage } from "../components/people";
import SupporterHighlights from "../components/SupporterHighlights";
import { EmptyState, ErrorState, Loading } from "../components/States";
import SupporterList from "../components/SupporterList";
import ZapPanel from "../components/ZapPanel";
import { getSession, getUserRelays } from "../lib/auth";
import { DEFAULT_RELAY } from "../lib/const";
import { ACTIVITY, ZAP } from "../lib/copy";
import { requestDeletion } from "../lib/deletion";
import {
  fetchAuthorReadRelays,
  fetchGoalByIdMulti,
  fetchProfileMulti,
  fetchProfilesMulti,
  fetchReportsMulti,
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
import { fetchGoalZapDataMulti, type Supporter } from "../lib/supporters";

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
  const [nowSec, setNowSec] = createSignal(Math.floor(Date.now() / 1000));
  const [zapVisible, setZapVisible] = createSignal(false);
  const [extraRelays, setExtraRelays] = createSignal<string[]>([]);

  /** 選択リレー + デフォルト + goal の relays タグ + 作成者の NIP-65 read + 本人の read リレー */
  const zapRelays = (): string[] => {
    const current = card();
    if (current === null) return [relay()];
    return [
      ...new Set([
        relay(),
        DEFAULT_RELAY,
        ...current.relays.slice(0, 3),
        ...extraRelays(),
        ...getUserRelays().read.slice(0, 3),
      ]),
    ];
  };

  const load = () => {
    setLoading(true);
    setError(null);
    const decoded = decodeNevent(params["nevent"] ?? "");
    if (decoded === null) {
      setError("Invalid project ID");
      setLoading(false);
      return;
    }
    const goalId = decoded.id;
    const url = decoded.relays[0] ?? relay();
    setRelay(url);
    const goalCandidates = [...new Set([...decoded.relays.slice(0, 3), relay(), DEFAULT_RELAY])];
    fetchGoalByIdMulti(goalCandidates, goalId)
      .then((found) => {
        if (found === null) {
          setError("Project not found");
          return;
        }
        setCard(found);
        return fetchProfileMulti([url, DEFAULT_RELAY], found.pubkey).then((fetchedProfile) => {
          setProfile(fetchedProfile);
          return fetchAuthorReadRelays(url, found.pubkey).then((authorRelays) => {
            setExtraRelays(authorRelays);
            return Promise.all([
              refreshStats(fetchedProfile),
              fetchReportsMulti(zapRelays(), goalId),
            ]).then(([, fetchedReports]) => {
              setReports(fetchedReports);
            });
          });
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to fetch");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const refreshStats = (profile: ProfileView | null) => {
    const current = card();
    if (current === null) return Promise.resolve();
    return fetchGoalZapDataMulti(zapRelays(), current, profile).then((data) => {
      setRaised(data.totalMsats);
      setSupporters(data.supporters);
      setVerified(data.verified);
      return fetchProfilesMulti(
        zapRelays(),
        data.supporters.map((s) => s.pubkey),
      );
    }).then(setSupporterProfiles);
  };

  // タイトルをプロジェクト名に連動させる
  createEffect(() => {
    const title = card()?.title;
    if (typeof document !== "undefined") {
      document.title = title !== undefined ? `${title} — Backr` : "Backr — Nostr crowdfunding";
    }
  });

  // 本人のリレーセットが届いたら集計範囲を広げて更新 (初回のみ)
  let statsExpanded = false;
  createEffect(() => {
    if (getUserRelays().read.length > 0 && !statsExpanded && card() !== null) {
      statsExpanded = true;
      void refreshStats(profile());
    }
  });

  // 支援欄が見えている間は下部固定ボタンを隠す
  createEffect(() => {
    if (card() === null || typeof document === "undefined" || typeof IntersectionObserver === "undefined") {
      return;
    }
    const target = document.getElementById("zap");
    if (target === null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first !== undefined) setZapVisible(first.isIntersecting);
      },
      { threshold: 0.7 },
    );
    observer.observe(target);
    onCleanup(() => {
      observer.disconnect();
    });
  });

  onMount(() => {
    load();
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    onCleanup(() => {
      clearInterval(timer);
    });
  });

  const deadline = () => {
    const closedAt = card()?.closedAt;
    if (closedAt === undefined) return "No deadline";
    return countdownLabel(nowSec(), closedAt);
  };

  const status = () =>
    goalStatus(raised(), card()?.goalMsats ?? 0n, nowSec(), card()?.closedAt);

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
        setError(err instanceof Error ? err.message : "Failed to delete");
      })
      .finally(() => {
        setDeleting(false);
        setConfirming(false);
      });
  };

  return (
    <div class="pb-20 lg:pb-0">
      <a href="/" class="text-sm text-zinc-400 hover:text-zinc-100">
        ← Back to list
      </a>
      <div class="mt-2">
        <RelayBar relay={relay()} onChange={setRelay} />
      </div>
      {loading() && <Loading />}
      {error() !== null && !loading() && <ErrorState message={error() ?? ""} onRetry={load} />}
      {!loading() && error() === null && card() === null && (
        <EmptyState message="Project not found." />
      )}
      {card() !== null && (
        <article>
          <div class="mb-4 flex flex-wrap items-center gap-2">
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
          <h1 class="mb-4 break-words text-2xl font-bold leading-tight md:text-3xl">{card()?.title}</h1>
          <div class="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            <SafeImage
              src={card()?.image}
              alt=""
              imgClass={`w-full object-cover ${OGP_ASPECT_CLASS}`}
              fallback={
                <div
                  class={`flex w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-7xl ${OGP_ASPECT_CLASS}`}
                >
                  ⚡
                </div>
              }
            />
          </div>
          <div class="mt-3 grid gap-8 lg:grid-cols-3">
            <div class="grid content-start gap-8 lg:col-span-2">
              <div class="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-950/95 px-1 py-1 backdrop-blur">
                {(
                  [
                    ["desc", "About"],
                    ["supporters", `Backers (${supporters().length})`],
                    ["comments", `Comments (${commentCount()})`],
                    ["reports", `Updates (${reports().length})`],
                    ["owner", "Owner"],
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
                <div class="text-zinc-300 [&_a]:text-amber-300 [&_a]:underline [&_img]:rounded-lg [&_li]:ml-5 [&_li]:list-disc [&_ol]:grid [&_ol]:gap-1 [&_p]:my-2 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-zinc-950 [&_pre]:p-3 [&_ul]:grid [&_ul]:gap-1 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-3">
                  <Markdown source={card()?.description ?? ""} />
                </div>
              </section>
              <div classList={{ hidden: tab() !== "supporters" }}>
                <SupporterHighlights supporters={supporters()} profiles={supporterProfiles()} />
                <SupporterList supporters={supporters()} profiles={supporterProfiles()} />
              </div>
              <div classList={{ hidden: tab() !== "comments" }}>
                <CommentSection
                  relayUrl={relay()}
                  relays={zapRelays()}
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
                  <SafeImage
                    src={profile()?.image}
                    alt=""
                    imgClass="h-20 w-20 shrink-0 rounded-full object-cover"
                    fallback={
                      <span class="h-20 w-20 shrink-0 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700" />
                    }
                  />
                  <div class="min-w-0">
                    <p class="text-xl font-bold">{profile()?.name ?? "Loading…"}</p>
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
                <p class="text-sm text-zinc-400">
                  Goal {formatSats(card()?.goalMsats ?? 0n)} (≈ {formatSatsBtc(card()?.goalMsats ?? 0n)})
                </p>
                {remaining() > 0n && (
                  <p class="mt-1 text-sm font-semibold text-amber-300">
                    Remaining: {formatSats(remaining())} to goal
                  </p>
                )}
                <div class="mt-3 flex justify-between border-t border-zinc-800 pt-3 text-sm">
                  <span class="text-zinc-400">Backers</span>
                  <span class="font-semibold">{supporters().length}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-400">Time left</span>
                  <span class="font-semibold">{deadline()}</span>
                </div>
                <p class="mt-2 text-xs text-zinc-500">
                  {verified()
                    ? "Verified tally (LNURL signer & amount checked)"
                    : "Unverified: cannot tally because creator's payment target is unknown"}
                </p>
              </div>
              <div id="zap" class="scroll-mt-20">
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
              </div>
              <div class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <div class="flex -space-x-2">
                  {supporters().slice(0, 5).map((s) => (
                    <SafeImage
                      src={avatarImage(supporterProfiles(), s.pubkey)}
                      alt=""
                      imgClass="h-8 w-8 rounded-full border-2 border-zinc-900 object-cover"
                      fallback={
                        <span class="h-8 w-8 rounded-full border-2 border-zinc-900 bg-gradient-to-br from-amber-400 to-orange-600" />
                      }
                    />
                  ))}
                  {supporters().length > 5 && (
                    <span class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-700 text-[10px] font-semibold text-zinc-200">
                      +{supporters().length - 5}
                    </span>
                  )}
                </div>
                <p class="mt-2 text-sm text-zinc-300">
                  {supporters().length === 0
                    ? "Be the first backer"
                    : supporters().length === 1
                      ? "1 backer"
                      : `${supporters().length} backers`}
                </p>
                {recentCount() > 0 && (
                  <p class="mt-2 text-xs font-semibold text-amber-300">
                    {recentCount() === 1
                      ? "1 backer in the last 24h!"
                      : `${recentCount()} backers in the last 24h!`}
                  </p>
                )}
              </div>
              {feed().length > 0 && (
                <section class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <h2 class="mb-2 font-semibold">Recent activity</h2>
                  <ul class="grid gap-2">
                    {feed().map((item) => (
                      <li class="grid gap-1 text-sm">
                        <div class="flex items-center gap-2">
                          <span
                            class={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
                              item.kind === "zap"
                                ? "bg-amber-400/20 text-amber-300"
                                : item.kind === "comment"
                                  ? "bg-zinc-700 text-zinc-300"
                                  : "bg-green-900 text-green-200"
                            }`}
                          >
                            {item.kind === "zap" ? ACTIVITY.zap : item.kind === "comment" ? ACTIVITY.comment : ACTIVITY.report}
                          </span>
                          <span class="ml-auto shrink-0 text-xs text-zinc-500">
                            {timeAgo(Math.floor(Date.now() / 1000), item.at)}
                          </span>
                        </div>
                        <p class="break-words text-zinc-300">{item.text}</p>
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
                  Copy this page URL
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
                  Copy nevent
                </button>
              </div>
              {isAuthor() && !deleted() && (
                <section class="rounded-lg border border-red-900 p-4">
                  <h2 class="font-semibold text-red-300">Delete this project</h2>
                  {!confirming() ? (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirming(true);
                      }}
                      class="mt-2 rounded border border-red-700 px-3 py-1 text-sm text-red-300 hover:bg-red-950"
                    >
                      Delete
                    </button>
                  ) : (
                    <div class="mt-2 flex items-center gap-2">
                      <p class="text-sm text-zinc-300">Delete this project?</p>
                      <button
                        type="button"
                        onClick={onDelete}
                        disabled={deleting()}
                        class="rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {deleting() ? "Deleting…" : "Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirming(false);
                        }}
                        class="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-100"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </section>
              )}
              {deleted() && (
                <p class="rounded border border-green-800 bg-green-950/40 p-3 text-sm text-green-300">
                  Delete request sent. May take time to reflect in relay.
                  <a class="ml-2 underline" href="/">
                    Back to list
                  </a>
                </p>
              )}
            </aside>
          </div>
          {!zapVisible() && (
            <div class="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
              <button
                type="button"
                onClick={() => {
                  document.getElementById("zap")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                class="w-full rounded-lg bg-amber-400 px-4 py-3 font-semibold text-zinc-950"
              >
                {ZAP.submit}
              </button>
            </div>
          )}
        </article>
      )}
    </div>
  );
}
