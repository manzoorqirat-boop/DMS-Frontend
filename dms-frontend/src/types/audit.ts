/**
 * Mirrors the anonymous projection in Dms.Api.Endpoints.AuditEndpoints — that endpoint
 * doesn't return the AuditEvent entity directly, it projects a specific shape, so this type
 * follows the projection rather than the entity.
 */
export interface AuditEventView {
  id: string;
  occurredAt: string;
  actor: string;
  /** The AuditAction enum name as a string, e.g. "DocumentCreated" — see humanizeAction(). */
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  details: string | null;
}

export interface ListAuditParams {
  entityId?: string;
  entityType?: string;
  actor?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
