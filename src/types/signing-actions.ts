/**
 * Mirrors Dms.Application.Signing.ActionSignatureDtos and the ControlledAction enums.
 */

export type ControlledAction =
  | "IssueCopy"
  | "RetrieveCopy"
  | "CloseOutCopy"
  | "PrintCopy"
  | "PeriodicReview"
  | "MakeObsolete"
  | "RecordDisposition";

export type SecondSignatureTiming = "VerificationAfter" | "AuthorisationBefore";

export type PendingActionStatus =
  | "AwaitingCountersignature"
  | "Completed"
  | "Rejected"
  | "Cancelled";

/**
 * A row in the countersignature worklist.
 *
 * `hasTakenEffect` is the field this screen turns on. Under VerificationAfter the act already
 * happened and refusing only records a discrepancy; under AuthorisationBefore nothing has
 * happened and refusing simply ends it. A countersigner who doesn't know which they're looking
 * at can't make an informed decision, so it's stated rather than inferred from the timing.
 */
export interface PendingActionView {
  id: string;
  action: ControlledAction;
  timing: SecondSignatureTiming;
  hasTakenEffect: boolean;
  subjectType: string;
  subjectId: string;
  subjectLabel: string;
  countersignerPermission: string | null;
  performedBy: string;
  performedByFullName: string;
  performedAt: string;
  status: PendingActionStatus;
}

/** Body of POST /api/pending-actions/{id}/countersign. */
export interface CountersignRequest {
  /** The countersigner's own signing credential — never the performer's. */
  password: string;
  approve: boolean;
  /** Required when refusing. */
  reason?: string | null;
}

export interface SignaturePointView {
  action: ControlledAction;
  requiresSignature: boolean;
  requiresSecondSignature: boolean;
  timing: SecondSignatureTiming;
  secondSignerPermission: string | null;
}

export interface UpdateSignaturePolicyRequest {
  points: SignaturePointView[];
}

/**
 * Actions whose signature requirement the backend refuses to switch off. Mirrored here only so
 * the admin screen can disable the toggle and say why — the backend rejects the change
 * regardless, and that rejection is the real enforcement.
 */
export const ALWAYS_REQUIRE_SIGNATURE: ControlledAction[] = [
  "RecordDisposition",
  "CloseOutCopy",
];

/** Plain-language labels. "RecordDisposition" is not what anyone calls it out loud. */
export const ACTION_LABELS: Record<ControlledAction, string> = {
  IssueCopy: "Issue a controlled copy",
  RetrieveCopy: "Record a copy as collected",
  CloseOutCopy: "Write off a copy as destroyed or lost",
  PrintCopy: "Print a controlled copy",
  PeriodicReview: "Record a periodic review",
  MakeObsolete: "Withdraw a document from use",
  RecordDisposition: "Destroy or permanently retain a record",
};
