import { apiFetch } from "@/lib/api-client";
import { toQueryString } from "@/types/paging";
import type { CreateDepartmentRequest, DepartmentSummary } from "@/types/organisation";

/** GET /api/departments */
export function listDepartments(
  siteId?: string,
  includeInactive = false,
): Promise<DepartmentSummary[]> {
  return apiFetch<DepartmentSummary[]>(
    `/api/departments${toQueryString({ siteId, includeInactive })}`,
  );
}

/**
 * POST /api/departments
 *
 * Departments belong to exactly one site — the same code may legitimately exist at two sites
 * (every plant has a QA), so uniqueness is per-site, not global.
 */
export function createDepartment(request: CreateDepartmentRequest): Promise<DepartmentSummary> {
  return apiFetch<DepartmentSummary>("/api/departments", { method: "POST", body: request });
}
