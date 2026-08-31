/**
 * Mirrors Dms.Application.Access.AccessDtos and Dms.Domain.Enums (Permission,
 * AssignmentScope) — verified directly against the backend source.
 */

/** Dms.Domain.Enums.Permission. Every value corresponds to a real enforcement check. */
export type Permission =
  | "SiteManage"
  | "DepartmentManage"
  | "DocumentTypeManage"
  | "RoleManage"
  | "UserManage"
  | "NumberingConfigure"
  | "WorkflowConfigure"
  | "TemplateView"
  | "TemplateRegister"
  | "TemplateActivate"
  | "TemplateRetire"
  | "DocumentView"
  | "DocumentCreate"
  | "DocumentEdit"
  | "DocumentWithdraw"
  | "DocumentSubmit"
  | "DocumentSign"
  | "DocumentIssue"
  | "DocumentObsolete"
  | "AuditView";

export type AssignmentScope = "Global" | "Site" | "Department";

export interface RoleView {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissions: Permission[];
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string | null;
  permissions: Permission[];
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
  siteId?: string | null;
  departmentId?: string | null;
}

export interface AssignmentView {
  id: string;
  userId: string;
  userName: string;
  roleId: string;
  roleCode: string;
  siteId: string | null;
  departmentId: string | null;
  scope: AssignmentScope;
  assignedBy: string;
  createdAt: string;
}
