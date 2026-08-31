import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileX2, Plus, Search } from "lucide-react";
import { listDocuments } from "@/api/documents";
import { ApiError } from "@/lib/api-client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { formatDateOnly } from "@/lib/format";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PaginationBar } from "@/components/PaginationBar";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import type { PagedResult } from "@/types/paging";
import { LIFECYCLE_STAGES } from "@/lib/lifecycle";
import type { DocumentStatus, DocumentSummary } from "@/types/documents";

const DEFAULT_PAGE_SIZE = 50;

export function DocumentRegisterPage() {
  const navigate = useNavigate();
  const { documentTypes } = useOrganisationData();

  // Read from the URL so the dashboard's per-stage links land on a filtered register, and so
  // a filtered view is shareable and survives a refresh. The URL is the source of truth for
  // these two rather than component state, which would silently discard the incoming link.
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get("status") ?? "") as DocumentStatus | "";
  const currentRevisionsOnly = searchParams.get("currentRevisionsOnly") !== "false";

  function setStatus(next: string) {
    const params = new URLSearchParams(searchParams);
    if (next) {
      params.set("status", next);
    } else {
      params.delete("status");
    }
    setSearchParams(params, { replace: true });
    setPage(1);
  }

  function setCurrentRevisionsOnly(next: boolean) {
    const params = new URLSearchParams(searchParams);
    // Only written when false — "current revisions only" is the default, and a URL carrying
    // the default value is noise in something people copy and share.
    if (next) {
      params.delete("currentRevisionsOnly");
    } else {
      params.set("currentRevisionsOnly", "false");
    }
    setSearchParams(params, { replace: true });
    setPage(1);
  }

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [documentTypeId, setDocumentTypeId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [result, setResult] = useState<PagedResult<DocumentSummary> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listDocuments(
      {
        search: debouncedSearch || undefined,
        documentTypeId: documentTypeId || undefined,
        currentRevisionsOnly,
        status: status || undefined,
        page,
        pageSize,
      },
      controller.signal,
    )
      .then((data) => setResult(data))
      .catch((err: unknown) => {
        // An aborted request is this effect's own cleanup firing, not a real failure — the
        // component either unmounted or a newer request superseded this one. Nothing to show.
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setError(err instanceof ApiError ? err.message : "Could not load the document register.");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [debouncedSearch, documentTypeId, currentRevisionsOnly, status, page, pageSize]);

  function resetToFirstPage() {
    setPage(1);
  }

  const hasActiveFilters = searchInput !== "" || documentTypeId !== "" || status !== "";

  const columns: DataTableColumn<DocumentSummary>[] = [
    {
      key: "documentNumber",
      header: "Document number",
      className: "font-mono",
      render: (row) => row.documentNumber,
    },
    {
      key: "title",
      header: "Title",
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: "revision",
      header: "Rev",
      className: "font-mono",
      render: (row) => row.revisionLabel,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "effectiveDate",
      header: "Effective",
      className: "font-mono text-xs",
      render: (row) => formatDateOnly(row.effectiveDate),
    },
    {
      key: "nextReviewDate",
      header: "Next review",
      className: "font-mono text-xs",
      render: (row) => (
        <span className={reviewDateClassName(row.nextReviewDate)}>
          {formatDateOnly(row.nextReviewDate)}
        </span>
      ),
    },
    {
      key: "author",
      header: "Author",
      render: (row) => row.author,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">Documents</h1>
          <p className="mt-1 text-sm text-text-secondary">
            The master register — one row per document, showing the revision in force.
          </p>
        </div>

        <Link
          to="/documents/new"
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New document
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              resetToFirstPage();
            }}
            placeholder="Search by number or title…"
            className="w-full rounded-lg border border-border bg-surface-raised py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint"
          />
        </div>

        <select
          value={documentTypeId}
          onChange={(e) => {
            setDocumentTypeId(e.target.value);
            resetToFirstPage();
          }}
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary"
        >
          <option value="">All document types</option>
          {documentTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.code} — {type.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary"
        >
          <option value="">All statuses</option>
          {LIFECYCLE_STAGES.map((stage) => (
            <option key={stage.key} value={stage.key}>
              {stage.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={currentRevisionsOnly}
            onChange={(e) => setCurrentRevisionsOnly(e.target.checked)}
            className="h-4 w-4 rounded border-border text-brand focus:ring-brand-tint"
          />
          Current revisions only
        </label>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-danger/25 bg-danger-tint px-4 py-3 text-sm text-[#9c332f]">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={result?.items ?? []}
        getRowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/documents/${row.id}`)}
        isLoading={isLoading}
        skeletonRowCount={pageSize > 8 ? 8 : pageSize}
        emptyState={
          <EmptyState
            icon={FileX2}
            title={hasActiveFilters ? "No documents match" : "No documents yet"}
            description={
              hasActiveFilters
                ? "Nothing in the register matches this search and filter combination."
                : "Documents created in DMS will appear here."
            }
            action={
              hasActiveFilters
                ? {
                    label: "Clear filters",
                    onClick: () => {
                      setSearchInput("");
                      setDocumentTypeId("");
                      setStatus("");
                      resetToFirstPage();
                    },
                  }
                : undefined
            }
          />
        }
      />

      {!isLoading && <PaginationBar result={result} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); resetToFirstPage(); }} />}
    </div>
  );
}

/** Amber inside 30 days of the review date, red once past it — the same color logic the
 *  backend's review-due report itself would apply, kept simple here since there's no
 *  dedicated review-due screen yet to own this properly. */
function reviewDateClassName(value: string | null): string {
  if (!value) {
    return "text-text-tertiary";
  }

  const daysUntil = Math.floor((new Date(value).getTime() - Date.now()) / 86_400_000);

  if (daysUntil < 0) {
    return "text-danger font-medium";
  }
  if (daysUntil <= 30) {
    return "text-stage-review font-medium";
  }
  return "text-text-secondary";
}
