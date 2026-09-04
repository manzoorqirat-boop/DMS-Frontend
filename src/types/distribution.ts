/**
 * Mirrors Dms.Application.Distribution.DistributionDtos.
 */

export type CopyType = "Controlled" | "Uncontrolled" | "External";

export type DistributionStatus =
  | "Issued"
  | "Acknowledged"
  | "Retrieved"
  | "Destroyed"
  | "Lost";

/** Outcomes CloseOut accepts. Retrieved is deliberately excluded — it has its own endpoint. */
export const CLOSE_OUT_OUTCOMES: DistributionStatus[] = ["Destroyed", "Lost"];

export interface IssueCopyRequest {
  copyType: CopyType;
  issuedToDepartmentId: string | null;
  issuedToName: string;
  /** Required for Controlled and External; only Uncontrolled may be null (unlimited). */
  printLimit: number | null;
  /** The issuer's signing credential, when the IssueCopy signature point is on. */
  password?: string;
}

export interface DistributionView {
  id: string;
  documentId: string;
  copyNumber: number;
  copyType: CopyType;
  issuedToName: string;
  issuedBy: string;
  status: DistributionStatus;
  isOutstanding: boolean;
  printCount: number;
  printLimit: number | null;
  scanCode: string;
  acknowledgedAt: string | null;
  returnedAt: string | null;
  closureNote: string | null;
  createdAt: string;
}

export interface CloseOutRequest {
  outcome: DistributionStatus;
  note: string;
  /**
   * Required: CloseOutCopy is one of the two actions whose signature cannot be configured away.
   * Writing off a controlled copy as lost is a finding, and must be attributable to more than
   * a logged-in session.
   */
  password?: string;
}

export interface PendingRetrievalView {
  distributionId: string;
  documentId: string;
  documentNumber: string;
  revision: number;
  title: string;
  documentStatus: string;
  copyNumber: number;
  copyType: CopyType;
  issuedToName: string;
  copyStatus: DistributionStatus;
  scanCode: string;
  issuedAt: string;
}

export interface PrintEventView {
  id: string;
  distributionId: string;
  copyNumber: number;
  printSequence: number;
  printedBy: string;
  watermark: string;
  printedAt: string;
}
