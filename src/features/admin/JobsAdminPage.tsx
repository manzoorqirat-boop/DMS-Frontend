import { useEffect, useState } from "react";
import { AlertTriangle, History, Loader2, Play } from "lucide-react";
import { listJobRuns, runRemindersNow } from "@/api/jobs";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import type { JobRunResult, JobRunView } from "@/types/jobs";

/**
 * Evidence the reminder sweep is actually running.
 *
 * Every run is recorded, including ones that found nothing to do — an empty run and a run that
 * never happened look identical from the outside otherwise, and only one of those is a
 * problem. That distinction is the reason this screen exists at all.
 */
export function JobsAdminPage() {
  const [runs, setRuns] = useState<JobRunView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<JobRunResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listJobRuns({ limit: 50 }, controller.signal)
      .then(setRuns)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Could not load job history.");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [refreshToken]);

  async function handleRunNow() {
    setIsRunning(true);
    setError(null);
    setLastResult(null);
    try {
      setLastResult(await runRemindersNow());
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not run the sweep.");
    } finally {
      setIsRunning(false);
    }
  }

  const columns: DataTableColumn<JobRunView>[] = [
    { key: "jobName", header: "Job", className: "font-mono text-xs", render: (r) => r.jobName },
    { key: "trigger", header: "Trigger", render: (r) => r.trigger },
    {
      key: "startedAt",
      header: "Started",
      className: "font-mono text-xs whitespace-nowrap",
      render: (r) => formatDateTime(r.startedAt),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            r.status === "Succeeded"
              ? "bg-stage-effective/10 text-stage-effective"
              : r.status === "CompletedWithErrors"
                ? "bg-stage-review/10 text-stage-review"
                : "bg-danger-tint text-[#9c332f]"
          }`}
        >
          {r.status}
        </span>
      ),
    },
    { key: "items", header: "Items", className: "font-mono text-xs", render: (r) => r.itemsProcessed },
    {
      key: "detail",
      header: "Detail",
      render: (r) => <span className="text-text-secondary">{r.detail ?? "—"}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Scheduled jobs"
        description="The nightly reminder sweep and its history. Running it by hand is safe — the dedupe window means a second run within the same period queues nothing new."
        actions={
          <button
            type="button"
            onClick={handleRunNow}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            Run now
          </button>
        }
      />

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] text-[#9c332f]">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {lastResult && (
        <div className="mb-4 rounded-lg border border-brand/30 bg-brand-tint px-4 py-3 text-sm text-ink-900">
          Sweep finished: <strong>{lastResult.queued}</strong> queued,{" "}
          <strong>{lastResult.sent}</strong> sent, <strong>{lastResult.failed}</strong> failed.
          {lastResult.detail && <span className="block text-text-secondary">{lastResult.detail}</span>}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={runs}
        getRowKey={(r) => r.id}
        isLoading={isLoading}
        skeletonRowCount={5}
        emptyState={
          <EmptyState
            icon={History}
            title="No runs recorded"
            description="The scheduler may be disabled (Scheduler__Enabled). Use Run now to trigger a sweep by hand."
          />
        }
      />
    </div>
  );
}
