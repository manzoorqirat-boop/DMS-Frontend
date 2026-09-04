import { apiFetch, apiFetchBlob } from "@/lib/api-client";
import { toQueryString } from "@/types/paging";
import type { PagedResult } from "@/types/paging";
import type {
  CreateAnnexureRequest,
  CreateDraftRequest,
  DocumentSummary,
  ListDocumentsParams,
  ReviseRequest,
} from "@/types/documents";

/**
 * Reconstructed from usage in DocumentRegisterPage.tsx / DocumentDetailPage.tsx and verified
 * against the backend's DocumentEndpoints.cs (MapDocumentEndpoints). Flagged as best-effort
 * per the same caveat as src/types/documents.ts — check against a live response if anything
 * here looks off.
 */

/** GET /api/documents — the master register, filterable and paginated. */
export function listDocuments(
  params: ListDocumentsParams = {},
  signal?: AbortSignal,
): Promise<PagedResult<DocumentSummary>> {
  return apiFetch<PagedResult<DocumentSummary>>(
    `/api/documents${toQueryString({
      siteId: params.siteId,
      departmentId: params.departmentId,
      documentTypeId: params.documentTypeId,
      search: params.search,
      status: params.status,
      currentRevisionsOnly: params.currentRevisionsOnly,
      page: params.page,
      pageSize: params.pageSize,
    })}`,
    { signal },
  );
}

/** GET /api/documents/{id} */
export function getDocument(id: string, signal?: AbortSignal): Promise<DocumentSummary> {
  return apiFetch<DocumentSummary>(`/api/documents/${id}`, { signal });
}

/** GET /api/documents/{id}/revisions — plain array, not paged (matches ListRevisionsAsync). */
export function listRevisions(id: string, signal?: AbortSignal): Promise<DocumentSummary[]> {
  return apiFetch<DocumentSummary[]>(`/api/documents/${id}/revisions`, { signal });
}

/**
 * POST /api/documents — creates a Draft from the Active template for the given document
 * type. Verified directly against DraftCreationService.CreateDraftAsync (see the failure
 * codes it returns: document_title_required, permission_denied, site_inactive,
 * department_inactive, department_site_mismatch, document_type_inactive, no_active_template,
 * document_title_taken, document_save_conflict — ApiError.message already carries the
 * backend's own text for all of these, so callers can generally just show err.message).
 */
export function createDraft(
  request: CreateDraftRequest,
  signal?: AbortSignal,
): Promise<DocumentSummary> {
  return apiFetch<DocumentSummary>("/api/documents", { method: "POST", body: request, signal });
}

/** POST /api/documents/{id}/withdraw — abandons a Draft. The number stays burned, not reused. */
export function withdrawDocument(id: string): Promise<DocumentSummary> {
  return apiFetch<DocumentSummary>(`/api/documents/${id}/withdraw`, { method: "POST" });
}

/** POST /api/documents/{id}/revise — opens Rev n+1 as a new Draft from the version currently in force. */
export function reviseDocument(id: string, request: ReviseRequest): Promise<DocumentSummary> {
  return apiFetch<DocumentSummary>(`/api/documents/${id}/revise`, { method: "POST", body: request });
}

/**
 * GET /api/documents/{id}/approved-pdf
 *
 * The PDF rendition of an approved document, with the signature manifest as its final page.
 * Built on first request and cached, so the first call after an approval may take a few
 * seconds while the document server converts it.
 */
export function downloadApprovedPdf(documentId: string): Promise<Blob> {
  return apiFetchBlob(`/api/documents/${documentId}/approved-pdf`);
}

/**
 * POST /api/documents/{id}/annexures
 *
 * Only while the parent is a Draft: an annexure added to a document already in force would be
 * new controlled content entering force without passing a signature route, and an annexure is
 * never separately approvable.
 */
export function createAnnexure(
  parentId: string,
  request: CreateAnnexureRequest,
): Promise<DocumentSummary> {
  return apiFetch<DocumentSummary>(`/api/documents/${parentId}/annexures`, {
    method: "POST",
    body: request,
  });
}

/** GET /api/documents/{id}/annexures — in annexure-number order. */
export function listAnnexures(parentId: string, signal?: AbortSignal): Promise<DocumentSummary[]> {
  return apiFetch<DocumentSummary[]>(`/api/documents/${parentId}/annexures`, { signal });
}
