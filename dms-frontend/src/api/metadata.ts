import { apiFetch } from "@/lib/api-client";
import { toQueryString } from "@/types/paging";
import type {
  CreateMetadataFieldRequest,
  MetadataFieldView,
  MetadataSource,
  UpdateMetadataFieldRequest,
} from "@/types/metadata";

/** GET /api/metadata-fields/sources — the live list of values a field can bind to. */
export function listMetadataSources(): Promise<MetadataSource[]> {
  return apiFetch<MetadataSource[]>("/api/metadata-fields/sources");
}

/**
 * GET /api/metadata-fields?documentTypeId=...
 *
 * Returns the type's configured fields, or the built-in default set when it has none — so what
 * comes back is always what will actually be written into a document, configured or not.
 */
export function listMetadataFields(documentTypeId: string): Promise<MetadataFieldView[]> {
  return apiFetch<MetadataFieldView[]>(`/api/metadata-fields${toQueryString({ documentTypeId })}`);
}

/** POST /api/metadata-fields */
export function createMetadataField(
  request: CreateMetadataFieldRequest,
): Promise<MetadataFieldView> {
  return apiFetch<MetadataFieldView>("/api/metadata-fields", { method: "POST", body: request });
}

/** PUT /api/metadata-fields/{id} — the tag itself is deliberately not editable. */
export function updateMetadataField(
  id: string,
  request: UpdateMetadataFieldRequest,
): Promise<MetadataFieldView> {
  return apiFetch<MetadataFieldView>(`/api/metadata-fields/${id}`, { method: "PUT", body: request });
}

/** DELETE /api/metadata-fields/{id} */
export function deleteMetadataField(id: string): Promise<void> {
  return apiFetch<void>(`/api/metadata-fields/${id}`, { method: "DELETE" });
}
