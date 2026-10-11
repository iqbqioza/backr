import { decodeBare, validateGoal9041 } from "backr-nostr-nips";
import { formatSats, remainingLabel } from "backr-utils";
import { createSignal } from "solid-js";
import { DEFAULT_RELAY } from "../lib/const";

/** 作成フォーム: 署名・公開は次のステップ。ここでは 9041 の検証とプレビューまで */
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

  const goalMsats = (): bigint | null => {
    const trimmed = goalSats().trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const value = BigInt(trimmed) * 1000n;
    return value > 0n ? value : null;
  };

  const closedAtSec = (): number | null => {
    if (closedAt().trim().length === 0) return null;
    const ms = Date.parse(closedAt().trim());
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
  };

  const onBuild = () => {
    const pubkey = resolvePubkey(npub());
    const problems: string[] = [];
    if (pubkey === null) problems.push("作成者の npub/hex が不正です");
    if (goalMsats() === null) problems.push("目標 sats は正の整数で入力してください");
    if (closedAt().trim().length > 0 && closedAtSec() === null) {
      problems.push("締切の日付が不正です");
    }
    if (problems.length > 0) {
      setErrors(problems);
      setPreview(null);
      return;
    }
    const tags: string[][] = [
      ["relays", DEFAULT_RELAY],
      ["amount", (goalMsats() ?? 0n).toString()],
      ["t", "backr"],
    ];
    const closed = closedAtSec();
    if (closed !== null) tags.push(["closed_at", String(closed)]);
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
  const nowSec = () => Math.floor(Date.now() / 1000);

  return (
    <div>
      <h1 class="mb-4 text-2xl font-bold">プロジェクトを作る</h1>
      <div class="grid gap-6 md:grid-cols-2">
        <div class="grid content-start gap-3">
          <label class="text-sm">
            作成者 (npub / hex)
            <input
              class={input}
              placeholder="npub1…"
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
              placeholder="例: Nostrハッカソン開催費"
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
              placeholder="資金の使い道・スケジュールなど"
              value={description()}
              onInput={(e) => {
                setDescription(e.currentTarget.value);
              }}
            />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="text-sm">
              目標 (sats)
              <input
                class={input}
                inputMode="numeric"
                placeholder="100000"
                value={goalSats()}
                onInput={(e) => {
                  setGoalSats(e.currentTarget.value);
                }}
              />
            </label>
            <label class="text-sm">
              締切 (任意)
              <input
                class={input}
                type="date"
                value={closedAt()}
                onInput={(e) => {
                  setClosedAt(e.currentTarget.value);
                }}
              />
            </label>
          </div>
          <label class="text-sm">
            画像 URL (任意)
            <input
              class={input}
              placeholder="https://…"
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
          {errors().length > 0 && (
            <ul class="list-disc pl-5 text-sm text-red-400">
              {errors().map((err) => (
                <li>{err}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 class="mb-2 font-semibold">プレビュー</h2>
          <div class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            {image().trim().length > 0 && (
              <img src={image().trim()} alt="" class="mb-3 h-40 w-full rounded object-cover" />
            )}
            <p class="text-lg font-semibold">{summary().trim() || "タイトル未入力"}</p>
            <p class="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-400">
              {description() || "説明未入力"}
            </p>
            <p class="mt-3 text-sm text-zinc-400">
              目標: {goalMsats() === null ? "—" : formatSats(goalMsats() ?? 0n)}
              {" / "}
              {closedAtSec() === null ? "期限なし" : remainingLabel(nowSec(), closedAtSec() ?? 0)}
            </p>
          </div>
          {preview() !== null && (
            <pre class="mt-3 max-h-64 overflow-auto rounded bg-zinc-900 p-4 text-xs">{preview()}</pre>
          )}
          <p class="mt-3 text-sm text-zinc-400">署名・リレー公開は次のステップで対応します。</p>
        </div>
      </div>
    </div>
  );
}
