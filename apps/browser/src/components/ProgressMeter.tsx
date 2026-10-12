import { formatSats, progressPercent } from "backr-utils";

export default function ProgressMeter(props: { raisedMsats: bigint; goalMsats: bigint; compact?: boolean }) {
  const pct = () => progressPercent(props.raisedMsats, props.goalMsats);
  const width = () => `${Math.min(100, pct())}%`;
  return (
    <div>
      <div class="h-2 w-full overflow-hidden rounded bg-zinc-800">
        <div
          class="meter-flicker relative h-full overflow-hidden rounded bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.55)]"
          style={{ width: width() }}
        >
          <div
            aria-hidden="true"
            class="meter-shine absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
          />
          <span
            aria-hidden="true"
            class="meter-spark absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-yellow-100 shadow-[0_0_6px_2px_rgba(255,255,255,0.9)]"
          />
          <span
            aria-hidden="true"
            class="meter-spark meter-spark-slow absolute top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_3px_rgba(253,224,71,0.9)]"
          />
        </div>
      </div>
      {(props.compact ?? false) === false && (
        <p class="mt-1 text-sm text-zinc-400">
          {formatSats(props.raisedMsats)} / {formatSats(props.goalMsats)} ({pct()}%)
        </p>
      )}
    </div>
  );
}
