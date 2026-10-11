import { encodeNevent } from "backr-nostr-nips";
import { formatSats, progressPercent, remainingLabel } from "backr-utils";
import { createEffect, createSignal } from "solid-js";
import type { GoalCardData } from "../lib/goals";
import { goalStatus, GOAL_STATUS_LABEL } from "../lib/goals";
import type { ValidatedGoalZap } from "../lib/supporters";
import ProgressMeter from "./ProgressMeter";

/**
 * CAMPFIRE 風カード: サムネイル上に (ステータス・残り・タイトル) を重ね、
 * その下に達成率・支援額・支援者数を表示する。
 */
import { OGP_ASPECT_CLASS, OGP_PLACEHOLDER_SIZE_CLASS } from "./thumb";

export default function GoalCard(props: { card: GoalCardData; zap?: ValidatedGoalZap }) {
  const nevent = () => encodeNevent({ id: props.card.id, relays: props.card.relays.slice(0, 3) }) ?? "";
  const raised = () => props.zap?.totalMsats ?? 0n;
  const count = () => props.zap?.count ?? 0;
  const pct = () => progressPercent(raised(), props.card.goalMsats);
  const deadline = () =>
    props.card.closedAt === undefined
      ? undefined
      : remainingLabel(Math.floor(Date.now() / 1000), props.card.closedAt);
  const status = () =>
    goalStatus(raised(), props.card.goalMsats, Math.floor(Date.now() / 1000), props.card.closedAt);
  const showRemaining = () => deadline() !== undefined && deadline() !== "終了";

  // 締切経過判定は label 依存なので created_at ではなく closedAt で持つ
  const ended = () => props.card.closedAt !== undefined && Math.floor(Date.now() / 1000) >= props.card.closedAt;
  const statusLabel = () => (ended() ? "終了" : GOAL_STATUS_LABEL[status()]);

  // 1分ごとに残り表示を更新
  const [now, setNow] = createSignal(Math.floor(Date.now() / 1000));
  createEffect(() => {
    const timer = setInterval(
      () => {
        setNow(Math.floor(Date.now() / 1000));
      },
      60000,
    );
    return () => clearInterval(timer);
  });
  void now;
  return (
    <a
      href={`/g/${nevent()}`}
      class="block w-64 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-600"
    >
      <div class={`relative ${OGP_ASPECT_CLASS} w-full`}>
        {props.card.image !== undefined ? (
          <img src={props.card.image} alt="" class={`${OGP_ASPECT_CLASS} w-full object-cover`} />
        ) : (
          <div
            class={`flex ${OGP_ASPECT_CLASS} w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 ${OGP_PLACEHOLDER_SIZE_CLASS}`}
          >
            ⚡
          </div>
        )}
        <div class="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
        <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
          <span
            class={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              status() === "achieved"
                ? "bg-amber-400 text-zinc-950"
                : ended()
                  ? "bg-zinc-700 text-zinc-300"
                  : "bg-green-900 text-green-200"
            }`}
          >
            {statusLabel()}
          </span>
          {showRemaining() && <span class="text-xs text-zinc-200">{deadline()}</span>}
        </div>
      </div>
      <div class="p-3">
        <h3 class="line-clamp-2 min-h-10 text-sm font-semibold leading-snug">{props.card.title}</h3>
        <p class="mt-2 text-2xl font-bold text-amber-300">{pct()}%</p>
        <ProgressMeter raisedMsats={raised()} goalMsats={props.card.goalMsats} compact />
        <p class="mt-1 text-sm font-semibold">{formatSats(raised())}</p>
        <p class="mt-1 flex justify-between text-xs text-zinc-400">
          <span>{count()}人が支援</span>
        </p>
      </div>
    </a>
  );
}
