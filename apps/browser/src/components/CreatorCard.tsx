import type { ProfileView } from "../lib/goals";
import { shortKey } from "./SupporterList";

export default function CreatorCard(props: { profile: ProfileView | null; pubkey: string }) {
  const profile = () => props.profile;
  return (
    <div class="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      {profile()?.image !== undefined ? (
        <img src={profile()?.image} alt="" class="h-10 w-10 rounded-full object-cover" />
      ) : (
        <span class="h-10 w-10 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-700" />
      )}
      <div>
        <p class="font-medium">{profile()?.name ?? shortKey(props.pubkey)}</p>
        <p class="font-mono text-xs text-zinc-500">{shortKey(props.pubkey)}</p>
      </div>
      {profile()?.lud16 !== undefined && (
        <span class="ml-auto rounded bg-zinc-800 px-2 py-1 font-mono text-xs text-amber-300">
          {profile()?.lud16}
        </span>
      )}
    </div>
  );
}
