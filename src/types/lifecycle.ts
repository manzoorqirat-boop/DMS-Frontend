/**
 * Mirrors Dms.Application.Documents.LifecycleDtos and RetentionDtos.
 */

export type RetentionTrigger = "Superseded" | "Obsolete";

// DispositionAction already lives in types/documents.ts, where DocumentSummary.disposition
// uses it. Imported rather than redeclared: two identical unions in two files compile fine
// and then quietly drift the first time the backend adds a value to only one of them.
//
// Imported AND re-exported deliberately — `export type { X } from "..."` alone forwards the
// name to consumers but never binds it locally, so RecordDispositionRequest below couldn't
// see it. That was a real build break (TS2304), not a style preference.
import type { DispositionAction } from "@/types/documents";

export type { DispositionAction };

export interface CreateReviewPolicyRequest {
  documentTypeId: string;
  siteId: string | null;
  reviewIntervalMonths: number;
}

export interface UpdateReviewPolicyRequest {
  reviewIntervalMonths: number;
}

export interface ReviewPolicyView {
  id: string;
  documentTypeId: string;
  documentTypeCode: string;
  siteId: string | null;
  reviewIntervalMonths: number;
  scope: string;
  createdBy: string;
  createdAt: string;
}

/** DaysUntilDue goes negative once overdue — sort and colour by it directly. */
export interface ReviewDueView {
  documentId: string;
  documentNumber: string;
  title: string;
  revision: number;
  effectiveDate: string | null;
  nextReviewDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
  lastReviewedAt: string | null;
  lastReviewedBy: string | null;
}

export interface CreateRetentionPolicyRequest {
  documentTypeId: string;
  siteId: string | null;
  retentionYears: number;
  trigger: RetentionTrigger;
}

export interface UpdateRetentionPolicyRequest {
  retentionYears: number;
  trigger: RetentionTrigger;
}

export interface RetentionPolicyView {
  id: string;
  documentTypeId: string;
  documentTypeCode: string;
  siteId: string | null;
  retentionYears: number;
  trigger: RetentionTrigger;
  scope: string;
  createdBy: string;
  createdAt: string;
}

export interface DispositionDueView {
  documentId: string;
  documentNumber: string;
  title: string;
  revision: number;
  status: string;
  retainUntil: string;
  daysOverdue: number;
  obsoleteReason: string | null;
}

export interface RecordDispositionRequest {
  action: DispositionAction;
  note: string;
}

export interface PeriodicReviewRequest {
  outcome: string;
}

export interface ObsoleteRequest {
  reason: string;
}
