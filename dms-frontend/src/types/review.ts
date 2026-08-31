import type { DocumentStatus } from "@/types/documents";
import type { SignatureRole } from "@/types/workflows";

/**
 * Mirrors Dms.Application.Signing.SigningDtos and the RouteTemplateView family in
 * Dms.Application.Workflows.WorkflowDtos. Verified directly against backend source, with one
 * caveat: SigningEndpoints.cs itself carries a note that it was reconstructed after going
 * missing from the repo — the route *paths* are the one part not independently re-derived
 * from something else; the request/response shapes below match ReviewWorkflowService's real
 * public methods exactly.
 */

export type SignatureMeaning = "Reviewed" | "Approved" | "Rejected";
export type SignatureRequestStatus = "Pending" | "Signed" | "Rejected" | "Cancelled";

export interface CandidateView {
  userId: string;
  userName: string;
  fullName: string;
  designation: string;
}

export interface RouteSlot {
  stepOrder: number;
  stepLabel: string;
  role: SignatureRole;
  roleId: string;
  roleCode: string;
  candidates: CandidateView[];
}

export interface RouteTemplateView {
  documentId: string;
  documentNumber: string;
  workflowDefinitionId: string;
  workflowName: string;
  workflowVersion: number;
  slots: RouteSlot[];
}

export interface RouteNomination {
  stepOrder: number;
  userName: string;
}

export interface SubmitForReviewRequest {
  nominations: RouteNomination[];
}

export interface SignatureView {
  userName: string;
  fullName: string;
  department: string;
  designation: string;
  meaning: SignatureMeaning;
  signedAt: string;
  stepLabel: string;
  stepOrder: number;
  contentHash: string;
  reason: string | null;
}

export interface RouteStepView {
  stepOrder: number;
  stepLabel: string;
  userName: string;
  role: SignatureRole;
  status: SignatureRequestStatus;
  signature: SignatureView | null;
}

export interface RouteView {
  documentId: string;
  documentNumber: string;
  documentStatus: DocumentStatus;
  approvedContentHash: string | null;
  steps: RouteStepView[];
}

export interface SignRequest {
  password: string;
  meaning: SignatureMeaning;
  reason?: string | null;
}

export interface PendingSignatureView {
  documentId: string;
  documentNumber: string;
  title: string;
  stepOrder: number;
  stepLabel: string;
  role: SignatureRole;
  submittedAt: string | null;
}

export interface DocumentIssueView {
  documentNumber: string;
  status: DocumentStatus;
  effectiveDate: string | null;
}
