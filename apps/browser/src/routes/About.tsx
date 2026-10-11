const NIPS = [
  { nip: "NIP-01", use: "Keys, events, and relay messaging basic" },
  { nip: "NIP-19", use: "nevent / npub / nsec sharing & input format" },
  { nip: "NIP-23", use: "Long-form updates (kind:30023)" },
  { nip: "NIP-57", use: "Zap support (kind:9734 → kind:9735)" },
  { nip: "NIP-75", use: "Funding goal (kind:9041). No custom kinds" },
];

export default function About() {
  return (
    <article class="grid gap-6">
      <div>
        <h1 class="mb-2 text-2xl font-bold">About Backr</h1>
        <p class="text-zinc-300">
          Backr is crowdfunding that lives entirely on Nostr. No accounts, no servers — just your keys.
          Can start a project with just a public key.
        </p>
      </div>
      <section class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h2 class="mb-2 font-semibold">How it works</h2>
        <ul class="list-disc space-y-1 pl-5 text-sm text-zinc-300">
          <li>Support is sent directly to the creator via Zap. Backr does not hold funds</li>
          <li>All-in: No refunds regardless of deadline or outcome</li>
          <li>Progress meter shows total of zap receipts (kind:9735)</li>
          <li>Support after closed_at is not included in the tally</li>
        </ul>
      </section>
      <section>
        <h2 class="mb-2 font-semibold">Supported NIPs</h2>
        <div class="overflow-hidden rounded-lg border border-zinc-800">
          <table class="w-full text-sm">
            <tbody>
              {NIPS.map((row) => (
                <tr class="border-b border-zinc-800 last:border-0">
                  <td class="w-24 px-3 py-2 font-mono text-amber-300">{row.nip}</td>
                  <td class="px-3 py-2 text-zinc-300">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
