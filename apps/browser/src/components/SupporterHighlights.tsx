import { formatSats } from "backr-utils";
import type { ProfileView } from "../lib/goals";
import { firstSupporter, topSupporters, type Supporter } from "../lib/supporters";
import { displayName, shortKey } from "./people";

/** Supporter tab header: first supporter and top backers */
export default function SupporterHighlights(props: {
  supporters: Supporter[];
  profiles: Map<string, ProfileView>;
}) {
  const list = props.supporters;
  const first = () => firstSupporter(list);
  const top = () => topSupporters(list, 3);
  if (list.length === 0) return null;

  return (
    <div class="mb-4 grid gap-3 sm:grid-cols-2">
      {first() !== null && (
        <div class="rounded-lg border border-amber-600/50 bg-amber-400/10 p-4">
          <p class="text-xs font-semibold tracking-wider text-amber-300">First backer</p>
          <div class="mt-2 flex items-center gap-2">
            {(() => {
              const s = first();
              const image = s === null ? undefined : props.profiles.get(s.pubkey)?.image;
              return image !== undefined ? (
                <img src={image} alt="" class="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span class="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600" />
              );
            })()}
            <div class="min-w-0">
              <p class="truncate font-medium">{displayName(props.profiles, first()?.pubkey ?? "")}</p>
              <p class="font-mono text-xs text-zinc-500">{shortKey(first()?.pubkey ?? "")}</p>
            </div>
            <span class="ml-auto shrink-0 text-sm font-semibold text-amber-300">
              {formatSats(first()?.msats ?? 0n)}
            </span>
          </div>
        </div>
      )}
      {top().length > 0 && (
        <div class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p class="text-xs font-semibold tracking-wider text-zinc-400">Top 3</p>
          <ol class="mt-2 grid gap-1">
            {top().map((supporter, index) => (
              <li class="flex items-center gap-2 text-sm">
                <span
                  class={`w-5 shrink-0 text-center font-bold ${
                    index === 0
                      ? "text-amber-300"
                      : index === 1
                        ? "text-zinc-300"
                        : "text-orange-300/70"
                  }`}
                >
                  {index + 1}
                </span>
                <span class="truncate">{displayName(props.profiles, supporter.pubkey)}</span>
                <span class="ml-auto shrink-0 font-mono text-xs text-zinc-500">
                  {formatSats(supporter.msats)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
