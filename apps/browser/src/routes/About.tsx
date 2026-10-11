export default function About() {
  return (
    <article>
      <h1 class="mb-4 text-2xl font-bold">Backrとは</h1>
      <p class="text-zinc-300">
        Backr はすべて Nostr 上で完結するクラウドファンディングです。支援は Zap で作成者に直送され、
        All-in 方式 (期限・達成有無にかかわらず返金なし) です。
      </p>
      <ul class="mt-4 list-disc pl-5 text-zinc-300">
        <li>プロジェクト本体: kind:9041 (NIP-75 Zap Goals)</li>
        <li>活動報告: kind:30023 (NIP-23) + goal タグ</li>
        <li>支援・集計: NIP-57 (kind:9734 → kind:9735)</li>
        <li>達成度メーターで進捗を表示</li>
      </ul>
    </article>
  );
}
