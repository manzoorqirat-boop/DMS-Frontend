import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Check, Loader2, ShieldCheck } from "lucide-react";
import { getPasswordPolicy, updatePasswordPolicy } from "@/api/passwordPolicy";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import type { PasswordPolicyView } from "@/types/password-policy";

const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[9px] text-[14px] text-text-primary focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-tint";

/**
 * The organisation's password rules.
 *
 * Held as editable master data rather than configuration so a validated system can tighten its
 * policy without a redeployment — and so an inspector asking "what is your password policy and
 * who set it" gets an answer with a name and a timestamp against it.
 */
export function PasswordPolicyAdminPage() {
  const [policy, setPolicy] = useState<PasswordPolicyView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    minimumLength: "8",
    expiryDays: "90",
    historyCount: "3",
    maxFailedAttempts: "5",
    lockoutMinutes: "15",
    requireComplexity: true,
  });

  function applyToForm(p: PasswordPolicyView) {
    setPolicy(p);
    setForm({
      minimumLength: String(p.minimumLength),
      expiryDays: String(p.expiryDays),
      historyCount: String(p.historyCount),
      maxFailedAttempts: String(p.maxFailedAttempts),
      lockoutMinutes: String(p.lockoutMinutes),
      requireComplexity: p.requireComplexity,
    });
  }

  useEffect(() => {
    getPasswordPolicy()
      .then(applyToForm)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Could not load the password policy."),
      )
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setIsSaving(true);

    try {
      // The response is applied back to the form rather than the request being assumed to have
      // taken effect verbatim: the backend clamps every value to a sane range, so what comes
      // back may legitimately differ from what was sent.
      applyToForm(
        await updatePasswordPolicy({
          minimumLength: Number(form.minimumLength),
          expiryDays: Number(form.expiryDays),
          historyCount: Number(form.historyCount),
          maxFailedAttempts: Number(form.maxFailedAttempts),
          lockoutMinutes: Number(form.lockoutMinutes),
          requireComplexity: form.requireComplexity,
        }),
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the password policy.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Password policy"
        description="Applies to every account, including administrators. Changes take effect at the next password change or login — existing passwords are not invalidated retrospectively."
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
          <span>
            Policy saved. Values outside the permitted range are adjusted automatically — the
            figures shown below are what is now in force.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="h-72 animate-pulse rounded-xl bg-text-tertiary/10" />
      ) : (
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface-raised p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Rules
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-[13px] font-semibold text-text-primary">
              Minimum length
              <input
                type="number"
                min={6}
                max={64}
                value={form.minimumLength}
                onChange={(e) => setForm({ ...form, minimumLength: e.target.value })}
                className={`mt-1.5 ${inputClasses}`}
              />
              <span className="mt-1 block text-xs font-normal text-text-tertiary">6–64 characters.</span>
            </label>

            <label className="text-[13px] font-semibold text-text-primary">
              Expiry (days)
              <input
                type="number"
                min={0}
                max={3650}
                value={form.expiryDays}
                onChange={(e) => setForm({ ...form, expiryDays: e.target.value })}
                className={`mt-1.5 ${inputClasses}`}
              />
              <span className="mt-1 block text-xs font-normal text-text-tertiary">
                Zero means passwords never expire — a legitimate choice, but make it deliberately.
              </span>
            </label>

            <label className="text-[13px] font-semibold text-text-primary">
              Passwords remembered
              <input
                type="number"
                min={1}
                max={24}
                value={form.historyCount}
                onChange={(e) => setForm({ ...form, historyCount: e.target.value })}
                className={`mt-1.5 ${inputClasses}`}
              />
              <span className="mt-1 block text-xs font-normal text-text-tertiary">
                How many previous passwords cannot be reused.
              </span>
            </label>

            <label className="text-[13px] font-semibold text-text-primary">
              Failed attempts before lockout
              <input
                type="number"
                min={3}
                max={20}
                value={form.maxFailedAttempts}
                onChange={(e) => setForm({ ...form, maxFailedAttempts: e.target.value })}
                className={`mt-1.5 ${inputClasses}`}
              />
            </label>

            <label className="text-[13px] font-semibold text-text-primary">
              Lockout duration (minutes)
              <input
                type="number"
                min={1}
                max={1440}
                value={form.lockoutMinutes}
                onChange={(e) => setForm({ ...form, lockoutMinutes: e.target.value })}
                className={`mt-1.5 ${inputClasses}`}
              />
            </label>

            <label className="flex items-start gap-2.5 text-[13px] font-semibold text-text-primary sm:col-span-2">
              <input
                type="checkbox"
                checked={form.requireComplexity}
                onChange={(e) => setForm({ ...form, requireComplexity: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-border text-brand focus:ring-brand-tint"
              />
              <span>
                Require complexity
                <span className="mt-1 block text-xs font-normal text-text-tertiary">
                  An uppercase letter, a number and a special character. Separate from length
                  because the two are independently arguable — a long passphrase without a symbol
                  is stronger than a short password with one.
                </span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="mt-5 flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Save policy
          </button>

          {policy && (
            <p className="mt-4 border-t border-border pt-3 text-xs text-text-tertiary">
              Last changed by <span className="font-medium text-text-secondary">{policy.updatedBy}</span> on{" "}
              {formatDateTime(policy.updatedAt)}.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
