import { formatSats } from "backr-utils";
import type { Supporter } from "../lib/supporters";

export function shortKey(pubkey: string): string {
  return `${pubkey.slice(0, 8)}…${pubkey.slice(-4)}`;
}

export default function SupporterList(props: { supporters: Supporter[] }) {
  return (
    <section>
      <h2 class="mb-2 text-xl font-semibold">支援者 ({props.supporters.length})</h2>
      {props.supporters.length === 0 ? (
        <p class="text-zinc-400">まだ支援がありません。最初の支援者になりましょう。</p>
      ) : (
        <ul class="grid gap-2">
          {props.supporters.map((supporter) => (
            <li class="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <span class="mt-1 h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-600" />
              <div class="min-w-0">
                <p class="font-mono text-sm">{shortKey(supporter.pubkey)}</p>
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
