import { useState, type FormEvent } from "react";
import { AlertTriangle, Check, KeyRound, Loader2 } from "lucide-react";
import { changeOwnPassword } from "@/api/users";
import { ApiError } from "@/lib/api-client";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/features/auth/useAuth";

const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[11px] text-[14.5px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3.5px] focus:ring-brand-tint";

/**
 * Self-service password change.
 *
 * There is deliberately no administrator reset anywhere in this system: the password is also
 * the e-signature credential, so one an administrator could set would be a credential a second
 * person knows — precisely what §11.200 exists to prevent. That's also why the current
 * password is required even though the caller is already signed in: an unattended session
 * must not be enough to take over someone's signing credential.
 */
export function ChangePasswordPage() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSucceeded(false);

    // Checked here rather than server-side because the backend has no concept of a
    // confirmation field — it's purely a typo guard for the person typing.
    if (newPassword !== confirmPassword) {
      setError("The new password and its confirmation don't match.");
      return;
    }

    setIsSaving(true);
    try {
      await changeOwnPassword({ currentPassword, newPassword });
      setSucceeded(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change your password.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-md">
      <PageHeader
        title="Change password"
        description={`Signed in as ${user?.userName ?? ""}. This password is also your signing credential.`}
      />

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] text-[#9c332f]">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {succeeded && (
        <div className="mb-4 flex items-start gap-2.5 rounded-[9px] border border-stage-effective/30 bg-stage-effective/10 px-3.5 py-2.5 text-[13px] text-ink-900">
          <Check className="mt-0.5 h-4 w-4 flex-none text-stage-effective" aria-hidden="true" />
          <span>
            Password changed. Your existing session stays valid — there's no server-side
            revocation, so any other signed-in session also continues until its token expires.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface-raised p-5">
        <label className="mb-4 block text-[13px] font-semibold text-text-primary">
          Current password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={`mt-1.5 ${inputClasses}`}
          />
        </label>

        <label className="mb-4 block text-[13px] font-semibold text-text-primary">
          New password
          <input
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={`mt-1.5 ${inputClasses}`}
          />
        </label>

        <label className="mb-5 block text-[13px] font-semibold text-text-primary">
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`mt-1.5 ${inputClasses}`}
          />
        </label>

        <button
          type="submit"
          disabled={isSaving}
          className="flex w-full items-center justify-center gap-2 rounded-[9px] bg-brand px-4 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          )}
          Change password
        </button>
      </form>
    </div>
  );
}
