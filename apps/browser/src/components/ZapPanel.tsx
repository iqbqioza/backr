import { createSignal } from "solid-js";
import { formatSats } from "backr-utils";

const PRESETS = [21, 210, 2100, 21000];

/** Zap 支援パネル UI (金額選択まで。送金処理は次のステップ) */
export default function ZapPanel(props: { goalMsats: bigint }) {
  const [sats, setSats] = createSignal(210);
  const [custom, setCustom] = createSignal("");

  const selected = () => {
    const parsed = Number(custom().trim());
    if (custom().trim().length > 0 && Number.isInteger(parsed) && parsed > 0) return parsed;
    return sats();
  };

  return (
    <section class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h2 class="font-semibold">このプロジェクトを支援する</h2>
      <div class="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            type="button"
            onClick={() => {
              setSats(preset);
              setCustom("");
            }}
            class={`rounded border px-3 py-1 text-sm ${
              selected() === preset && custom().trim().length === 0
                ? "border-amber-400 text-amber-300"
                : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            {preset.toLocaleString()} sats
          </button>
        ))}
        <input
          class="w-32 rounded border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm"
          inputMode="numeric"
          placeholder="金額入力"
          value={custom()}
          onInput={(e) => {
            setCustom(e.currentTarget.value);
          }}
        />
      </div>
      <p class="mt-2 text-sm text-zinc-400">
        目標 {formatSats(props.goalMsats)} / 支援額: {formatSats(BigInt(selected()) * 1000n)}
        (Zap 直送・All-in のため返金なし)
      </p>
      <button
        type="button"
        disabled
        class="mt-3 w-full rounded bg-amber-400 px-4 py-2 font-semibold text-zinc-950 opacity-50"
        title="ウォレット連携は次のステップで対応"
      >
        Zapで支援する
      </button>
      <p class="mt-1 text-center text-xs text-zinc-500">ウォレット連携は近日対応</p>
    </section>
  );
}
