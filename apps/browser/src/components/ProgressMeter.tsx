import { formatSats, meterWidthPercent, progressPercent } from "backr-utils";

export default function ProgressMeter(props: { raisedMsats: bigint; goalMsats: bigint; compact?: boolean }) {
  const pct = () => progressPercent(props.raisedMsats, props.goalMsats);
  const width = () => `${meterWidthPercent(props.raisedMsats, props.goalMsats)}%`;
  return (
    <div>
      <div class="relative">
        <div class="h-2 w-full overflow-hidden rounded bg-zinc-800">
          <div class="meter-energy relative h-full" style={{ width: width() }}>
            <div class="absolute inset-0 overflow-hidden rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.55)]">
              <div
                aria-hidden="true"
                class="meter-decor meter-shine absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
              />
              <span
                aria-hidden="true"
                class="meter-decor meter-spark absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-yellow-100 shadow-[0_0_6px_2px_rgba(255,255,255,0.9)]"
              />
              <span
                aria-hidden="true"
                class="meter-decor meter-spark meter-spark-slow absolute top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_3px_rgba(253,224,71,0.9)]"
              />
            </div>
          </div>
        </div>
        {props.raisedMsats > 0n && (
          <div
            aria-hidden="true"
            class="meter-decor pointer-events-none absolute top-1/2 h-0 w-0"
            style={{ left: `calc(${width()} - 2px)` }}
          >
            <span class="meter-crackle-a absolute top-0 -mt-[3px] h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_6px_2px_rgba(251,191,36,1)]" />
            <span class="meter-crackle-b absolute top-0 -mt-[2px] h-1 w-1 rounded-full bg-white shadow-[0_0_6px_2px_rgba(255,255,255,1)]" />
            <span class="meter-crackle-c absolute top-0 -mt-[3px] h-1.5 w-1.5 rounded-full bg-yellow-300 shadow-[0_0_6px_2px_rgba(253,224,71,1)]" />
            <span class="meter-crackle-d absolute top-0 -mt-[2px] h-1 w-1 rounded-full bg-amber-100 shadow-[0_0_6px_2px_rgba(254,243,199,1)]" />
          </div>
        )}
      </div>
      {(props.compact ?? false) === false && (
        <p class="mt-1 text-sm text-zinc-400">
          {formatSats(props.raisedMsats)} / {formatSats(props.goalMsats)} ({pct()}%)
        </p>
      )}
    </div>
  );
}
