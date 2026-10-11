import { DEFAULT_RELAY } from "../lib/const";

export default function RelayBar(props: { relay: string; onChange: (url: string) => void }) {
  return (
    <div class="mb-4 flex items-center gap-2 text-sm">
      <label class="shrink-0 text-zinc-400">Relay</label>
      <input
        class="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-xs"
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
