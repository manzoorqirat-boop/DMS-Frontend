import { apiFetchBlob } from "@/lib/api-client";
import { toQueryString } from "@/types/paging";

/**
 * CSV exports. Both return a file, so both go through apiFetchBlob — and both are capped at
 * 10,000 rows server-side, which is worth surfacing in the UI rather than letting someone
 * assume a truncated export is complete.
 */

/** GET /api/exports/master-list */
export function exportMasterList(params: {
  siteId?: string;
  departmentId?: string;
  documentTypeId?: string;
  currentRevisionsOnly?: boolean;
}): Promise<Blob> {
  return apiFetchBlob(`/api/exports/master-list${toQueryString(params)}`);
}

/** GET /api/exports/audit */
export function exportAuditTrail(params: {
  entityId?: string;
  entityType?: string;
  actor?: string;
  from?: string;
  to?: string;
}): Promise<Blob> {
  return apiFetchBlob(`/api/exports/audit${toQueryString(params)}`);
}

/**
 * Triggers a browser download for a Blob the API returned. Revokes the object URL afterwards —
 * without that, every export leaks the whole file into memory for the life of the tab.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
