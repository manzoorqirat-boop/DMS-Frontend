import { apiFetch } from "@/lib/api-client";
import { toQueryString } from "@/types/paging";
import type { PagedResult } from "@/types/paging";
import type { AuditEventView, ListAuditParams } from "@/types/audit";

/**
 * This file didn't exist in the upload at all (DocumentDetailPage.tsx imports it, but it was
 * never in src/api/). Reconstructed from that usage and verified against the backend's
 * AuditEndpoints.cs — the query params here (entityId, entityType, actor, from, to, page,
 * pageSize) match MapAuditEndpoints exactly.
 */

/** GET /api/audit */
export function listAuditEvents(
  params: ListAuditParams = {},
  signal?: AbortSignal,
): Promise<PagedResult<AuditEventView>> {
  return apiFetch<PagedResult<AuditEventView>>(
    `/api/audit${toQueryString({
      entityId: params.entityId,
      entityType: params.entityType,
      actor: params.actor,
      from: params.from,
      to: params.to,
      page: params.page,
      pageSize: params.pageSize,
    })}`,
    { signal },
  );
}
