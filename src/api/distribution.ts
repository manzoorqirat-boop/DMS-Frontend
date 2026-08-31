import { apiFetch, apiFetchBlob } from "@/lib/api-client";
import { toQueryString, type PagedResult } from "@/types/paging";
import type {
  CloseOutRequest,
  DistributionView,
  IssueCopyRequest,
  PendingRetrievalView,
  PrintEventView,
} from "@/types/distribution";

/** GET /api/documents/{id}/copies */
export function listCopies(documentId: string, signal?: AbortSignal): Promise<DistributionView[]> {
  return apiFetch<DistributionView[]>(`/api/documents/${documentId}/copies`, { signal });
}

/** POST /api/documents/{id}/copies */
export function issueCopy(documentId: string, request: IssueCopyRequest): Promise<DistributionView> {
  return apiFetch<DistributionView>(`/api/documents/${documentId}/copies`, {
    method: "POST",
    body: request,
  });
}

/** POST /api/copies/{id}/acknowledge */
export function acknowledgeCopy(copyId: string): Promise<DistributionView> {
  return apiFetch<DistributionView>(`/api/copies/${copyId}/acknowledge`, { method: "POST" });
}

/** POST /api/copies/{id}/retrieve */
export function retrieveCopy(copyId: string): Promise<DistributionView> {
  return apiFetch<DistributionView>(`/api/copies/${copyId}/retrieve`, { method: "POST" });
}

/** POST /api/copies/{id}/close-out — Destroyed or Lost, both requiring a note. */
export function closeOutCopy(copyId: string, request: CloseOutRequest): Promise<DistributionView> {
  return apiFetch<DistributionView>(`/api/copies/${copyId}/close-out`, {
    method: "POST",
    body: request,
  });
}

/**
 * POST /api/copies/{id}/print
 *
 * Returns the file itself, so this goes through apiFetchBlob rather than apiFetch — and note
 * the backend currently returns it UNWATERMARKED (see PassThroughPrintRenderer), signalling
 * that via the X-Copy-Watermarked response header. The header isn't readable here without the
 * backend adding it to Access-Control-Expose-Headers, so the caller is told plainly in the UI
 * instead rather than being left to assume the file is stamped.
 */
export function printCopy(copyId: string): Promise<Blob> {
  return apiFetchBlob(`/api/copies/${copyId}/print`, undefined, "POST");
}

/** GET /api/documents/{id}/print-history */
export function listPrintHistory(
  documentId: string,
  page?: number,
  pageSize?: number,
  signal?: AbortSignal,
): Promise<PagedResult<PrintEventView>> {
  return apiFetch<PagedResult<PrintEventView>>(
    `/api/documents/${documentId}/print-history${toQueryString({ page, pageSize })}`,
    { signal },
  );
}

/** GET /api/reports/pending-retrieval */
export function listPendingRetrieval(
  params: { siteId?: string; page?: number; pageSize?: number },
  signal?: AbortSignal,
): Promise<PagedResult<PendingRetrievalView>> {
  return apiFetch<PagedResult<PendingRetrievalView>>(
    `/api/reports/pending-retrieval${toQueryString(params)}`,
    { signal },
  );
}
