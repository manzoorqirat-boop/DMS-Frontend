import { apiFetch } from "@/lib/api-client";
import { toQueryString } from "@/types/paging";
import type {
  CreateNotificationRuleRequest,
  MessagePreview,
  NotificationRuleOptions,
  NotificationRuleView,
  NotificationView,
  PreviewTemplateRequest,
  UpdateNotificationRuleRequest,
} from "@/types/notifications";

/**
 * GET /api/notifications — the caller's own notifications.
 *
 * Not paged: the backend returns a plain array with a `limit`, unlike the register and audit
 * endpoints. Don't wrap this in PagedResult handling.
 */
export function listMyNotifications(
  params: { unreadOnly?: boolean; limit?: number } = {},
  signal?: AbortSignal,
): Promise<NotificationView[]> {
  return apiFetch<NotificationView[]>(`/api/notifications${toQueryString(params)}`, { signal });
}

/** POST /api/notifications/{id}/read — scoped to the caller's own notifications. */
export function markNotificationRead(id: string): Promise<void> {
  return apiFetch<void>(`/api/notifications/${id}/read`, { method: "POST" });
}

/* --------------------------------------------------------------------- notification rules */

/** GET /api/notification-rules/options — kinds, recipient modes, and tokens per kind. */
export function getNotificationRuleOptions(): Promise<NotificationRuleOptions> {
  return apiFetch<NotificationRuleOptions>("/api/notification-rules/options");
}

/** GET /api/notification-rules */
export function listNotificationRules(kind?: string): Promise<NotificationRuleView[]> {
  return apiFetch<NotificationRuleView[]>(`/api/notification-rules${toQueryString({ kind })}`);
}

/** POST /api/notification-rules */
export function createNotificationRule(
  request: CreateNotificationRuleRequest,
): Promise<NotificationRuleView> {
  return apiFetch<NotificationRuleView>("/api/notification-rules", {
    method: "POST",
    body: request,
  });
}

/** PUT /api/notification-rules/{id} */
export function updateNotificationRule(
  id: string,
  request: UpdateNotificationRuleRequest,
): Promise<NotificationRuleView> {
  return apiFetch<NotificationRuleView>(`/api/notification-rules/${id}`, {
    method: "PUT",
    body: request,
  });
}

/** POST /api/notification-rules/{id}/enable */
export function enableNotificationRule(id: string): Promise<NotificationRuleView> {
  return apiFetch<NotificationRuleView>(`/api/notification-rules/${id}/enable`, { method: "POST" });
}

/** POST /api/notification-rules/{id}/disable — preferred over deleting, so the rule stays visible. */
export function disableNotificationRule(id: string): Promise<NotificationRuleView> {
  return apiFetch<NotificationRuleView>(`/api/notification-rules/${id}/disable`, { method: "POST" });
}

/** POST /api/notification-rules/preview — renders templates against sample values. */
export function previewNotificationTemplate(
  request: PreviewTemplateRequest,
): Promise<MessagePreview> {
  return apiFetch<MessagePreview>("/api/notification-rules/preview", {
    method: "POST",
    body: request,
  });
}
