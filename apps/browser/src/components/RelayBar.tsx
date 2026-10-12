import { createSignal } from "solid-js";
import { DEFAULT_RELAY } from "../lib/const";

export default function RelayBar(props: { relay: string; onChange: (url: string) => void }) {
  const [confirmReset, setConfirmReset] = createSignal(false);
  return (
    <div class="mb-4 flex flex-wrap items-center gap-2 text-sm">
      <label class="shrink-0 text-zinc-400">Relay</label>
      <input
        class="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
        value={props.relay}
        onInput={(e) => {
          setConfirmReset(false);
          props.onChange(e.currentTarget.value);
        }}
      />
      <button
        type="button"
        onClick={() => {
          if (!confirmReset()) {
            setConfirmReset(true);
            return;
          }
          setConfirmReset(false);
          props.onChange(DEFAULT_RELAY);
        }}
        onBlur={() => {
          setConfirmReset(false);
        }}
        class="shrink-0 rounded border border-zinc-700 px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-100"
      >
        {confirmReset() ? "Reset?" : "Reset to default"}
      </button>
    </div>
  );
}
