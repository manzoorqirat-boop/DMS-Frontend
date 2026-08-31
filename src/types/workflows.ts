/** Mirrors Dms.Application.Workflows.WorkflowDtos — verified directly against backend source. */

export type SignatureRole = "Reviewer" | "Approver";

export interface WorkflowStepRequest {
  roleId: string;
  role: SignatureRole;
  stepLabel: string;
}

export interface WorkflowStepView {
  stepOrder: number;
  roleId: string;
  roleCode: string;
  role: SignatureRole;
  stepLabel: string;
}

export interface WorkflowView {
  id: string;
  documentTypeId: string;
  siteId: string | null;
  name: string;
  isActive: boolean;
  version: number;
  scope: string;
  steps: WorkflowStepView[];
}

export interface CreateWorkflowRequest {
  documentTypeId: string;
  siteId?: string | null;
  name: string;
  steps: WorkflowStepRequest[];
}
