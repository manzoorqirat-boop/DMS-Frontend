import { apiFetch } from "@/lib/api-client";
import type { DocumentSummary } from "@/types/documents";
import type {
  AddReviewCommentRequest,
  AdoptDocumentRequest,
  AdoptionView,
  RespondToCommentRequest,
  ReviewCommentView,
  WithdrawAdoptionRequest,
} from "@/types/collaboration";

/* -------------------------------------------------------------------------- adoption */

/** POST /api/documents/{id}/adoptions — a site accepts a global document. */
export function adoptDocument(
  documentId: string,
  request: AdoptDocumentRequest,
): Promise<AdoptionView> {
  return apiFetch<AdoptionView>(`/api/documents/${documentId}/adoptions`, {
    method: "POST",
    body: request,
  });
}

/**
 * GET /api/documents/{id}/adoptions
 *
 * Includes withdrawn adoptions. "This site followed it from March to September" is exactly the
 * kind of thing an inspector asks about.
 */
export function listAdoptions(documentId: string, signal?: AbortSignal): Promise<AdoptionView[]> {
  return apiFetch<AdoptionView[]>(`/api/documents/${documentId}/adoptions`, { signal });
}

/** POST /api/adoptions/{id}/withdraw */
export function withdrawAdoption(
  adoptionId: string,
  request: WithdrawAdoptionRequest,
): Promise<AdoptionView> {
  return apiFetch<AdoptionView>(`/api/adoptions/${adoptionId}/withdraw`, {
    method: "POST",
    body: request,
  });
}

/** GET /api/adoptions/adoptable/{siteId} — global documents this site could adopt but hasn't. */
export function listAdoptable(siteId: string, signal?: AbortSignal): Promise<DocumentSummary[]> {
  return apiFetch<DocumentSummary[]>(`/api/adoptions/adoptable/${siteId}`, { signal });
}

/* ---------------------------------------------------------------------- draft review */

/** POST /api/documents/{id}/draft-review/start — reviewers may edit and comment. */
export function startDraftReview(documentId: string): Promise<DocumentSummary> {
  return apiFetch<DocumentSummary>(`/api/documents/${documentId}/draft-review/start`, {
    method: "POST",
  });
}

/** POST /api/documents/{id}/draft-review/close — back to Draft for the author to finish. */
export function closeDraftReview(documentId: string): Promise<DocumentSummary> {
  return apiFetch<DocumentSummary>(`/api/documents/${documentId}/draft-review/close`, {
    method: "POST",
  });
}

/* -------------------------------------------------------------------------- comments */

export function listComments(
  documentId: string,
  signal?: AbortSignal,
): Promise<ReviewCommentView[]> {
  return apiFetch<ReviewCommentView[]>(`/api/documents/${documentId}/comments`, { signal });
}

export function addComment(
  documentId: string,
  request: AddReviewCommentRequest,
): Promise<ReviewCommentView> {
  return apiFetch<ReviewCommentView>(`/api/documents/${documentId}/comments`, {
    method: "POST",
    body: request,
  });
}

/** POST /api/comments/{id}/respond — resolve or decline. */
export function respondToComment(
  commentId: string,
  request: RespondToCommentRequest,
): Promise<ReviewCommentView> {
  return apiFetch<ReviewCommentView>(`/api/comments/${commentId}/respond`, {
    method: "POST",
    body: request,
  });
}

/** POST /api/comments/{id}/withdraw — reviewer only; the backend enforces that. */
export function withdrawComment(commentId: string): Promise<ReviewCommentView> {
  return apiFetch<ReviewCommentView>(`/api/comments/${commentId}/withdraw`, { method: "POST" });
}

/** POST /api/comments/{id}/reopen — the reviewer isn't satisfied with the response. */
export function reopenComment(commentId: string): Promise<ReviewCommentView> {
  return apiFetch<ReviewCommentView>(`/api/comments/${commentId}/reopen`, { method: "POST" });
}
