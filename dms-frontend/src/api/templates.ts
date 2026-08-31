import { apiFetch, apiFetchBlob } from "@/lib/api-client";
import { toQueryString } from "@/types/paging";
import type { PagedResult } from "@/types/paging";
import type { ListTemplatesParams, TemplateSummary } from "@/types/templates";

/** GET /api/templates */
export function listTemplates(
  params: ListTemplatesParams = {},
  signal?: AbortSignal,
): Promise<PagedResult<TemplateSummary>> {
  return apiFetch<PagedResult<TemplateSummary>>(
    `/api/templates${toQueryString({
      documentTypeId: params.documentTypeId,
      page: params.page,
      pageSize: params.pageSize,
    })}`,
    { signal },
  );
}

/**
 * POST /api/templates — multipart/form-data with fields documentTypeId, name, file (see
 * TemplateEndpoints.cs; it reads the raw request form rather than a bound DTO, so this must
 * be FormData, not JSON). Returns 201 even when structural validation fails — the caller
 * reads `status`/`validationIssues` on the result to see whether it's activatable.
 */
export function registerTemplate(
  documentTypeId: string,
  name: string,
  file: File,
): Promise<TemplateSummary> {
  const form = new FormData();
  form.set("documentTypeId", documentTypeId);
  form.set("name", name);
  form.set("file", file);
  return apiFetch<TemplateSummary>("/api/templates", { method: "POST", body: form });
}

/** POST /api/templates/{id}/activate — idempotent; activating an already-Active template is a no-op success. */
export function activateTemplate(id: string): Promise<TemplateSummary> {
  return apiFetch<TemplateSummary>(`/api/templates/${id}/activate`, { method: "POST" });
}

/** POST /api/templates/{id}/retire — idempotent; retiring an already-Retired template is a no-op success. */
export function retireTemplate(id: string): Promise<TemplateSummary> {
  return apiFetch<TemplateSummary>(`/api/templates/${id}/retire`, { method: "POST" });
}

/** GET /api/templates/{id}/file — the raw .docx, for an admin to inspect a failed validation. */
export function downloadTemplateFile(id: string): Promise<Blob> {
  return apiFetchBlob(`/api/templates/${id}/file`);
}
