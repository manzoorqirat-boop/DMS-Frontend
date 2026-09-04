import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive } from "lucide-react";
import { listDispositionDue, recordDisposition } from "@/api/lifecycle";
import { ApiError } from "@/lib/api-client";
import { formatDateOnly } from "@/lib/format";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PaginationBar } from "@/components/PaginationBar";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { SignatureDialog } from "@/components/SignatureDialog";
import type { PagedResult } from "@/types/paging";
import type { DispositionAction, DispositionDueView } from "@/types/lifecycle";

/**
 * Records whose retention period has expired and which await a decision.
 *
 * Nothing on this screen happens automatically, and that is the whole point — expiry makes a
 * record *eligible* for disposition; a person decides. Destroying a controlled record on a
 * timer would be indefensible the first time someone asked who authorised it.
 */
export function DispositionDuePage() {
  const navigate = useNavigate();
  const { sites } = useOrganisationData();

  const [siteId, setSiteId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [result, setResult] = useState<PagedResult<DispositionDueView> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [pending, setPending] = useState<{ row: DispositionDueView; action: DispositionAction } | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listDispositionDue({ siteId: siteId || undefined, page, pageSize }, controller.signal)
      .then(setResult)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Could not load the disposition worklist.");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [siteId, page, pageSize, refreshToken]);

  const columns: DataTableColumn<DispositionDueView>[] = [
    { key: "documentNumber", header: "Document", className: "font-mono", render: (r) => r.documentNumber },
    { key: "title", header: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
    { key: "status", header: "Status", render: (r) => r.status },
    {
      key: "retainUntil",
      header: "Retained until",
      className: "font-mono text-xs",
      render: (r) => formatDateOnly(r.retainUntil),
    },
    {
      key: "daysOverdue",
      header: "Awaiting",
      render: (r) => (
        <span className="text-text-secondary">
          {r.daysOverdue} day{r.daysOverdue === 1 ? "" : "s"}
        </span>
      ),
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
              setPending({ row: r, action: "RetainPermanently" });
            }}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
          >
            Retain
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPending({ row: r, action: "DestroyContent" });
            }}
            className="rounded-md border border-danger/30 px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger-tint"
          >
            Destroy
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Disposition due"
        description="Records whose retention has expired. Nothing is destroyed automatically — each decision is recorded against the person who made it."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
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
        getRowKey={(r) => r.documentId}
        isLoading={isLoading}
        onRowClick={(r) => navigate(`/documents/${r.documentId}`)}
        emptyState={
          <EmptyState
            icon={Archive}
            title="Nothing awaiting disposition"
            description="No records have passed their retention period without a decision."
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

      <SignatureDialog
        open={pending !== null}
        destructive={pending?.action === "DestroyContent"}
        title={
          pending?.action === "DestroyContent"
            ? `Destroy the stored file for ${pending.row.documentNumber}?`
            : `Retain ${pending?.row.documentNumber} permanently?`
        }
        description={
          pending?.action === "DestroyContent" ? (
            <>
              The stored file is deleted. The register row, its signatures and its audit trail
              are <strong>kept</strong> — a retention period permits destroying the document,
              not the evidence it existed and was approved. This cannot be undone.
            </>
          ) : (
            "The record is kept indefinitely and leaves this worklist. Use this for records that outlive any retention schedule."
          )
        }
        confirmLabel="Sign and record"
        meaning={
          pending?.action === "DestroyContent"
            ? "I am authorising the destruction of this record"
            : "I am authorising permanent retention of this record"
        }
        awaitsCountersignature
        reasonLabel="Rationale"
        reasonPlaceholder="Why this decision was taken"
        onCancel={() => setPending(null)}
        onConfirm={async (password, reason) => {
          if (!pending) return;
          await recordDisposition(pending.row.documentId, {
            action: pending.action,
            note: reason,
            password,
          });
          setPending(null);
          setRefreshToken((t) => t + 1);
        }}
      />
    </div>
  );
}
