import { useState } from "react";
import { AlertTriangle, CalendarCheck, Ban } from "lucide-react";
import { obsoleteDocument, recordPeriodicReview } from "@/api/lifecycle";
import { ApiError } from "@/lib/api-client";
import { formatDateOnly } from "@/lib/format";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { DocumentSummary } from "@/types/documents";

type PendingAction = "periodic-review" | "obsolete";

/**
 * Periodic review and obsolescence — the two lifecycle acts that apply to a document already
 * in force, as opposed to the draft/review/approve path handled elsewhere on the detail page.
 *
 * Both are deliberately separate from "revise": a periodic review records that the document
 * was re-read and found still correct, which resets its review clock without producing a new
 * revision. Conflating the two would make "we checked it" indistinguishable from "we changed
 * it" in the register, and those are very different claims to an inspector.
 */
export function DocumentLifecycleSection({
  document,
  onChanged,
}: {
  document: DocumentSummary;
  onChanged: (updated: DocumentSummary) => void;
}) {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only an in-force document can be periodically reviewed or withdrawn. A draft is
  // withdrawn instead (handled on the detail page), and a superseded revision has already
  // been replaced, so neither action applies.
  const isEffective = document.status === "Effective";

  if (!isEffective) {
    return null;
  }

  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-sm font-semibold text-text-primary">Lifecycle</h2>

      {error && (
        <div role="alert" className="mb-3 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] text-[#9c332f]">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface-raised p-4">
        <p className="mb-3 text-sm text-text-secondary">
          {document.nextReviewDate
            ? `Next review due ${formatDateOnly(document.nextReviewDate)}.`
            : "No review date is set — check that a review policy covers this document type."}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setPending("periodic-review");
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface"
          >
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            Record periodic review
          </button>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setPending("obsolete");
            }}
            className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-3.5 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-tint"
          >
            <Ban className="h-4 w-4" aria-hidden="true" />
            Make obsolete
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={pending === "periodic-review"}
        title="Record a periodic review"
        description={
          <>
            Confirms this document was re-read and is still correct as written. The review clock
            resets from today; the revision number does <strong>not</strong> change. If the
            content actually needs to change, close this and start a revision instead.
          </>
        }
        confirmLabel="Record review"
        reasonLabel="Outcome"
        reasonPlaceholder="What the review found"
        onCancel={() => setPending(null)}
        onConfirm={async (reason) => {
          try {
            const updated = await recordPeriodicReview(document.id, { outcome: reason });
            onChanged(updated);
            setPending(null);
          } catch (err) {
            throw new Error(
              err instanceof ApiError ? err.message : "Could not record that review.",
            );
          }
        }}
      />

      <ConfirmDialog
        open={pending === "obsolete"}
        destructive
        title={`Make ${document.documentNumber} obsolete?`}
        description={
          <>
            The document is withdrawn from use and stops being the version to follow. This is
            terminal — an obsolete document cannot be brought back into force, only replaced by
            a new one. Any controlled copies still in circulation will appear on the retrieval
            worklist.
          </>
        }
        confirmLabel="Make obsolete"
        reasonLabel="Reason"
        reasonPlaceholder="Why this document is being withdrawn"
        onCancel={() => setPending(null)}
        onConfirm={async (reason) => {
          try {
            const updated = await obsoleteDocument(document.id, { reason });
            onChanged(updated);
            setPending(null);
          } catch (err) {
            throw new Error(
              err instanceof ApiError ? err.message : "Could not make that document obsolete.",
            );
          }
        }}
      />
    </section>
  );
}
