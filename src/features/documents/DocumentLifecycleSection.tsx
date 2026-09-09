import { useState } from "react";
import { AlertTriangle, Ban, CalendarCheck, PauseCircle } from "lucide-react";
import {
  obsoleteDocument,
  recordPeriodicReview,
  reinstateDocument,
  suspendDocument,
} from "@/api/lifecycle";
import { ApiError } from "@/lib/api-client";
import { formatDateOnly } from "@/lib/format";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SignatureDialog } from "@/components/SignatureDialog";
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
  // Also excludes annexures: periodic review and obsolescence belong to the parent, and the
  // backend refuses both directly on an annexure.
  const isParent = document.parentDocumentId === null;
  const isEffective = document.status === "Effective" && isParent;
  const isSuspended = document.status === "Suspended" && isParent;

  // A suspended document still needs these: it can be reviewed, reinstated, or withdrawn.
  // Hiding the section entirely would strand it with no way forward.
  const showSection = isEffective || isSuspended;

  if (!showSection) {
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

      {isSuspended && (
        <div className="mb-3 flex items-start gap-2.5 rounded-[9px] border border-stage-review/40 bg-stage-review/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-900">
          <PauseCircle className="mt-0.5 h-4 w-4 flex-none text-stage-review" aria-hidden="true" />
          <span>
            <strong>This document is suspended — do not work to it.</strong>
            {document.suspensionReason && ` ${document.suspensionReason}`}
            {" "}No new controlled copies can be issued while it is stopped. Copies already
            issued are not recalled automatically — collect them through the retrieval worklist.
          </span>
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

          {/* Suspension is reversible where obsolescence is not, so it sits between the two —
              the middle option in escalating severity. */}
          <button
            type="button"
            onClick={() => {
              setError(null);
              setPending(isSuspended ? "reinstate" : "suspend");
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface"
          >
            <PauseCircle className="h-4 w-4" aria-hidden="true" />
            {isSuspended ? "Reinstate" : "Suspend"}
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

      {/* Not a SignatureDialog: suspension is not one of the configurable signature points, so
          asking for a password here would imply a §11.50 signature that is not being recorded. */}
      <ConfirmDialog
        open={pending === "suspend" || pending === "reinstate"}
        destructive={pending === "suspend"}
        title={pending === "suspend" ? "Suspend this document?" : "Reinstate this document?"}
        description={
          pending === "suspend"
            ? "It stays in force on paper already issued, but no new copies can be issued and nobody should work to it until the investigation concludes."
            : "It returns to effective use with its original effective date — the audit trail carries the gap."
        }
        confirmLabel={pending === "suspend" ? "Suspend" : "Reinstate"}
        reasonLabel={pending === "suspend" ? "Why it is being stopped" : "What the investigation concluded"}
        reasonPlaceholder={
          pending === "suspend"
            ? "Step 6.3 conflicts with the validated cleaning cycle"
            : "Reviewed against the validated cycle; no conflict found"
        }
        onCancel={() => setPending(null)}
        onConfirm={async (reason) => {
          try {
            const updated =
              pending === "suspend"
                ? await suspendDocument(document.id, { reason })
                : await reinstateDocument(document.id, { reason });
            onChanged(updated);
            setPending(null);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "That could not be recorded.");
          }
        }}
      />

      <SignatureDialog
        open={pending === "periodic-review"}
        title="Record a periodic review"
        description={
          <>
            Confirms this document was re-read and is still correct as written. The review clock
            resets from today; the revision number does <strong>not</strong> change. If the
            content actually needs to change, close this and start a revision instead.
          </>
        }
        meaning="I have reviewed this document and it remains correct"
        confirmLabel="Sign and record"
        reasonLabel="Outcome"
        reasonPlaceholder="What the review found"
        onCancel={() => setPending(null)}
        onConfirm={async (password, reason) => {
          try {
            const updated = await recordPeriodicReview(document.id, { outcome: reason, password });
            onChanged(updated);
            setPending(null);
          } catch (err) {
            throw new Error(
              err instanceof ApiError ? err.message : "Could not record that review.",
            );
          }
        }}
      />

      <SignatureDialog
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
        meaning="I am withdrawing this document from use"
        confirmLabel="Sign and withdraw"
        awaitsCountersignature
        reasonLabel="Reason"
        reasonPlaceholder="Why this document is being withdrawn"
        onCancel={() => setPending(null)}
        onConfirm={async (password, reason) => {
          try {
            const updated = await obsoleteDocument(document.id, { reason, password });
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
