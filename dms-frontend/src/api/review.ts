import { apiFetch } from "@/lib/api-client";
import type {
  DocumentIssueView,
  PendingSignatureView,
  RouteTemplateView,
  RouteView,
  SignRequest,
  SubmitForReviewRequest,
} from "@/types/review";

/** GET /api/documents/{id}/route-template — the route a document will follow, with eligible signers per step. */
export function getRouteTemplate(documentId: string): Promise<RouteTemplateView> {
  return apiFetch<RouteTemplateView>(`/api/documents/${documentId}/route-template`);
}

/** POST /api/documents/{id}/submit — locks the draft and starts its route. */
export function submitForReview(
  documentId: string,
  request: SubmitForReviewRequest,
): Promise<RouteView> {
  return apiFetch<RouteView>(`/api/documents/${documentId}/submit`, { method: "POST", body: request });
}

/** GET /api/documents/{id}/route — the route with whatever signatures are already applied. */
export function getRoute(documentId: string): Promise<RouteView> {
  return apiFetch<RouteView>(`/api/documents/${documentId}/route`);
}

/** POST /api/documents/{id}/sign — re-authenticates with the password; not the same as being logged in. */
export function signDocument(documentId: string, request: SignRequest): Promise<RouteView["steps"][number]["signature"]> {
  return apiFetch(`/api/documents/${documentId}/sign`, { method: "POST", body: request });
}

/** GET /api/documents/me/pending-signatures — the caller's own actionable signing queue. */
export function getMyPendingSignatures(): Promise<PendingSignatureView[]> {
  return apiFetch<PendingSignatureView[]>("/api/documents/me/pending-signatures");
}

/** POST /api/documents/{id}/effective — brings an Approved document into force. effectiveDate is a plain "YYYY-MM-DD" string (DateOnly). */
export function makeEffective(documentId: string, effectiveDate: string): Promise<DocumentIssueView> {
  return apiFetch<DocumentIssueView>(`/api/documents/${documentId}/effective`, {
    method: "POST",
    body: { effectiveDate },
  });
}
