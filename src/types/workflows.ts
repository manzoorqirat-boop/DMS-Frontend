/** Mirrors Dms.Application.Workflows.WorkflowDtos — verified directly against backend source. */

/**
 * QualityApprover is a distinct role rather than another Approver step: a technical approver
 * confirms the procedure is correct, a quality approver confirms it is compliant. Collapsing
 * them would make "at least one QO approver" unenforceable — nothing could tell them apart.
 */
export type SignatureRole = "Reviewer" | "Approver" | "QualityApprover";

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
