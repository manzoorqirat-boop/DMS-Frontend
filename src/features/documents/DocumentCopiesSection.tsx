import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Copy, Loader2, Printer } from "lucide-react";
import {
  acknowledgeCopy,
  closeOutCopy,
  issueCopy,
  listCopies,
  printCopy,
  retrieveCopy,
} from "@/api/distribution";
import { downloadBlob } from "@/api/exports";
import { ApiError } from "@/lib/api-client";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { CopyType, DistributionStatus, DistributionView } from "@/types/distribution";

const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint";

const COPY_TYPES: CopyType[] = ["Controlled", "Uncontrolled", "External"];

type PendingAction =
  | { kind: "retrieve"; copy: DistributionView }
  | { kind: "close-out"; copy: DistributionView; outcome: DistributionStatus };

/**
 * Controlled-copy distribution for one document.
 *
 * Only rendered for an Effective document: the backend refuses to distribute anything else,
 * because putting a draft or a not-yet-in-force version into someone's hands is the
 * distribution failure that actually causes harm on a shop floor.
 */
export function DocumentCopiesSection({
  documentId,
  canDistribute,
}: {
  documentId: string;
  canDistribute: boolean;
}) {
  const { departments } = useOrganisationData();

  const [copies, setCopies] = useState<DistributionView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [copyType, setCopyType] = useState<CopyType>("Controlled");
  const [issuedToName, setIssuedToName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [printLimit, setPrintLimit] = useState("1");
  const [isIssuing, setIsIssuing] = useState(false);

  function refresh() {
    setIsLoading(true);
    listCopies(documentId)
      .then(setCopies)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Could not load issued copies."),
      )
      .finally(() => setIsLoading(false));
  }

  useEffect(refresh, [documentId]);

  async function handleIssue(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!issuedToName.trim()) {
      setError("Say who this copy is being issued to.");
      return;
    }

    // Mirrors the backend's own rule rather than waiting for its 400: only an uncontrolled
    // copy may be unlimited, because a controlled copy that can be reprinted without limit
    // isn't controlled in any meaningful sense.
    const limit = printLimit.trim() === "" ? null : Number(printLimit);
    if (copyType !== "Uncontrolled" && (limit === null || Number.isNaN(limit) || limit < 1)) {
      setError(`A ${copyType} copy needs a print limit of at least 1.`);
      return;
    }

    setIsIssuing(true);
    try {
      await issueCopy(documentId, {
        copyType,
        issuedToDepartmentId: departmentId || null,
        issuedToName: issuedToName.trim(),
        printLimit: copyType === "Uncontrolled" ? (limit ?? null) : limit,
      });
      setIssuedToName("");
      setDepartmentId("");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not issue that copy.");
    } finally {
      setIsIssuing(false);
    }
  }

  async function handlePrint(copy: DistributionView) {
    setPendingId(copy.id);
    setError(null);
    setNotice(null);
    try {
      const blob = await printCopy(copy.id);
      downloadBlob(blob, `${copy.scanCode.replace(/\//g, "_")}.docx`);
      // Said plainly rather than left to be discovered: the backend's only renderer is
      // PassThroughPrintRenderer, which returns the file unstamped.
      setNotice(
        "Downloaded. Note the backend has no watermark renderer configured yet, so this file " +
          "is NOT stamped — treat it as uncontrolled until that is in place.",
      );
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not print that copy.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleAcknowledge(copy: DistributionView) {
    setPendingId(copy.id);
    try {
      await acknowledgeCopy(copy.id);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not acknowledge that copy.");
    } finally {
      setPendingId(null);
    }
  }

  const columns: DataTableColumn<DistributionView>[] = [
    { key: "copyNumber", header: "#", className: "font-mono", render: (c) => c.copyNumber },
    { key: "copyType", header: "Type", render: (c) => c.copyType },
    { key: "issuedTo", header: "Issued to", render: (c) => c.issuedToName },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            c.status === "Lost"
              ? "bg-danger-tint text-[#9c332f]"
              : c.isOutstanding
                ? "bg-stage-review/10 text-stage-review"
                : "bg-stage-effective/10 text-stage-effective"
          }`}
        >
          {c.status}
        </span>
      ),
    },
    {
      key: "prints",
      header: "Prints",
      className: "font-mono text-xs",
      render: (c) => `${c.printCount}${c.printLimit === null ? "" : ` / ${c.printLimit}`}`,
    },
    { key: "scanCode", header: "Scan code", className: "font-mono text-[11px]", render: (c) => c.scanCode },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex justify-end gap-1.5">
          {pendingId === c.id && <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />}
          {c.isOutstanding && (c.printLimit === null || c.printCount < c.printLimit) && (
            <button
              type="button"
              onClick={() => handlePrint(c)}
              disabled={pendingId === c.id}
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Print
            </button>
          )}
          {c.status === "Issued" && (
            <button
              type="button"
              onClick={() => handleAcknowledge(c)}
              disabled={pendingId === c.id}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface disabled:opacity-50"
            >
              Acknowledge
            </button>
          )}
          {c.isOutstanding && (
            <>
              <button
                type="button"
                onClick={() => setPending({ kind: "retrieve", copy: c })}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
              >
                Retrieve
              </button>
              <button
                type="button"
                onClick={() => setPending({ kind: "close-out", copy: c, outcome: "Lost" })}
                className="rounded-md border border-danger/30 px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger-tint"
              >
                Lost
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="mb-10">
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
        <Copy className="h-4 w-4" aria-hidden="true" />
        Issued copies
      </h2>

      {error && (
        <div role="alert" className="mb-3 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] text-[#9c332f]">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="mb-3 rounded-[9px] border border-stage-review/30 bg-stage-review/10 px-3.5 py-2.5 text-[13px] text-ink-900">
          {notice}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={copies}
        getRowKey={(c) => c.id}
        isLoading={isLoading}
        skeletonRowCount={2}
        emptyState={
          <EmptyState
            icon={Copy}
            title="No copies issued"
            description="Controlled copies issued for this document will be listed here."
          />
        }
      />

      {canDistribute && (
        <form onSubmit={handleIssue} className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
          <h3 className="mb-1 font-display text-sm font-semibold text-text-primary">Issue a copy</h3>
          <p className="mb-3 text-xs text-text-secondary">
            Any annexures are issued at the same time, each with its own copy number and scan
            code — a procedure without its record forms is an incomplete issue.
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-xs font-semibold text-text-primary">
              Type
              <select
                value={copyType}
                onChange={(e) => setCopyType(e.target.value as CopyType)}
                className={`mt-1 ${inputClasses}`}
              >
                {COPY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-text-primary sm:col-span-2">
              Issued to
              <input
                value={issuedToName}
                onChange={(e) => setIssuedToName(e.target.value)}
                placeholder="Production Floor 2, or a person's name"
                className={`mt-1 ${inputClasses}`}
              />
            </label>

            <label className="text-xs font-semibold text-text-primary">
              Print limit
              <input
                type="number"
                min={1}
                value={printLimit}
                onChange={(e) => setPrintLimit(e.target.value)}
                placeholder={copyType === "Uncontrolled" ? "unlimited" : "1"}
                className={`mt-1 ${inputClasses}`}
              />
            </label>

            <label className="text-xs font-semibold text-text-primary sm:col-span-2">
              Department (optional)
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={`mt-1 ${inputClasses}`}
              >
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={isIssuing}
            className="mt-3 flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {isIssuing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Issue copy
          </button>
        </form>
      )}

      <ConfirmDialog
        open={pending !== null}
        destructive={pending?.kind === "close-out"}
        title={
          pending?.kind === "retrieve"
            ? `Record copy #${pending.copy.copyNumber} as collected?`
            : pending
              ? `Record copy #${pending.copy.copyNumber} as lost?`
              : ""
        }
        description={
          pending?.kind === "retrieve"
            ? "The copy has been physically collected and is out of circulation."
            : "An unaccounted controlled copy is a finding, and is recorded as one."
        }
        confirmLabel="Record"
        reasonLabel={pending?.kind === "close-out" ? "Note" : undefined}
        reasonPlaceholder="What happened to this copy"
        onCancel={() => setPending(null)}
        onConfirm={async (reason) => {
          if (!pending) return;
          if (pending.kind === "retrieve") {
            await retrieveCopy(pending.copy.id);
          } else {
            await closeOutCopy(pending.copy.id, { outcome: pending.outcome, note: reason });
          }
          setPending(null);
          refresh();
        }}
      />
    </section>
  );
}
