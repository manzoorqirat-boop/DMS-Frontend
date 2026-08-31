import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Eye, PenLine } from "lucide-react";
import { getMyPendingSignatures } from "@/api/review";
import { ApiError } from "@/lib/api-client";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { formatDateTime } from "@/lib/format";
import type { PendingSignatureView } from "@/types/review";

export function MyPendingSignaturesPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingSignatureView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    getMyPendingSignatures()
      .then(setPending)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Could not load your pending signatures.");
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  const columns: DataTableColumn<PendingSignatureView>[] = [
    { key: "documentNumber", header: "Document", className: "font-mono", render: (p) => p.documentNumber },
    { key: "title", header: "Title", render: (p) => p.title },
    { key: "step", header: "Step", render: (p) => `${p.stepOrder}. ${p.stepLabel} (${p.role})` },
    {
      key: "submittedAt",
      header: "Submitted",
      className: "font-mono text-xs",
      render: (p) => (p.submittedAt ? formatDateTime(p.submittedAt) : "—"),
    },
    {
      key: "actions",
      header: "",
      // Read before signing. Offered directly from this list because this is where a reviewer
      // starts, and a signature applied to content the signatory never opened carries the same
      // regulatory weight while attesting to nothing.
      render: (p) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/documents/${p.documentId}/view`);
            }}
            className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Read
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1.5 font-display text-2xl font-semibold text-text-primary">My pending signatures</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Steps you can act on right now — not steps waiting behind an earlier one on the same route.
      </p>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] leading-snug text-[#9c332f]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={pending}
        getRowKey={(p) => `${p.documentId}-${p.stepOrder}`}
        isLoading={isLoading}
        skeletonRowCount={3}
        onRowClick={(p) => navigate(`/documents/${p.documentId}`)}
        emptyState={
          <EmptyState icon={PenLine} title="Nothing waiting on you" description="Documents routed to you for review or approval will show up here." />
        }
      />
    </div>
  );
}
