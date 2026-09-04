import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Lock, PenLine } from "lucide-react";
import { getSignaturePolicy, updateSignaturePolicy } from "@/api/signingActions";
import { ApiError } from "@/lib/api-client";
import { PageHeader } from "@/components/PageHeader";
import {
  ACTION_LABELS,
  ALWAYS_REQUIRE_SIGNATURE,
  type SecondSignatureTiming,
  type SignaturePointView,
} from "@/types/signing-actions";

/**
 * Which controlled actions require an electronic signature, and which require two.
 *
 * Editable because this is a company's own quality-system decision and varies between sites of
 * the same company — the same reasoning that put numbering patterns and notification rules in
 * the database rather than in code.
 *
 * Two actions cannot have their signature switched off. The toggle is disabled here and says
 * why, but the real enforcement is the backend refusing the change: a UI that merely discourages
 * something is not a control.
 */
export function SignaturePolicyAdminPage() {
  const [points, setPoints] = useState<SignaturePointView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    getSignaturePolicy(controller.signal)
      .then(setPoints)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Could not load the signature policy.");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  function update(action: string, patch: Partial<SignaturePointView>) {
    setPoints((prev) =>
      prev.map((p) => (p.action === action ? { ...p, ...patch } : p)),
    );
    setSaved(false);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      // The response is applied back rather than the request assumed to have taken effect —
      // the backend enforces floors, so what returns may differ from what was sent.
      setPoints(await updateSignaturePolicy({ points }));
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the signature policy.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Signature requirements"
        description="Which actions need an electronic signature, and which need a second person. Changes apply to actions performed from now on; anything already in the queue keeps the rules it was created under."
      />

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] text-[#9c332f]">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {saved && (
        <div className="mb-4 flex items-start gap-2.5 rounded-[9px] border border-stage-effective/30 bg-stage-effective/10 px-3.5 py-2.5 text-[13px] text-ink-900">
          <Check className="mt-0.5 h-4 w-4 flex-none text-stage-effective" aria-hidden="true" />
          <span>Saved. The values shown are what is now in force.</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-text-tertiary/10" />
          ))}
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {points.map((p) => {
              const locked = ALWAYS_REQUIRE_SIGNATURE.includes(p.action);

              return (
                <li key={p.action} className="rounded-xl border border-border bg-surface-raised p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold text-text-primary">
                        {ACTION_LABELS[p.action] ?? p.action}
                        {locked && (
                          <Lock className="h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" />
                        )}
                      </h2>
                      {locked && (
                        <p className="mt-0.5 text-xs text-text-tertiary">
                          Always requires a signature — it destroys or writes off a controlled
                          record, and cannot be attributable to a session alone.
                        </p>
                      )}
                    </div>

                    <label className="flex flex-none items-center gap-2 text-[13px] font-medium text-text-primary">
                      <input
                        type="checkbox"
                        checked={p.requiresSignature}
                        disabled={locked}
                        onChange={(e) =>
                          update(p.action, {
                            requiresSignature: e.target.checked,
                            // A countersignature without a signature is incoherent; clearing it
                            // here avoids saving a state the backend would have to interpret.
                            requiresSecondSignature: e.target.checked && p.requiresSecondSignature,
                          })
                        }
                        className="h-4 w-4 rounded border-border text-brand focus:ring-brand-tint disabled:opacity-50"
                      />
                      Sign
                    </label>
                  </div>

                  {p.requiresSignature && (
                    <div className="mt-3 border-t border-border pt-3">
                      <label className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
                        <input
                          type="checkbox"
                          checked={p.requiresSecondSignature}
                          onChange={(e) =>
                            update(p.action, { requiresSecondSignature: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-border text-brand focus:ring-brand-tint"
                        />
                        Also needs a second person
                      </label>

                      {p.requiresSecondSignature && (
                        <div className="mt-2.5 pl-6">
                          <label className="block text-xs font-semibold text-text-primary">
                            When
                            <select
                              value={p.timing}
                              onChange={(e) =>
                                update(p.action, {
                                  timing: e.target.value as SecondSignatureTiming,
                                })
                              }
                              className="mt-1 w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint"
                            >
                              <option value="VerificationAfter">
                                After — the act happens, then someone verifies it
                              </option>
                              <option value="AuthorisationBefore">
                                Before — nothing happens until someone authorises it
                              </option>
                            </select>
                          </label>
                          <p className="mt-1 text-xs text-text-tertiary">
                            {p.timing === "AuthorisationBefore"
                              ? "Right for anything irreversible: what is done cannot be undone by refusing afterwards."
                              : "Right when the act is already physical — the copy is handed over, then the register is checked."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="mt-5 flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <PenLine className="h-4 w-4" aria-hidden="true" />
            )}
            Save requirements
          </button>
        </>
      )}
    </div>
  );
}
