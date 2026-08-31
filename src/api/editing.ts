import { apiFetch } from "@/lib/api-client";
import type { EditingSessionView, EditorLaunchView, ViewerLaunchView } from "@/types/editing";

/**
 * POST /api/documents/{id}/edit
 *
 * Checks the document out and returns what the browser needs to mount the editor. Re-entrant
 * for whoever already holds the lock — losing a browser tab shouldn't cost you your own
 * check-out.
 *
 * Expect `document_checked_out` (409) when someone else holds it, `document_not_editable`
 * when the document isn't a Draft, and `editor_not_configured` when no document server is set
 * up. All three are normal outcomes worth showing plainly, not failures to bury in a toast.
 */
export function startEditingSession(documentId: string): Promise<EditorLaunchView> {
  return apiFetch<EditorLaunchView>(`/api/documents/${documentId}/edit`, { method: "POST" });
}

/** POST /api/documents/{id}/edit/release — gives up the check-out. */
export function releaseEditingSession(documentId: string, note?: string): Promise<EditingSessionView> {
  return apiFetch<EditingSessionView>(`/api/documents/${documentId}/edit/release`, {
    method: "POST",
    body: { note: note ?? null },
  });
}

/** GET /api/documents/{id}/edit/sessions — check-out history for the document. */
export function listEditingSessions(
  documentId: string,
  signal?: AbortSignal,
): Promise<EditingSessionView[]> {
  return apiFetch<EditingSessionView[]>(`/api/documents/${documentId}/edit/sessions`, { signal });
}

/**
 * POST /api/documents/{id}/view — opens a document read-only.
 *
 * Works at any status, unlike startEditingSession: a reviewer reads documents that are
 * deliberately not editable. Requires DocumentView rather than DocumentEdit, so a reviewer who
 * may sign but not author can still read what they're signing.
 */
export function startViewSession(documentId: string): Promise<ViewerLaunchView> {
  return apiFetch<ViewerLaunchView>(`/api/documents/${documentId}/view`, { method: "POST" });
}
