import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck } from "lucide-react";
import { listReviewDue } from "@/api/lifecycle";
import { ApiError } from "@/lib/api-client";
import { formatDateOnly, formatDateTime } from "@/lib/format";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PaginationBar } from "@/components/PaginationBar";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import type { PagedResult } from "@/types/paging";
import type { ReviewDueView } from "@/types/lifecycle";

const WINDOW_OPTIONS = [30, 60, 90, 180, 365];

/**
 * Documents approaching or past their periodic review date.
 *
 * Anything already overdue is included regardless of the look-ahead window and sorts to the
 * top — the backend does that ordering, and this screen deliberately doesn't re-sort it.
 */
export function ReviewDuePage() {
  const navigate = useNavigate();
  const { sites } = useOrganisationData();

  const [withinDays, setWithinDays] = useState(90);
  const [siteId, setSiteId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [result, setResult] = useState<PagedResult<ReviewDueView> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listReviewDue(
      { withinDays, siteId: siteId || undefined, page, pageSize },
      controller.signal,
    )
      .then(setResult)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Could not load the review worklist.");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [withinDays, siteId, page, pageSize]);

  const columns: DataTableColumn<ReviewDueView>[] = [
    {
      key: "documentNumber",
      header: "Document",
      className: "font-mono",
      render: (row) => row.documentNumber,
    },
    { key: "title", header: "Title", render: (row) => <span className="font-medium">{row.title}</span> },
    {
      key: "nextReviewDate",
      header: "Due",
      className: "font-mono text-xs",
      render: (row) => formatDateOnly(row.nextReviewDate),
    },
    {
      key: "daysUntilDue",
      header: "Status",
      render: (row) =>
        row.isOverdue ? (
          <span className="inline-flex items-center rounded-full bg-danger-tint px-2.5 py-0.5 text-xs font-medium text-[#9c332f]">
            {Math.abs(row.daysUntilDue)} day{Math.abs(row.daysUntilDue) === 1 ? "" : "s"} overdue
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-stage-review/10 px-2.5 py-0.5 text-xs font-medium text-stage-review">
            due in {row.daysUntilDue}
          </span>
        ),
    },
    {
      key: "lastReviewed",
      header: "Last reviewed",
      className: "text-xs",
      render: (row) =>
        row.lastReviewedAt ? (
          <span>
            {formatDateTime(row.lastReviewedAt)}
            <span className="block text-text-tertiary">by {row.lastReviewedBy}</span>
          </span>
        ) : (
          <span className="text-text-tertiary">Never</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reviews due"
        description="Documents approaching or past their periodic review date. Nothing expires automatically — a document stays effective until someone reviews or revises it."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          Look ahead
          <select
            value={withinDays}
            onChange={(e) => {
              setWithinDays(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary"
          >
            {WINDOW_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {days} days
              </option>
            ))}
          </select>
        </label>

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
        getRowKey={(row) => row.documentId}
        isLoading={isLoading}
        onRowClick={(row) => navigate(`/documents/${row.documentId}`)}
        emptyState={
          <EmptyState
            icon={CalendarCheck}
            title="Nothing due"
            description={`No documents are due for review in the next ${withinDays} days.`}
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
    </div>
  );
}
