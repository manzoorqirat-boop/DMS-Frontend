import { findStage, STAGE_CLASSES } from "@/lib/lifecycle";

/**
 * A document's status, everywhere it's shown after today: the register, filters, later the
 * analytics views. Reads its color from the same LIFECYCLE_STAGES source of truth as the
 * login screen's rail, so the two can never drift into showing different colors for the same
 * status.
 */
export function StatusBadge({ status }: { status: string }) {
  const stage = findStage(status);

  if (!stage) {
    return (
      <span className="inline-flex items-center rounded-full bg-text-tertiary/10 px-2.5 py-0.5 text-xs font-medium text-text-secondary">
        {status}
      </span>
    );
  }

  const classes = STAGE_CLASSES[stage.colorKey];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${classes.bg} ${classes.text}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />
      {stage.label}
    </span>
  );
}
