/**
 * The document lifecycle, in order. This is the one place the six stages, their colors, and
 * their descriptions are defined — the login screen's rail and every later status chip read
 * from here, so "amber" can never mean one thing on the login screen and something else on
 * the document register. If a stage's color or label ever needs to change, it changes once.
 *
 * Mirrors Dms.Domain.Enums.DocumentStatus. Kept as a manually-maintained array rather than
 * generated from the backend enum since there's no shared-types pipeline yet — see the
 * project README.
 */
export interface LifecycleStage {
  key: string;
  label: string;
  description: string;
  colorKey: "draft" | "review" | "approved" | "effective" | "superseded" | "obsolete";
}

/**
 * Every Tailwind class a stage might need, written out in full.
 * <p>
 * This exists because Tailwind's JIT scanner greps source files for literal class-name
 * strings — `` `bg-stage-${colorKey}` `` at runtime would generate no CSS at all, since the
 * scanner never sees that concrete string in any file. Every class below is complete text
 * somewhere in this file, which is enough for the scanner to find it regardless of how a
 * component looks it up at runtime.
 */
export const STAGE_CLASSES: Record<
  LifecycleStage["colorKey"],
  { dot: string; text: string; bg: string; ring: string }
> = {
  draft: { dot: "bg-stage-draft", text: "text-stage-draft", bg: "bg-stage-draft/10", ring: "ring-stage-draft/30" },
  review: { dot: "bg-stage-review", text: "text-stage-review", bg: "bg-stage-review/10", ring: "ring-stage-review/30" },
  approved: { dot: "bg-stage-approved", text: "text-stage-approved", bg: "bg-stage-approved/10", ring: "ring-stage-approved/30" },
  effective: { dot: "bg-stage-effective", text: "text-stage-effective", bg: "bg-stage-effective/10", ring: "ring-stage-effective/30" },
  superseded: { dot: "bg-stage-superseded", text: "text-stage-superseded", bg: "bg-stage-superseded/10", ring: "ring-stage-superseded/30" },
  obsolete: { dot: "bg-stage-obsolete", text: "text-stage-obsolete", bg: "bg-stage-obsolete/10", ring: "ring-stage-obsolete/30" },
};

export const LIFECYCLE_STAGES: readonly LifecycleStage[] = [
  {
    key: "Draft",
    label: "Draft",
    description: "Being authored — the only editable state",
    colorKey: "draft",
  },
  {
    key: "InReview",
    label: "In review",
    description: "Routed for signature, in sequence",
    colorKey: "review",
  },
  {
    key: "Approved",
    label: "Approved",
    description: "Fully signed, awaiting issue",
    colorKey: "approved",
  },
  {
    key: "Effective",
    label: "Effective",
    description: "In force — the version to follow today",
    colorKey: "effective",
  },
  {
    key: "Superseded",
    label: "Superseded",
    description: "Replaced by a later revision",
    colorKey: "superseded",
  },
  {
    key: "Obsolete",
    label: "Obsolete",
    description: "Withdrawn, retained for its record",
    colorKey: "obsolete",
  },
];

/** Looks up a stage by its backend DocumentStatus key. Falls back gracefully for an unrecognised value. */
export function findStage(statusKey: string): LifecycleStage | undefined {
  return LIFECYCLE_STAGES.find((stage) => stage.key === statusKey);
}
