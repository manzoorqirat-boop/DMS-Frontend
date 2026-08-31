import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Check, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { changeOwnPassword } from "@/api/users";
import { getPasswordPolicy } from "@/api/passwordPolicy";
import { ApiError } from "@/lib/api-client";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/features/auth/useAuth";
import { describePolicy, type PasswordPolicyView } from "@/types/password-policy";

const inputClasses =
  "w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[11px] text-[14.5px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3.5px] focus:ring-brand-tint";

/**
 * Self-service password change, and the only screen reachable while a change is outstanding.
 *
 * There is deliberately no administrator reset anywhere in this system: the password is also
 * the e-signature credential, so one an administrator could set would be a credential a second
 * person knows — precisely what §11.200 exists to prevent. That is also why the current
 * password is required even though the caller is already signed in: an unattended session must
 * not be enough to take over someone's signing credential.
 */
export function ChangePasswordPage() {
  const { user, clearPasswordChangeRequirement } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [policy, setPolicy] = useState<PasswordPolicyView | null>(null);

  const isForced = user?.mustChangePassword ?? false;
  const forcedReason = user?.passwordChangeReason;

  // Fetched so the rules can be stated BEFORE anyone types. Being told a password is invalid
  // after choosing one is a worse experience than knowing the constraints up front, and the
  // policy is configurable so it can't be hardcoded here.
  useEffect(() => {
    getPasswordPolicy()
      .then(setPolicy)
      .catch(() => setPolicy(null));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSucceeded(false);

    // Checked here because the backend has no confirmation field — it's purely a typo guard
    // for the person typing, not a policy rule.
    if (newPassword !== confirmPassword) {
      setError("The new password and its confirmation don't match.");
      return;
    }

    setIsSaving(true);
    try {
      await changeOwnPassword({ currentPassword, newPassword });

      // Clears the hard lock in ProtectedRoute. Without this the user would change their
      // password successfully and still be pinned to this screen.
      clearPasswordChangeRequirement();

      setSucceeded(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      if (isForced) {
        // Straight on to the app — they came here because they were made to, not by choice.
        setTimeout(() => navigate("/", { replace: true }), 1200);
      }
    } catch (err) {
      setError(describeError(err));
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

      {isForced && (
        <div className="mb-4 flex items-start gap-2.5 rounded-[9px] border border-stage-review/30 bg-stage-review/10 px-3.5 py-3 text-[13px] leading-relaxed text-ink-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-none text-stage-review" aria-hidden="true" />
          <span>
            {forcedReason === "password_expired" ? (
              <>
                Your password has passed its expiry date and must be changed before you can
                continue.
              </>
            ) : (
              <>
                This account was created with a password set by an administrator, who therefore
                knows it. Because that same password signs documents, it has to be replaced with
                one only you know before you can go any further.
              </>
            )}
          </span>
        </div>
      )}

      {policy && (
        <div className="mb-4 rounded-[9px] border border-border bg-surface p-3.5">
          <h2 className="mb-1.5 text-[13px] font-semibold text-text-primary">
            Your new password must meet these rules
          </h2>
          <ul className="space-y-1 text-[13px] text-text-secondary">
            {describePolicy(policy).map((rule) => (
              <li key={rule} className="flex items-start gap-1.5">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 flex-none rounded-full bg-text-tertiary" />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

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
            {isForced
              ? "Password changed. Taking you to the app…"
              : "Password changed. Your existing session stays valid — there's no server-side revocation, so any other signed-in session also continues until its token expires."}
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

/**
 * The backend already phrases these well — it knows the configured history depth and which
 * specific rule was broken, and this screen does not. So its message is used as-is; the codes
 * are matched only to confirm they're understood rather than to rewrite them.
 */
function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "password_policy":
      case "password_reused":
      case "password_unchanged":
      case "current_password_incorrect":
        return err.message;
      default:
        return err.message;
    }
  }

  return "Could not change your password.";
}
