import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PagedResult } from "@/types/paging";

interface PaginationBarProps<T> {
  result: PagedResult<T> | null;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

/**
 * Reads page/pageSize/totalCount/hasNextPage straight from the backend's own paging envelope
 * (Dms.Application.Common.PagedResult) — no client-side recomputation of "how many pages are
 * there," since the server already answered that.
 */
export function PaginationBar<T>({ result, onPageChange, onPageSizeChange }: PaginationBarProps<T>) {
  if (!result || result.totalCount === 0) {
    return null;
  }

  const firstRow = (result.page - 1) * result.pageSize + 1;
  const lastRow = Math.min(result.page * result.pageSize, result.totalCount);

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-text-secondary">
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-medium text-text-primary">{firstRow}–{lastRow}</span> of{" "}
          <span className="font-medium text-text-primary">{result.totalCount}</span>
        </span>

        {/* Omitted entirely rather than rendered-but-inert when the caller has a fixed page
            size by design (the document detail page's audit section, for instance) — a
            dropdown that does nothing when changed is worse than no dropdown. */}
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5">
            <span className="sr-only">Rows per page</span>
            <select
              value={result.pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-border bg-surface-raised px-2 py-1 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={result.page <= 1}
          onClick={() => onPageChange(result.page - 1)}
          className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </button>

        <span className="px-2 font-mono text-xs text-text-tertiary">
          {result.page} / {result.totalPages}
        </span>

        <button
          type="button"
          disabled={!result.hasNextPage}
          onClick={() => onPageChange(result.page + 1)}
          className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
