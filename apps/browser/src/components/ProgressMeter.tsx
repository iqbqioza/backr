import { formatSats, progressPercent } from "backr-utils";

export default function ProgressMeter(props: { raisedMsats: bigint; goalMsats: bigint; compact?: boolean }) {
  const pct = () => progressPercent(props.raisedMsats, props.goalMsats);
  const width = () => `${Math.min(100, pct())}%`;
  return (
    <div>
      <div class="h-2 w-full overflow-hidden rounded bg-zinc-800">
        <div class="h-full rounded bg-amber-400" style={{ width: width() }} />
      </div>
      {(props.compact ?? false) === false && (
        <p class="mt-1 text-sm text-zinc-400">
          {formatSats(props.raisedMsats)} / {formatSats(props.goalMsats)} ({pct()}%)
        </p>
      )}
    </div>
  );
}
