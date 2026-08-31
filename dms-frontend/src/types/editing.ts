/**
 * Mirrors Dms.Application.Editing.EditingDtos.
 */

export type EditingSessionStatus = "Active" | "Released" | "Expired" | "TakenOver";

/**
 * Everything needed to mount the editor.
 *
 * Deliberately NOT OnlyOffice's own config object — the backend returns its own shape and the
 * frontend assembles the vendor payload, so swapping document servers wouldn't change this
 * contract. Keep that boundary: don't leak OnlyOffice-specific fields back into the API type.
 */
export interface EditorLaunchView {
  sessionId: string;
  documentId: string;
  documentNumber: string;
  title: string;
  /** Passed to the editor as `document.key`. Changes whenever the content changes. */
  sessionKey: string;
  documentServerUrl: string;
  /** Signed, expiring URL the DOCUMENT SERVER fetches the .docx from — not the browser. */
  fileUrl: string;
  /** Signed, expiring URL the document server POSTs save notifications to. */
  callbackUrl: string;
  editorUserName: string;
  expiresAt: string;
}

export interface EditingSessionView {
  id: string;
  documentId: string;
  userName: string;
  status: EditingSessionStatus;
  startedAt: string;
  expiresAt: string;
  closedAt: string | null;
  closedBy: string | null;
  saveCount: number;
}

/**
 * Read-only counterpart of EditorLaunchView, from POST /api/documents/{id}/view.
 *
 * No callbackUrl and no sessionId by design: viewing takes no check-out and can never write
 * back. Several people may read the same document simultaneously without blocking each other
 * or the author's edit lock.
 */
export interface ViewerLaunchView {
  documentId: string;
  documentNumber: string;
  title: string;
  revision: string;
  documentKey: string;
  documentServerUrl: string;
  fileUrl: string;
  viewerUserName: string;
}
