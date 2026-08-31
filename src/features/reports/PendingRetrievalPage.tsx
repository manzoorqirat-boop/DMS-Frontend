import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PackageCheck } from "lucide-react";
import { listPendingRetrieval, closeOutCopy, retrieveCopy } from "@/api/distribution";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PaginationBar } from "@/components/PaginationBar";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/StatusBadge";
import type { PagedResult } from "@/types/paging";
import type { DistributionStatus, PendingRetrievalView } from "@/types/distribution";

type PendingAction =
  | { kind: "retrieve"; row: PendingRetrievalView }
  | { kind: "close-out"; row: PendingRetrievalView; outcome: DistributionStatus };

/**
 * Controlled copies still in circulation for documents that are no longer current — the list
 * someone works through after a supersession.
 *
 * Derived live from document status on the backend rather than a flag maintained per copy, so
 * it can never show stale state after a document is superseded.
 */
export function PendingRetrievalPage() {
  const navigate = useNavigate();
  const { sites } = useOrganisationData();

  const [siteId, setSiteId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [result, setResult] = useState<PagedResult<PendingRetrievalView> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [pending, setPending] = useState<PendingAction | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listPendingRetrieval({ siteId: siteId || undefined, page, pageSize }, controller.signal)
      .then(setResult)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Could not load the retrieval worklist.");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [siteId, page, pageSize, refreshToken]);

  const columns: DataTableColumn<PendingRetrievalView>[] = [
    { key: "documentNumber", header: "Document", className: "font-mono", render: (r) => r.documentNumber },
    { key: "title", header: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
    {
      key: "documentStatus",
      header: "Doc status",
      render: (r) => <StatusBadge status={r.documentStatus} />,
    },
    {
      key: "copy",
      header: "Copy",
      className: "font-mono text-xs",
      render: (r) => `#${r.copyNumber} · ${r.copyType}`,
    },
    { key: "issuedTo", header: "Held by", render: (r) => r.issuedToName },
    {
      key: "issuedAt",
      header: "Issued",
      className: "text-xs",
      render: (r) => formatDateTime(r.issuedAt),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPending({ kind: "retrieve", row: r });
            }}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
          >
            Collected
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPending({ kind: "close-out", row: r, outcome: "Destroyed" });
            }}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
          >
            Destroyed
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPending({ kind: "close-out", row: r, outcome: "Lost" });
            }}
            className="rounded-md border border-danger/30 px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger-tint"
          >
            Lost
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Copies to retrieve"
        description="Controlled copies still held for documents that are superseded or obsolete. Every copy needs an outcome — collected, destroyed on site, or recorded as lost."
      />

      <div className="mb-4">
        <select
          value={siteId}
          onChange={(e) => {
            setSiteId(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary"
        >
          <option value="">All sites</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-danger/25 bg-danger-tint px-4 py-3 text-sm text-[#9c332f]">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={result?.items ?? []}
        getRowKey={(r) => r.distributionId}
        isLoading={isLoading}
        onRowClick={(r) => navigate(`/documents/${r.documentId}`)}
        emptyState={
          <EmptyState
            icon={PackageCheck}
            title="Nothing outstanding"
            description="Every controlled copy of a superseded or obsolete document has been accounted for."
          />
        }
      />

      {!isLoading && (
        <PaginationBar
          result={result}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      <ConfirmDialog
        open={pending !== null}
        destructive={pending?.kind === "close-out" && pending.outcome === "Lost"}
        title={
          pending?.kind === "retrieve"
            ? `Record copy #${pending.row.copyNumber} as collected?`
            : pending
              ? `Record copy #${pending.row.copyNumber} as ${pending.outcome.toLowerCase()}?`
              : ""
        }
        description={
          pending?.kind === "retrieve"
            ? "The copy has been physically collected and is out of circulation."
            : pending?.outcome === "Lost"
              ? "An unaccounted controlled copy is a finding, and is recorded as one — deliberately distinct from a copy destroyed on site."
              : "The copy was destroyed on site rather than returned."
        }
        confirmLabel="Record"
        reasonLabel={pending?.kind === "close-out" ? "Note" : undefined}
        reasonPlaceholder="What happened to this copy"
        onCancel={() => setPending(null)}
        onConfirm={async (reason) => {
          if (!pending) return;
          if (pending.kind === "retrieve") {
            await retrieveCopy(pending.row.distributionId);
          } else {
            await closeOutCopy(pending.row.distributionId, {
              outcome: pending.outcome,
              note: reason,
            });
          }
          setPending(null);
          setRefreshToken((t) => t + 1);
        }}
      />
    </div>
  );
}
