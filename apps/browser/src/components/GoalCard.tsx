import { encodeNevent } from "backr-nostr-nips";
import { remainingLabel } from "backr-utils";
import type { GoalCardData } from "../lib/goals";

export default function GoalCard(props: { card: GoalCardData }) {
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
        <p class="mt-1 text-sm text-zinc-400">{props.card.summary}</p>
      )}
      <p class="mt-2 text-sm text-zinc-400">{deadline()}</p>
    </a>
  );
}
