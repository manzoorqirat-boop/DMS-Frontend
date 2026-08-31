import { apiFetch } from "@/lib/api-client";
import { toQueryString } from "@/types/paging";
import type { ChangePasswordRequest, CreateUserRequest, UserSummary } from "@/types/users";

/** GET /api/users */
export function listUsers(includeInactive = false): Promise<UserSummary[]> {
  return apiFetch<UserSummary[]>(`/api/users${toQueryString({ includeInactive })}`);
}

/** POST /api/users */
export function createUser(request: CreateUserRequest): Promise<UserSummary> {
  return apiFetch<UserSummary>("/api/users", { method: "POST", body: request });
}

/** POST /api/users/{id}/deactivate */
export function deactivateUser(id: string): Promise<UserSummary> {
  return apiFetch<UserSummary>(`/api/users/${id}/deactivate`, { method: "POST" });
}

/** POST /api/users/{id}/reactivate */
export function reactivateUser(id: string): Promise<UserSummary> {
  return apiFetch<UserSummary>(`/api/users/${id}/reactivate`, { method: "POST" });
}

/**
 * POST /api/users/me/change-password
 *
 * Self-service only — there is deliberately no administrator reset anywhere in this API. The
 * password is also the e-signature credential, so a password someone else can set would be a
 * credential a second person knows, which is exactly what §11.200's distinct-credential
 * requirement exists to prevent.
 */
export function changeOwnPassword(request: ChangePasswordRequest): Promise<void> {
  return apiFetch<void>("/api/users/me/change-password", { method: "POST", body: request });
}
