import { apiFetch } from "@/lib/api-client";
import { toQueryString } from "@/types/paging";
import type { CreateSiteRequest, SiteSummary } from "@/types/organisation";

/** GET /api/sites */
export function listSites(includeInactive = false): Promise<SiteSummary[]> {
  return apiFetch<SiteSummary[]>(`/api/sites${toQueryString({ includeInactive })}`);
}

/**
 * POST /api/sites
 *
 * The code is what appears inside document numbers via the {SITE} token, so it's effectively
 * permanent the moment the first document is numbered under it — there is deliberately no
 * update endpoint on the backend.
 */
export function createSite(request: CreateSiteRequest): Promise<SiteSummary> {
  return apiFetch<SiteSummary>("/api/sites", { method: "POST", body: request });
}
