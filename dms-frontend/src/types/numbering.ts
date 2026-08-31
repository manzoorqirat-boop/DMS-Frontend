/**
 * Mirrors Dms.Application.Numbering.NumberingDtos.
 */

export interface NumberingRuleView {
  id: string;
  documentTypeId: string;
  documentTypeCode: string;
  siteId: string | null;
  pattern: string;
  scope: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateNumberingRuleRequest {
  documentTypeId: string;
  siteId: string | null;
  pattern: string;
}

/** What a pattern produces, shown before it is saved. */
export interface PatternPreview {
  pattern: string;
  firstDocument: string;
  laterDocument: string;
  resetBehaviour: string;
}

/**
 * Tokens DocumentNumberPattern understands. Kept here for the admin UI's own hint text —
 * the backend validates the pattern authoritatively on save, so this list is a convenience,
 * not the rule.
 */
export const NUMBERING_TOKENS = [
  { token: "{SITE}", meaning: "Site code" },
  { token: "{DEPT}", meaning: "Department code" },
  { token: "{TYPE}", meaning: "Document type code" },
  { token: "{SEQ:0000}", meaning: "Sequence, padded to the given width" },
  { token: "{REV:00}", meaning: "Revision number" },
  { token: "{YYYY}", meaning: "Four-digit year — sequence restarts yearly" },
  { token: "{YY}", meaning: "Two-digit year" },
  { token: "{MM}", meaning: "Two-digit month — sequence restarts monthly" },
];
