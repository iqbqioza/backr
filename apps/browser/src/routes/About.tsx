const NIPS = [
  { nip: "NIP-01", use: "鍵・イベント・リレー通信の基本" },
  { nip: "NIP-19", use: "nevent / npub / nsec の共有・入力形式" },
  { nip: "NIP-23", use: "活動報告の長文記事 (kind:30023)" },
  { nip: "NIP-57", use: "Zap 支援 (kind:9734 → kind:9735)" },
  { nip: "NIP-75", use: "資金目標 (kind:9041)。独自 kind 不使用" },
];

export default function About() {
  return (
    <article class="grid gap-6">
      <div>
        <h1 class="mb-2 text-2xl font-bold">Backrとは</h1>
        <p class="text-zinc-300">
          Backr はすべて Nostr 上で完結するクラウドファンディングです。アカウント登録もサーバも不要で、
          公開鍵ひとつでプロジェクトを立ち上げられます。
        </p>
      </div>
      <section class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h2 class="mb-2 font-semibold">仕組み</h2>
        <ul class="list-disc space-y-1 pl-5 text-sm text-zinc-300">
          <li>支援は Zap で作成者に直送されます。Backr が資金を預かりません</li>
          <li>All-in 方式: 期限・達成有無にかかわらず返金はありません</li>
          <li>達成度メーターは zap receipt (kind:9735) の合計から表示します</li>
          <li>締切 (closed_at) を過ぎた支援は集計に含めません</li>
        </ul>
      </section>
      <section>
        <h2 class="mb-2 font-semibold">対応 NIP</h2>
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
