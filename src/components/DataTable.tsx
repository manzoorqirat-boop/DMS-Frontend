import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Applied to both the header and body cells — e.g. `font-mono` for a document-number column. */
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  isLoading: boolean;
  /** Rendered in place of the table body when `rows` is empty and loading has finished. */
  emptyState: ReactNode;
  onRowClick?: (row: T) => void;
  /** How many skeleton rows to show while loading. Matches the page size by default. */
  skeletonRowCount?: number;
}

/**
 * Deliberately not virtualized or infinitely-scrolling — every list this renders is already
 * server-paged at a sane size (200 rows max), so the complexity of a virtualized table would
 * be solving a problem this app doesn't have.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  isLoading,
  emptyState,
  onRowClick,
  skeletonRowCount = 8,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5">
                    <div className="h-4 w-[70%] animate-pulse rounded bg-text-tertiary/10" />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading &&
            rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-border last:border-0 ${
                  onRowClick ? "cursor-pointer hover:bg-surface" : ""
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3.5 text-text-primary ${col.className ?? ""}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>

      {!isLoading && rows.length === 0 && emptyState}
    </div>
  );
}
