import { Link } from "react-router-dom";
import { LIFECYCLE_STAGES, STAGE_CLASSES } from "@/lib/lifecycle";

export interface StageCount {
  key: string;
  count: number | null;
}

/**
 * The document lifecycle as a live pipeline — each stage showing how many documents are
 * currently sitting in it, and linking to that filtered view of the register.
 *
 * This is the Lifecycle Rail from the sign-in screen made load-bearing: the same six stages in
 * the same six colours, but now carrying real numbers. That continuity is the point — someone
 * who learned the colour language before logging in reads this without being taught anything
 * new, and a stage that is amber here means exactly what amber meant there.
 *
 * Counts come from the server's own filtered totals, not from tallying a fetched page, so they
 * stay correct once the register outgrows a single page.
 */
export function LifecyclePipeline({ counts }: { counts: StageCount[] }) {
  const byKey = new Map(counts.map((c) => [c.key, c.count]));
  const total = counts.reduce((sum, c) => sum + (c.count ?? 0), 0);

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-sm font-semibold text-text-primary">
          Documents by lifecycle stage
        </h2>
        <Link to="/documents" className="text-xs font-medium text-brand hover:underline">
          Open the register →
        </Link>
      </div>

      {/* Proportional bar. Rendered before the cards because the shape of the pipeline — where
          work is piling up — is often the first thing worth noticing. */}
      <div className="mb-5 flex h-2 overflow-hidden rounded-full bg-surface">
        {total === 0 ? (
          <div className="h-full w-full bg-text-tertiary/15" />
        ) : (
          LIFECYCLE_STAGES.map((stage) => {
            const count = byKey.get(stage.key) ?? 0;
            if (count === 0) return null;
            return (
              <div
                key={stage.key}
                className={STAGE_CLASSES[stage.colorKey].dot}
                style={{ width: `${(count / total) * 100}%` }}
                title={`${stage.label}: ${count}`}
              />
            );
          })
        )}
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {LIFECYCLE_STAGES.map((stage) => {
          const classes = STAGE_CLASSES[stage.colorKey];
          const count = byKey.get(stage.key);

          return (
            <li key={stage.key}>
              <Link
                to={`/documents?status=${stage.key}&currentRevisionsOnly=false`}
                className="group block rounded-lg border border-border p-3 transition-colors hover:border-brand/40 hover:bg-surface"
              >
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className={`h-2 w-2 flex-none rounded-full ${classes.dot}`} />
                  <span className="truncate text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                    {stage.label}
                  </span>
                </span>
                <span className={`mt-1.5 block font-display text-2xl font-semibold ${classes.text}`}>
                  {count === null ? "—" : count}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
