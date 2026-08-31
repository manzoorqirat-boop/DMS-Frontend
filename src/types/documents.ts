/**
 * Mirrors Dms.Application.Documents.DocumentDtos.DocumentSummary and
 * Dms.Domain.Enums.DocumentStatus / DispositionAction.
 * <p>
 * <b>Best-effort reconstruction, not a verified copy.</b> This DTO was extended several times
 * over the backend's build (revision-cycle fields, then review/retention fields), and this
 * file was hand-written without the actual source open next to it. Field <i>names</i> should
 * be right — camelCase JSON is ASP.NET Core's default — but treat this as provisional until
 * checked against the real response, ideally by generating from `/swagger/v1/swagger.json`
 * once the backend is running (see `npm run generate:api` and the README).
 */

/** Every value DocumentStatus can hold. `Withdrawn` is a rare terminal state for an abandoned
 *  draft — deliberately not part of the six-stage LIFECYCLE_STAGES rail, but still a real
 *  status StatusBadge must render (it falls back to a plain gray chip for anything not in
 *  the rail's six, which already covers this correctly). */
export type DocumentStatus =
  | "Draft"
  | "InReview"
  | "Approved"
  | "Effective"
  | "Superseded"
  | "Obsolete"
  | "Withdrawn";

export type DispositionAction = "DestroyContent" | "RetainPermanently";

export interface DocumentSummary {
  id: string;
  documentNumber: string;
  title: string;
  siteId: string;
  departmentId: string;
  documentTypeId: string;
  templateId: string;
  revision: number;
  revisionLabel: string;
  familyId: string;
  isCurrentRevision: boolean;
  status: DocumentStatus;
  isEditable: boolean;
  author: string;
  effectiveDate: string | null;
  nextReviewDate: string | null;
  obsoleteReason: string | null;
  retainUntil: string | null;
  disposition: DispositionAction | null;
  isContentDestroyed: boolean;
  createdAt: string;
}

/**
 * Query params GET /api/documents actually accepts.
 * <p>
 * Notably absent: a `status` filter. The backend endpoint filters by site, department,
 * document type, a free-text search on number/title, and whether to show only current
 * revisions — nothing lets the server filter by DocumentStatus. Don't build a client-side
 * "status filter" against a single page of results; it would silently misbehave under
 * pagination (fewer rows shown than the page size, or a filtered view that misses matching
 * rows sitting on other pages). This is a real backend gap, not a frontend omission — see the
 * README.
 */
export interface ListDocumentsParams {
  siteId?: string;
  departmentId?: string;
  documentTypeId?: string;
  search?: string;
  /**
   * Filtered server-side. Counting statuses in a fetched page would be wrong the moment the
   * register outgrows one page — it would report whatever landed on that page rather than the
   * real total.
   */
  status?: DocumentStatus;
  currentRevisionsOnly?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * POST /api/documents body. Verified directly against the backend's
 * `CreateDraftRequest` record and `DraftCreationService.CreateDraftAsync` — not a
 * reconstruction like the rest of this file. No `templateId`: the server always resolves the
 * one Active template for the chosen document type itself (`ITemplateRepository.GetActiveAsync`)
 * and fails with `no_active_template` if none exists.
 */
export interface CreateDraftRequest {
  siteId: string;
  departmentId: string;
  documentTypeId: string;
  title: string;
}

/** POST /api/documents/{id}/revise body. Verified against DocumentEndpoints.cs's ReviseRequest record. */
export interface ReviseRequest {
  reason: string;
}
