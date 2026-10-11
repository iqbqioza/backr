export function Loading(props: { label?: string }) {
  return <p class="py-8 text-center text-zinc-400">{props.label ?? "Loading…"}</p>;
}

export function ErrorState(props: { message: string; onRetry?: () => void }) {
  return (
    <div class="rounded-lg border border-red-900 bg-red-950/40 p-4 text-center">
      <p class="text-red-300">{props.message}</p>
      {props.onRetry !== undefined && (
        <button
          type="button"
          onClick={props.onRetry}
          class="mt-2 rounded border border-red-700 px-3 py-1 text-sm text-red-200 hover:bg-red-900"
        >
          再試行
        </button>
      )}
    </div>
  );
}

export function EmptyState(props: { message: string }) {
  return <p class="rounded-lg border border-dashed border-zinc-700 p-8 text-center text-zinc-400">{props.message}</p>;
}
