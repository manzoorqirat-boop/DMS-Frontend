/**
 * Mirrors Dms.Application.Templates.TemplateDtos.TemplateSummary and
 * Dms.Domain.Enums.TemplateStatus exactly — verified directly against the backend source,
 * not reconstructed from usage.
 */

/** Dms.Domain.Enums.TemplateStatus. Linear except for the terminal Retired state. */
export type TemplateStatus =
  | "PendingValidation"
  | "ValidationPassed"
  | "ValidationFailed"
  | "Active"
  | "Retired";

export interface TemplateSummary {
  id: string;
  documentTypeId: string;
  name: string;
  templateVersion: number;
  status: TemplateStatus;
  isUsable: boolean;
  createdBy: string;
  createdAt: string;
  validatedAt: string | null;
  validationIssues: string[];
}

export interface ListTemplatesParams {
  documentTypeId?: string;
  page?: number;
  pageSize?: number;
}
