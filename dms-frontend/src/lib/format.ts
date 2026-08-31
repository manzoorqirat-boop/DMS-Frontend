/**
 * Turns a PascalCase AuditAction name like "DocumentIntegrityCheckPassed" into
 * "Document integrity check passed" — readable in an audit trail without a hand-maintained
 * label for every one of the ~70 AuditAction values on the backend. A missed label would
 * otherwise mean a raw enum name silently leaking into the UI the next time someone adds an
 * action.
 */
export function humanizeAction(action: string): string {
  const spaced = action.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** DateOnly ("2026-11-30") displayed as-is — it has no timezone, so it shouldn't be parsed as if it did. */
export function formatDateOnly(value: string | null | undefined): string {
  return value ?? "—";
}

/**
 * DateTimeOffset (full ISO instant) formatted for display in the browser's local time. Unlike
 * a DateOnly, this value genuinely has a timezone-aware instant behind it, so localizing it
 * is correct rather than a mistake.
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
