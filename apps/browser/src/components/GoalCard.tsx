import { encodeNevent } from "backr-nostr-nips";
import { remainingLabel } from "backr-utils";
import type { GoalCardData } from "../lib/goals";
import ProgressMeter from "./ProgressMeter";

export default function GoalCard(props: { card: GoalCardData; raisedMsats?: bigint }) {
  const nevent = () => encodeNevent({ id: props.card.id, relays: props.card.relays.slice(0, 3) }) ?? "";
  const deadline = () =>
    props.card.closedAt === undefined
      ? "期限なし"
      : remainingLabel(Math.floor(Date.now() / 1000), props.card.closedAt);
  return (
    <a
      href={`/g/${nevent()}`}
      class="block rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600"
    >
      {props.card.image !== undefined && (
        <img src={props.card.image} alt="" class="mb-3 h-40 w-full rounded object-cover" />
      )}
      <h2 class="text-lg font-semibold">{props.card.title}</h2>
      {props.card.summary.length > 0 && (
        <p class="mt-1 line-clamp-2 text-sm text-zinc-400">{props.card.summary}</p>
      )}
      <div class="mt-3">
        <ProgressMeter raisedMsats={props.raisedMsats ?? 0n} goalMsats={props.card.goalMsats} />
      </div>
      <p class="mt-2 text-sm text-zinc-400">{deadline()}</p>
    </a>
  );
}
