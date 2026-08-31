import { LIFECYCLE_STAGES, STAGE_CLASSES } from "@/lib/lifecycle";

/**
 * The six real stages a document moves through, shown as a connected sequence. This is the
 * one piece of deliberate visual boldness in the whole app — see the design note in
 * LoginPage.tsx for why a real, typed sequence earns a sequence treatment where a decorative
 * one wouldn't.
 */
export function LifecycleRail() {
  return (
    <div className="relative pl-1">
      <div
        aria-hidden="true"
        className="absolute left-[15px] top-4 bottom-4 w-0.5 rounded-full opacity-90 origin-top animate-drawline bg-[linear-gradient(to_bottom,#7c6fe0,#f0a83c,#12a594,#1fa971,#5b7a9d,#d65f4c)]"
      />

      <ol className="relative">
        {LIFECYCLE_STAGES.map((stage, index) => {
          const classes = STAGE_CLASSES[stage.colorKey];
          return (
            <li
              key={stage.key}
              className="flex items-start gap-4 py-3 opacity-0 animate-rise"
              style={{ animationDelay: `${0.3 + index * 0.1}s` }}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 h-3.5 w-3.5 flex-none rounded-full ${classes.dot} ring-4 ring-ink-950`}
              />
              <div>
                <div
                  className={`font-display text-[14.5px] font-semibold tracking-tight ${
                    stage.colorKey === "effective" ? classes.text : "text-white/90"
                  }`}
                >
                  {stage.label}
                </div>
                <div className="mt-0.5 text-[12.5px] leading-snug text-white/50">
                  {stage.description}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * A compact horizontal readout of the same sequence, for narrow viewports where the full rail
 * (with its descriptions) would crowd out the form — the form is the priority on mobile, not
 * the explainer.
 */
export function LifecycleRailCompact() {
  return (
    <ol className="flex items-center justify-between gap-1">
      {LIFECYCLE_STAGES.map((stage) => {
        const classes = STAGE_CLASSES[stage.colorKey];
        return (
          <li key={stage.key} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${classes.dot}`} />
            <span className="font-display text-[10px] font-medium text-white/80">
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
