import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Red confirm button and a warning icon. Use for anything irreversible. */
  destructive?: boolean;
  /**
   * When set, the dialog collects a free-text reason and passes it to onConfirm. Several
   * backend actions (obsolete, close-out, disposition, revise) *require* one and will reject
   * the request without it, so this is a real input rather than a courtesy.
   */
  reasonLabel?: string;
  reasonPlaceholder?: string;
  onConfirm: (reason: string) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * The confirmation primitive this app was missing. Every irreversible action in DMS — with-
 * drawing a draft, obsoleting a document, destroying a retained record, writing off a lost
 * controlled copy — routes through here rather than firing straight off a button click.
 *
 * Deliberately not a generic modal system: it does one job, so the reason field, the pending
 * state and the destructive styling can all be handled properly in one place instead of being
 * reinvented per screen.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  reasonLabel,
  reasonPlaceholder,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset on open so a previous attempt's text or error never bleeds into the next one.
  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
      setIsPending(false);
    }
  }, [open]);

  // Escape closes, matching what every other dialog on the web does. Not wired while a
  // request is in flight — cancelling mid-submit would leave the caller unsure whether the
  // action went through.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onCancel();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, isPending, onCancel]);

  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleConfirm() {
    if (reasonLabel && !reason.trim()) {
      setError("A reason is required.");
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "That action could not be completed.");
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-xl border border-border bg-surface-raised p-6 shadow-xl outline-none"
      >
        <div className="flex items-start gap-3">
          {destructive && (
            <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-danger-tint">
              <AlertTriangle className="h-4 w-4 text-danger" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="font-display text-base font-semibold text-text-primary"
            >
              {title}
            </h2>
            <div className="mt-1.5 text-sm leading-relaxed text-text-secondary">{description}</div>
          </div>
        </div>

        {reasonLabel && (
          <div className="mt-4">
            <label htmlFor={reasonId} className="mb-1.5 block text-[13px] font-semibold text-text-primary">
              {reasonLabel}
            </label>
            <textarea
              id={reasonId}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              className="w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-[13px] text-[#9c332f]">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              destructive ? "bg-danger hover:bg-[#b93a3a]" : "bg-brand hover:bg-brand-hover"
            }`}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
