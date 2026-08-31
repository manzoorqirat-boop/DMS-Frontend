/**
 * Mirrors Dms.Application.Notifications DTOs.
 */

export type NotificationKind =
  | "ReviewComingDue"
  | "ReviewOverdue"
  | "SignaturePending"
  | "CopyUnacknowledged"
  | "CopyRetrievalRequired"
  | "DispositionDue";

export type NotificationStatus = "Pending" | "Sent" | "Failed";

export type NotificationRecipientMode =
  | "DocumentAuthor"
  | "RoleHolders"
  | "CopyIssuer"
  | "StepAssignee";

export interface NotificationView {
  id: string;
  kind: NotificationKind;
  subject: string;
  body: string;
  status: NotificationStatus;
  subjectDocumentId: string | null;
  isRead: boolean;
  createdAt: string;
  sentAt: string | null;
}

export interface NotificationRuleView {
  id: string;
  kind: NotificationKind;
  documentTypeId: string | null;
  documentTypeScope: string;
  isEnabled: boolean;
  recipientMode: NotificationRecipientMode;
  recipientRoleId: string | null;
  recipientRoleCode: string;
  leadDays: number;
  repeatEveryDays: number;
  subjectTemplate: string;
  bodyTemplate: string;
  availableTokens: string[];
  createdBy: string;
  createdAt: string;
}

export interface CreateNotificationRuleRequest {
  kind: NotificationKind;
  documentTypeId: string | null;
  recipientMode: NotificationRecipientMode;
  recipientRoleId: string | null;
  leadDays: number;
  repeatEveryDays: number;
  subjectTemplate: string;
  bodyTemplate: string;
}

export interface UpdateNotificationRuleRequest {
  recipientMode: NotificationRecipientMode;
  recipientRoleId: string | null;
  leadDays: number;
  repeatEveryDays: number;
  subjectTemplate: string;
  bodyTemplate: string;
}

export interface MessagePreview {
  subject: string;
  body: string;
  availableTokens: string[];
}

export interface PreviewTemplateRequest {
  kind: NotificationKind;
  subjectTemplate: string;
  bodyTemplate: string;
}

/** Shape of GET /api/notification-rules/options. */
export interface NotificationRuleOptions {
  kinds: { name: NotificationKind; tokens: string[] }[];
  recipientModes: NotificationRecipientMode[];
}
