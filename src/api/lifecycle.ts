import { apiFetch } from "@/lib/api-client";
import { toQueryString, type PagedResult } from "@/types/paging";
import type {
  CreateRetentionPolicyRequest,
  CreateReviewPolicyRequest,
  DispositionDueView,
  ObsoleteRequest,
  PeriodicReviewRequest,
  RecordDispositionRequest,
  RetentionPolicyView,
  ReviewDueView,
  ReviewPolicyView,
  UpdateRetentionPolicyRequest,
  UpdateReviewPolicyRequest,
} from "@/types/lifecycle";
import type { DocumentSummary } from "@/types/documents";

/* -------------------------------------------------------------- document lifecycle actions */

/** POST /api/documents/{id}/periodic-review — records a review that found no change needed. */
export function recordPeriodicReview(
  documentId: string,
  request: PeriodicReviewRequest,
): Promise<DocumentSummary> {
  return apiFetch<DocumentSummary>(`/api/documents/${documentId}/periodic-review`, {
    method: "POST",
    body: request,
  });
}

/** POST /api/documents/{id}/obsolete — withdraws from use. Terminal; reason required. */
export function obsoleteDocument(
  documentId: string,
  request: ObsoleteRequest,
): Promise<DocumentSummary> {
  return apiFetch<DocumentSummary>(`/api/documents/${documentId}/obsolete`, {
    method: "POST",
    body: request,
  });
}

/** POST /api/documents/{id}/disposition — only after retention has expired. */
export function recordDisposition(
  documentId: string,
  request: RecordDispositionRequest,
): Promise<DocumentSummary> {
  return apiFetch<DocumentSummary>(`/api/documents/${documentId}/disposition`, {
    method: "POST",
    body: request,
  });
}

/* ------------------------------------------------------------------------------- worklists */

/** GET /api/reports/review-due */
export function listReviewDue(
  params: {
    withinDays?: number;
    siteId?: string;
    departmentId?: string;
    page?: number;
    pageSize?: number;
  },
  signal?: AbortSignal,
): Promise<PagedResult<ReviewDueView>> {
  return apiFetch<PagedResult<ReviewDueView>>(
    `/api/reports/review-due${toQueryString(params)}`,
    { signal },
  );
}

/** GET /api/reports/disposition-due */
export function listDispositionDue(
  params: { siteId?: string; page?: number; pageSize?: number },
  signal?: AbortSignal,
): Promise<PagedResult<DispositionDueView>> {
  return apiFetch<PagedResult<DispositionDueView>>(
    `/api/reports/disposition-due${toQueryString(params)}`,
    { signal },
  );
}

/* -------------------------------------------------------------------------------- policies */

/** GET /api/review-policies */
export function listReviewPolicies(documentTypeId?: string): Promise<ReviewPolicyView[]> {
  return apiFetch<ReviewPolicyView[]>(`/api/review-policies${toQueryString({ documentTypeId })}`);
}

/** POST /api/review-policies */
export function createReviewPolicy(request: CreateReviewPolicyRequest): Promise<ReviewPolicyView> {
  return apiFetch<ReviewPolicyView>("/api/review-policies", { method: "POST", body: request });
}

/** PUT /api/review-policies/{id} */
export function updateReviewPolicy(
  id: string,
  request: UpdateReviewPolicyRequest,
): Promise<ReviewPolicyView> {
  return apiFetch<ReviewPolicyView>(`/api/review-policies/${id}`, { method: "PUT", body: request });
}

/** GET /api/retention-policies */
export function listRetentionPolicies(documentTypeId?: string): Promise<RetentionPolicyView[]> {
  return apiFetch<RetentionPolicyView[]>(
    `/api/retention-policies${toQueryString({ documentTypeId })}`,
  );
}

/** POST /api/retention-policies */
export function createRetentionPolicy(
  request: CreateRetentionPolicyRequest,
): Promise<RetentionPolicyView> {
  return apiFetch<RetentionPolicyView>("/api/retention-policies", {
    method: "POST",
    body: request,
  });
}

/** PUT /api/retention-policies/{id} */
export function updateRetentionPolicy(
  id: string,
  request: UpdateRetentionPolicyRequest,
): Promise<RetentionPolicyView> {
  return apiFetch<RetentionPolicyView>(`/api/retention-policies/${id}`, {
    method: "PUT",
    body: request,
  });
}
