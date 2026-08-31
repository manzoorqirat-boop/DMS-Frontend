/**
 * Mirrors the projection in Dms.Api.Endpoints.NotificationEndpoints (jobs group) and
 * Dms.Application.Notifications.JobRunSummary.
 */

export type JobRunStatus = "Succeeded" | "CompletedWithErrors" | "Failed";

export interface JobRunView {
  id: string;
  jobName: string;
  trigger: string;
  startedAt: string;
  completedAt: string | null;
  status: JobRunStatus;
  itemsProcessed: number;
  detail: string | null;
}

/** Response of POST /api/jobs/reminders/run. */
export interface JobRunResult {
  jobName: string;
  startedAt: string;
  completedAt: string | null;
  status: JobRunStatus;
  queued: number;
  sent: number;
  failed: number;
  detail: string | null;
}
