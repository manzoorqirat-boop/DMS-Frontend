import { apiFetch } from "@/lib/api-client";
import { toQueryString } from "@/types/paging";
import type {
  CreateNumberingRuleRequest,
  NumberingRuleView,
  PatternPreview,
} from "@/types/numbering";

/** GET /api/numbering-rules */
export function listNumberingRules(documentTypeId?: string): Promise<NumberingRuleView[]> {
  return apiFetch<NumberingRuleView[]>(`/api/numbering-rules${toQueryString({ documentTypeId })}`);
}

/**
 * POST /api/numbering-rules/preview?pattern=...
 *
 * The pattern goes in the query string, not a JSON body — the backend binds it as a simple
 * parameter. Validation errors surface here rather than at the first real document creation.
 */
export function previewNumberingPattern(pattern: string): Promise<PatternPreview> {
  return apiFetch<PatternPreview>(`/api/numbering-rules/preview${toQueryString({ pattern })}`, {
    method: "POST",
  });
}

/** POST /api/numbering-rules */
export function createNumberingRule(
  request: CreateNumberingRuleRequest,
): Promise<NumberingRuleView> {
  return apiFetch<NumberingRuleView>("/api/numbering-rules", { method: "POST", body: request });
}

/** PUT /api/numbering-rules/{id}/pattern?pattern=... — same query-string binding as preview. */
export function changeNumberingPattern(id: string, pattern: string): Promise<NumberingRuleView> {
  return apiFetch<NumberingRuleView>(
    `/api/numbering-rules/${id}/pattern${toQueryString({ pattern })}`,
    { method: "PUT" },
  );
}
