import { decodeBare } from "backr-nostr-nips";
import { validateGoal9041 } from "backr-nostr-nips";
import { createSignal } from "solid-js";
import { DEFAULT_RELAY } from "../lib/const";

/** 作成フォーム: 署名・公開は次のステップ。ここでは 9041 の検証と JSON プレビューまで */
export default function Create() {
  const [npub, setNpub] = createSignal("");
  const [summary, setSummary] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [goalSats, setGoalSats] = createSignal("");
  const [closedAt, setClosedAt] = createSignal("");
  const [image, setImage] = createSignal("");
  const [preview, setPreview] = createSignal<string | null>(null);
  const [errors, setErrors] = createSignal<string[]>([]);

  const resolvePubkey = (input: string): string | null => {
    const trimmed = input.trim();
    if (/^[0-9a-f]{64}$/.test(trimmed)) return trimmed;
    return decodeBare(trimmed, "npub");
  };

  const onBuild = () => {
    const pubkey = resolvePubkey(npub());
    const problems: string[] = [];
    if (pubkey === null) problems.push("作成者の npub/hex が不正です");
    if (!/^\d+$/.test(goalSats().trim()) || BigInt(goalSats().trim() || "0") <= 0n) {
      problems.push("目標 sats は正の整数で入力してください");
    }
    let closedAtSec: number | undefined;
    if (closedAt().trim().length > 0) {
      const ms = Date.parse(closedAt().trim());
      if (Number.isNaN(ms)) problems.push("締切の日付が不正です");
      else closedAtSec = Math.floor(ms / 1000);
    }
    if (problems.length > 0) {
      setErrors(problems);
      setPreview(null);
      return;
    }
    const tags: string[][] = [
      ["relays", DEFAULT_RELAY],
      ["amount", (BigInt(goalSats().trim()) * 1000n).toString()],
      ["t", "backr"],
    ];
    if (closedAtSec !== undefined) tags.push(["closed_at", String(closedAtSec)]);
    if (summary().trim().length > 0) tags.push(["summary", summary().trim()]);
    if (image().trim().length > 0) tags.push(["image", image().trim()]);
    const event = {
      id: "0".repeat(64),
      pubkey: pubkey ?? "",
      created_at: Math.floor(Date.now() / 1000),
      kind: 9041,
      tags,
      content: description(),
      sig: "0".repeat(64),
    };
    const result = validateGoal9041(event);
    if (!result.ok) {
      setErrors(result.errors);
      setPreview(null);
      return;
    }
    setErrors([]);
    setPreview(JSON.stringify(event, null, 2));
  };

  const input = "w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2";

  return (
    <div>
      <h1 class="mb-4 text-2xl font-bold">プロジェクトを作る</h1>
      <div class="grid gap-3">
        <label class="text-sm">
          作成者 (npub / hex)
          <input
            class={input}
            value={npub()}
            onInput={(e) => {
              setNpub(e.currentTarget.value);
            }}
          />
        </label>
        <label class="text-sm">
          短い説明 (summary)
          <input
            class={input}
            value={summary()}
            onInput={(e) => {
              setSummary(e.currentTarget.value);
            }}
          />
        </label>
        <label class="text-sm">
          詳しい説明
          <textarea
            class={input}
            rows={6}
            value={description()}
            onInput={(e) => {
              setDescription(e.currentTarget.value);
            }}
          />
        </label>
        <label class="text-sm">
          目標 (sats)
          <input
            class={input}
            inputMode="numeric"
            value={goalSats()}
            onInput={(e) => {
              setGoalSats(e.currentTarget.value);
            }}
          />
        </label>
        <label class="text-sm">
          締切 (任意、日付)
          <input
            class={input}
            type="date"
            value={closedAt()}
            onInput={(e) => {
              setClosedAt(e.currentTarget.value);
            }}
          />
        </label>
        <label class="text-sm">
          画像 URL (任意)
          <input
            class={input}
            value={image()}
            onInput={(e) => {
              setImage(e.currentTarget.value);
            }}
          />
        </label>
        <button
          type="button"
          onClick={onBuild}
          class="rounded bg-amber-400 px-4 py-2 font-semibold text-zinc-950"
        >
          イベントを確認する
        </button>
      </div>
      {errors().length > 0 && (
        <ul class="mt-4 list-disc pl-5 text-red-400">
          {errors().map((err) => (
            <li>{err}</li>
          ))}
        </ul>
      )}
      {preview() !== null && (
        <pre class="mt-4 overflow-auto rounded bg-zinc-900 p-4 text-xs">{preview()}</pre>
      )}
      <p class="mt-4 text-sm text-zinc-400">署名・リレー公開は次のステップで対応します。</p>
    </div>
  );
}
