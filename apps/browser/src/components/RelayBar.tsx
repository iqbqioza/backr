import { DEFAULT_RELAY } from "../lib/const";

export default function RelayBar(props: { relay: string; onChange: (url: string) => void }) {
  return (
    <div class="mb-4 flex flex-wrap items-center gap-2 text-sm">
      <label class="shrink-0 text-zinc-400">Relay</label>
      <input
        class="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-100 focus:border-amber-400 focus:outline-none"
        value={props.relay}
        onInput={(e) => {
          props.onChange(e.currentTarget.value);
        }}
      />
      <button
        type="button"
        onClick={() => {
          props.onChange(DEFAULT_RELAY);
        }}
        class="shrink-0 rounded border border-zinc-700 px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-100"
      >
        Reset to default
      </button>
    </div>
  );
}
