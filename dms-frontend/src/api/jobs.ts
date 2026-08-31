import { apiFetch } from "@/lib/api-client";
import { toQueryString } from "@/types/paging";
import type { JobRunResult, JobRunView } from "@/types/jobs";

/**
 * GET /api/jobs/runs — evidence the reminder sweep ran, including runs that found nothing.
 *
 * Plain array with a `limit`, not a PagedResult.
 */
export function listJobRuns(
  params: { jobName?: string; limit?: number } = {},
  signal?: AbortSignal,
): Promise<JobRunView[]> {
  return apiFetch<JobRunView[]>(`/api/jobs/runs${toQueryString(params)}`, { signal });
}

/**
 * POST /api/jobs/reminders/run — safe to press repeatedly: the dedupe key means a second run
 * within the same period queues nothing new.
 */
export function runRemindersNow(): Promise<JobRunResult> {
  return apiFetch<JobRunResult>("/api/jobs/reminders/run", { method: "POST" });
}
