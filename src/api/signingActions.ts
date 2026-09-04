import { apiFetch } from "@/lib/api-client";
import type {
  CountersignRequest,
  PendingActionView,
  SignaturePointView,
  UpdateSignaturePolicyRequest,
} from "@/types/signing-actions";

/**
 * GET /api/pending-actions — everything awaiting a countersignature, oldest first.
 *
 * Deliberately not filtered to what the caller can personally countersign: seeing that
 * something is waiting on a colleague is useful, and the countersign call refuses on permission
 * anyway. Filtering would hide the queue's real depth.
 */
export function listPendingActions(signal?: AbortSignal): Promise<PendingActionView[]> {
  return apiFetch<PendingActionView[]>("/api/pending-actions", { signal });
}

/** POST /api/pending-actions/{id}/countersign */
export function countersign(
  id: string,
  request: CountersignRequest,
): Promise<PendingActionView> {
  return apiFetch<PendingActionView>(`/api/pending-actions/${id}/countersign`, {
    method: "POST",
    body: request,
  });
}

/**
 * GET /api/signature-policy
 *
 * Open to any authenticated caller so a screen can warn that a password will be needed before
 * someone starts filling in a form, rather than after.
 */
export function getSignaturePolicy(signal?: AbortSignal): Promise<SignaturePointView[]> {
  return apiFetch<SignaturePointView[]>("/api/signature-policy", { signal });
}

/** PUT /api/signature-policy — requires UserManage at organisation scope. */
export function updateSignaturePolicy(
  request: UpdateSignaturePolicyRequest,
): Promise<SignaturePointView[]> {
  return apiFetch<SignaturePointView[]>("/api/signature-policy", {
    method: "PUT",
    body: request,
  });
}
