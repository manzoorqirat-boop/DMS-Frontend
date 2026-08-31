/**
 * Mirrors Dms.Application.Documents.DocumentDtos.SiteSummary and DepartmentSummary.
 * Master data — not paged, same reasoning as DocumentTypeSummary.
 */
export interface SiteSummary {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface DepartmentSummary {
  id: string;
  siteId: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

/** Body of POST /api/sites. */
export interface CreateSiteRequest {
  code: string;
  name: string;
}

/** Body of POST /api/departments. */
export interface CreateDepartmentRequest {
  siteId: string;
  code: string;
  name: string;
}
