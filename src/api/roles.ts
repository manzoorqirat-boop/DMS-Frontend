import { apiFetch } from "@/lib/api-client";
import { toQueryString } from "@/types/paging";
import type { AssignRoleRequest, AssignmentView, CreateRoleRequest, Permission, RoleView } from "@/types/access";

/** GET /api/roles/permissions — the full grantable set, for rendering the permission matrix. */
export function listAllPermissions(): Promise<{ name: Permission; value: number }[]> {
  return apiFetch<{ name: Permission; value: number }[]>("/api/roles/permissions");
}

/** GET /api/roles */
export function listRoles(includeInactive = false): Promise<RoleView[]> {
  return apiFetch<RoleView[]>(`/api/roles${toQueryString({ includeInactive })}`);
}

/** POST /api/roles */
export function createRole(request: CreateRoleRequest): Promise<RoleView> {
  return apiFetch<RoleView>("/api/roles", { method: "POST", body: request });
}

/** PUT /api/roles/{id}/permissions — body is a bare JSON array, not wrapped in an object. */
export function setRolePermissions(id: string, permissions: Permission[]): Promise<RoleView> {
  return apiFetch<RoleView>(`/api/roles/${id}/permissions`, { method: "PUT", body: permissions });
}

/** POST /api/roles/assignments */
export function assignRole(request: AssignRoleRequest): Promise<AssignmentView> {
  return apiFetch<AssignmentView>("/api/roles/assignments", { method: "POST", body: request });
}

/**
 * GET /api/roles/assignments — this endpoint didn't exist on the backend until this session
 * (only create/revoke did); added alongside this page so assignments can actually be listed.
 */
export function listRoleAssignments(
  params: { userId?: string; roleId?: string } = {},
): Promise<AssignmentView[]> {
  return apiFetch<AssignmentView[]>(
    `/api/roles/assignments${toQueryString({ userId: params.userId, roleId: params.roleId })}`,
  );
}

/** DELETE /api/roles/assignments/{id} */
export function revokeRoleAssignment(id: string): Promise<void> {
  return apiFetch<void>(`/api/roles/assignments/${id}`, { method: "DELETE" });
}
