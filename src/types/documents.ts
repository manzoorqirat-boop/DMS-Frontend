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

  /**
   * The SOP this annexure belongs to, or null for a document that stands on its own.
   *
   * An annexure is a controlled document in its own right — own number, own file, own
   * controlled copies — but it is never separately approvable. It is signed, issued and
   * withdrawn as part of its parent's lifecycle, so the UI must not offer lifecycle actions on
   * one; the backend refuses them regardless.
   */
  parentDocumentId: string | null;

  /** Position among its parent's annexures (1, 2, 3), driving the number suffix and print order. */
  annexureNumber: number | null;
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
 * Query params GET /api/documents accepts. Every one of these is applied server-side.
 * <p>
 * `status` was genuinely absent for a while, and the register deliberately shipped without a
 * status filter rather than faking one client-side — filtering a single fetched page would
 * misbehave the moment the register outgrew one page, showing fewer rows than the page size
 * and missing matching rows sitting on other pages. The backend now filters by status
 * properly, which is what allows both the register's filter and the dashboard's per-stage
 * counts to be trustworthy.
 */
export interface ListDocumentsParams {
  siteId?: string;
  departmentId?: string;
  documentTypeId?: string;
  search?: string;
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


/**
 * Body of POST /api/documents/{id}/annexures.
 *
 * No site, department or parent — all three come from the parent document. An annexure that
 * could belong to a different site than the SOP it serves would be incoherent.
 */
export interface CreateAnnexureRequest {
  title: string;
  /** The annexure's own type — usually a form or record type, not the parent's SOP type. */
  documentTypeId: string;
}
