/**
 * Mirrors Dms.Application.Documents.CollaborationDtos.
 */

export type CommentSeverity = "Blocking" | "Advisory";
export type CommentStatus = "Open" | "Resolved" | "Declined" | "Withdrawn";

/**
 * Local documents apply only at their own site. Global ones are issued centrally for other
 * sites to adopt — verbatim, with no authority to edit.
 */
export type DocumentScope = "Local" | "Global";

export interface AdoptDocumentRequest {
  siteId: string;
  /**
   * When the document takes effect at the adopting site — usually later than the owning site's.
   * That gap is the training window; the backend refuses a date in the past.
   */
  effectiveDate: string;
  note?: string | null;
}

export interface WithdrawAdoptionRequest {
  reason: string;
}

export interface AdoptionView {
  id: string;
  documentId: string;
  documentNumber: string;
  title: string;
  revision: number;
  siteId: string;
  effectiveDate: string;
  adoptedBy: string;
  adoptedAt: string;
  note: string | null;
  isActive: boolean;
  withdrawnBy: string | null;
  withdrawnAt: string | null;
  withdrawalReason: string | null;
}

export interface AddReviewCommentRequest {
  /** Where in the document — "6.3", "Section 4". */
  sectionReference: string;
  /**
   * The text being commented on. Optional, and anchored by quotation rather than position: a
   * positional anchor breaks the moment the paragraph is edited, which is what happens next.
   */
  quotedText?: string | null;
  body: string;
  severity: CommentSeverity;
}

/**
 * `accept: true` resolves the comment (acted on it); false declines it (disagreed, with a
 * reason). Both count as answered and both clear the block — declining is a legitimate outcome,
 * not a loophole.
 */
export interface RespondToCommentRequest {
  accept: boolean;
  response: string;
}

export interface ReviewCommentView {
  id: string;
  documentId: string;
  sectionReference: string;
  quotedText: string | null;
  body: string;
  severity: CommentSeverity;
  status: CommentStatus;
  /** True only for an Open comment of Blocking severity. */
  blocksResubmission: boolean;
  raisedBy: string;
  raisedAt: string;
  response: string | null;
  respondedBy: string | null;
  respondedAt: string | null;
}
