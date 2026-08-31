import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Hash, Loader2 } from "lucide-react";
import {
  changeNumberingPattern,
  createNumberingRule,
  listNumberingRules,
  previewNumberingPattern,
} from "@/api/numbering";
import { ApiError } from "@/lib/api-client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useOrganisationData } from "@/features/organisation/useOrganisationData";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { NUMBERING_TOKENS, type NumberingRuleView, type PatternPreview } from "@/types/numbering";

const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint";

/**
 * Document-number patterns per type, optionally overridden per site.
 *
 * The preview is the point of this screen. A numbering pattern is the one setting whose
 * mistakes are effectively permanent — every document created under it carries its number
 * forever, and renumbering an issued document isn't a thing you can do. So the pattern is
 * rendered against sample data, live, before anyone can save it.
 */
export function NumberingRulesAdminPage() {
  const { documentTypes, sites } = useOrganisationData();

  const [rules, setRules] = useState<NumberingRuleView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const [documentTypeId, setDocumentTypeId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [pattern, setPattern] = useState("{SITE}-{DEPT}-{TYPE}-{SEQ:0000}");
  const [isSaving, setIsSaving] = useState(false);

  const debouncedPattern = useDebouncedValue(pattern, 400);
  const [preview, setPreview] = useState<PatternPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    listNumberingRules()
      .then(setRules)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Could not load numbering rules."),
      )
      .finally(() => setIsLoading(false));
  }, [refreshToken]);

  // Preview runs against the backend rather than being simulated here, so what's shown is
  // produced by exactly the code that will generate real document numbers.
  useEffect(() => {
    if (!debouncedPattern.trim()) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    previewNumberingPattern(debouncedPattern)
      .then((p) => {
        if (!cancelled) {
          setPreview(p);
          setPreviewError(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPreview(null);
        setPreviewError(err instanceof ApiError ? err.message : "That pattern isn't valid.");
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedPattern]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!documentTypeId) {
      setError("Choose a document type.");
      return;
    }
    if (previewError) {
      setError("Fix the pattern before saving.");
      return;
    }

    setIsSaving(true);
    try {
      await createNumberingRule({ documentTypeId, siteId: siteId || null, pattern });
      setDocumentTypeId("");
      setSiteId("");
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save that rule.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePatternEdit(rule: NumberingRuleView) {
    const next = window.prompt(
      `New pattern for ${rule.documentTypeCode}.\n\nExisting documents keep their current numbers — this only affects documents created from now on.`,
      rule.pattern,
    );
    if (!next || next === rule.pattern) return;

    try {
      await changeNumberingPattern(rule.id, next);
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change that pattern.");
    }
  }

  const columns: DataTableColumn<NumberingRuleView>[] = [
    { key: "type", header: "Document type", className: "font-mono", render: (r) => r.documentTypeCode },
    { key: "scope", header: "Scope", render: (r) => r.scope },
    { key: "pattern", header: "Pattern", className: "font-mono text-xs", render: (r) => r.pattern },
    { key: "createdBy", header: "Set by", className: "text-xs", render: (r) => r.createdBy },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => handlePatternEdit(r)}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
          >
            Change pattern
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Numbering rules"
        description="How document numbers are composed, per type and optionally per site. Existing numbers never change — a new pattern applies only to documents created afterwards."
      />

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] text-[#9c332f]">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rules}
        getRowKey={(r) => r.id}
        isLoading={isLoading}
        skeletonRowCount={3}
        emptyState={
          <EmptyState
            icon={Hash}
            title="No numbering rules"
            description="Document types without a rule fall back to the built-in default pattern."
          />
        }
      />

      <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-border bg-surface-raised p-4">
        <h2 className="mb-3 font-display text-sm font-semibold text-text-primary">Add a rule</h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-text-primary">
            Document type
            <select
              value={documentTypeId}
              onChange={(e) => setDocumentTypeId(e.target.value)}
              className={`mt-1 ${inputClasses}`}
            >
              <option value="">Choose…</option>
              {documentTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-text-primary">
            Site (optional override)
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className={`mt-1 ${inputClasses}`}
            >
              <option value="">All sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-text-primary">
            Pattern
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className={`mt-1 font-mono ${inputClasses}`}
            />
          </label>
        </div>

        <div className="mt-3 rounded-lg border border-border bg-surface p-3">
          {previewError ? (
            <p className="text-[13px] text-[#9c332f]">{previewError}</p>
          ) : preview ? (
            <dl className="grid gap-2 text-[13px] sm:grid-cols-3">
              <div>
                <dt className="text-xs text-text-tertiary">First document</dt>
                <dd className="font-mono text-text-primary">{preview.firstDocument}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-tertiary">Later document</dt>
                <dd className="font-mono text-text-primary">{preview.laterDocument}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-tertiary">Sequence resets</dt>
                <dd className="text-text-primary">{preview.resetBehaviour}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-[13px] text-text-tertiary">Type a pattern to preview it.</p>
          )}
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-text-secondary">
            Available tokens
          </summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {NUMBERING_TOKENS.map((t) => (
              <li key={t.token} className="text-[12px] text-text-secondary">
                <code className="font-mono text-text-primary">{t.token}</code> — {t.meaning}
              </li>
            ))}
          </ul>
        </details>

        <button
          type="submit"
          disabled={isSaving || previewError !== null}
          className="mt-3 flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Add rule
        </button>
      </form>
    </div>
  );
}
