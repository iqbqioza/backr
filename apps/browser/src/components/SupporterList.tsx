import { formatSats } from "backr-utils";
import type { ProfileView } from "../lib/goals";
import type { Supporter } from "../lib/supporters";
import { avatarImage, displayName, shortKey } from "./people";

export { displayName, shortKey } from "./people";

export default function SupporterList(props: {
  supporters: Supporter[];
  profiles: Map<string, ProfileView>;
}) {
  return (
    <section>
      <h2 class="mb-2 font-semibold">Backers ({props.supporters.length})</h2>
      {props.supporters.length === 0 ? (
        <p class="text-zinc-400">No backers yet. Be the first!</p>
      ) : (
        <ul class="grid gap-2">
          {props.supporters.map((supporter) => (
            <li class="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              {avatarImage(props.profiles, supporter.pubkey) !== undefined ? (
                <img
                  src={avatarImage(props.profiles, supporter.pubkey)}
                  alt=""
                  class="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span class="mt-1 h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-600" />
              )}
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">
                  {displayName(props.profiles, supporter.pubkey)}
                </p>
                <p class="font-mono text-xs text-zinc-500">{shortKey(supporter.pubkey)}</p>
                <p class="text-sm font-semibold text-amber-300">{formatSats(supporter.msats)}</p>
                {supporter.comment.length > 0 && (
                  <p class="mt-1 break-words text-sm text-zinc-300">{supporter.comment}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
