import { apiFetch } from "@/lib/api-client";
import { toQueryString } from "@/types/paging";
import type { CreateDocumentTypeRequest, DocumentTypeSummary } from "@/types/document-types";

export function listDocumentTypes(includeInactive = false): Promise<DocumentTypeSummary[]> {
  return apiFetch<DocumentTypeSummary[]>(
    `/api/document-types${toQueryString({ includeInactive })}`,
  );
}

/** POST /api/document-types */
export function createDocumentType(
  request: CreateDocumentTypeRequest,
): Promise<DocumentTypeSummary> {
  return apiFetch<DocumentTypeSummary>("/api/document-types", { method: "POST", body: request });
}

/** POST /api/document-types/{id}/deactivate */
export function deactivateDocumentType(id: string): Promise<DocumentTypeSummary> {
  return apiFetch<DocumentTypeSummary>(`/api/document-types/${id}/deactivate`, { method: "POST" });
}

/** POST /api/document-types/{id}/reactivate */
export function reactivateDocumentType(id: string): Promise<DocumentTypeSummary> {
  return apiFetch<DocumentTypeSummary>(`/api/document-types/${id}/reactivate`, { method: "POST" });
}
