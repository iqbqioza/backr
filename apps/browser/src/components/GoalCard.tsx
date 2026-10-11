import { encodeNevent } from "backr-nostr-nips";
import { formatSats, progressPercent, remainingLabel } from "backr-utils";
import type { GoalCardData } from "../lib/goals";
import type { ValidatedGoalZap } from "../lib/supporters";
import ProgressMeter from "./ProgressMeter";

/**
 * CAMPFIRE 風カード: 画像 / タイトル / 達成率% / 支援額 / 支援者数 / 残り日数。
 * 配色は Backr (zinc + amber) のまま。
 */
export default function GoalCard(props: { card: GoalCardData; zap?: ValidatedGoalZap }) {
  const nevent = () => encodeNevent({ id: props.card.id, relays: props.card.relays.slice(0, 3) }) ?? "";
  const raised = () => props.zap?.totalMsats ?? 0n;
  const count = () => props.zap?.count ?? 0;
  const pct = () => progressPercent(raised(), props.card.goalMsats);
  const deadline = () =>
    props.card.closedAt === undefined
      ? "期限なし"
      : remainingLabel(Math.floor(Date.now() / 1000), props.card.closedAt);
  return (
    <a
      href={`/g/${nevent()}`}
      class="block w-64 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-600"
    >
      {props.card.image !== undefined ? (
        <img src={props.card.image} alt="" class="h-36 w-full object-cover" />
      ) : (
        <div class="flex h-36 w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-4xl">
          ⚡
        </div>
      )}
      <div class="p-3">
        <h3 class="line-clamp-2 min-h-10 text-sm font-semibold leading-snug">{props.card.title}</h3>
        <p class="mt-2 text-2xl font-bold text-amber-300">{pct()}%</p>
        <ProgressMeter raisedMsats={raised()} goalMsats={props.card.goalMsats} compact />
        <p class="mt-1 text-sm font-semibold">{formatSats(raised())}</p>
        <p class="mt-1 flex justify-between text-xs text-zinc-400">
          <span>{count()}人が支援</span>
          <span>{deadline()}</span>
        </p>
      </div>
    </a>
  );
}
