import { useId, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { ApiError } from "@/lib/api-client";
import { LifecycleRail, LifecycleRailCompact } from "@/components/LifecycleRail";

/**
 * Design note: the left panel's Lifecycle Rail is not decoration. Draft → In review →
 * Approved → Effective → Superseded → Obsolete is the actual, typed sequence every document
 * in this system moves through — showing it here does double duty as the product's thesis
 * ("this is what the system tracks") and as the one place bold color is spent. Everything
 * else on this screen stays quiet on purpose; see the frontend-design skill's note on
 * spending boldness in one place rather than spreading it thin.
 */
export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userNameId = useId();
  const passwordId = useId();

  // Already signed in — don't show the login form at all, just go where they were headed (or
  // the default landing page). Handles the case of navigating back to /login manually.
  if (user) {
    const from = (location.state as { from?: Location })?.from;
    return <Navigate to={from?.pathname ?? "/"} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(userName, password);
      const from = (location.state as { from?: Location })?.from;
      navigate(from?.pathname ?? "/", { replace: true });
    } catch (err) {
      setError(describeLoginError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* LEFT — identity + lifecycle rail */}
      <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 px-7 py-8 text-white md:px-16 md:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand/20 blur-3xl"
        />

        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-[22px] font-bold tracking-tight">DMS</span>
          <span className="border-l border-white/25 pl-2.5 text-[12.5px] font-medium text-white/55">
            Controlled Document Management
          </span>
        </div>

        <div>
          <h1 className="mb-2 max-w-[420px] font-display text-[22px] font-semibold leading-tight tracking-tight md:text-[26px]">
            Every document, exactly where it stands in its{" "}
            <span className="text-stage-effective">life cycle</span>.
          </h1>
          <p className="mb-6 hidden max-w-[380px] text-[14.5px] leading-relaxed text-white/60 md:mb-9 md:block">
            From first draft to final withdrawal — signed, dated, and traceable at every stage.
          </p>

          <div className="hidden md:block">
            <LifecycleRail />
          </div>
          <div className="md:hidden">
            <LifecycleRailCompact />
          </div>
        </div>

        <div className="hidden items-center gap-2.5 font-mono text-xs text-white/40 md:flex">
          <span>21 CFR Part 11</span>
          <span className="opacity-50">·</span>
          <span>EU Annex 11</span>
          <span className="opacity-50">·</span>
          <span>v1.0</span>
        </div>
      </aside>

      {/* RIGHT — the form */}
      <main className="flex items-center justify-center px-6 py-10 md:px-10">
        <div className="w-full max-w-[380px]">
          <p className="mb-2.5 font-mono text-[11.5px] uppercase tracking-[0.08em] text-text-tertiary">
            Sign in
          </p>
          <h1 className="mb-1.5 font-display text-[25px] font-semibold tracking-tight text-text-primary">
            Welcome back
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-text-secondary">
            Sign in with the account issued by your site administrator.
          </p>

          {error && (
            <div
              role="alert"
              className="mb-[18px] flex items-start gap-2.5 rounded-[9px] border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-[13px] leading-snug text-[#9c332f]"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-[18px]">
              <label htmlFor={userNameId} className="mb-[7px] block text-[13px] font-semibold text-text-primary">
                Username
              </label>
              <input
                id={userNameId}
                name="userName"
                type="text"
                autoComplete="username"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="a.nair"
                className="w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[11px] text-[14.5px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3.5px] focus:ring-brand-tint"
              />
            </div>

            <div className="mb-[18px]">
              <div className="mb-[7px] flex items-center justify-between">
                <label htmlFor={passwordId} className="block text-[13px] font-semibold text-text-primary">
                  Password
                </label>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-[12.5px] font-medium text-brand hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              <input
                id={passwordId}
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full rounded-[9px] border-[1.5px] border-border bg-surface-raised px-[13px] py-[11px] text-[14.5px] text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-[3.5px] focus:ring-brand-tint"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-[9px] bg-brand px-4 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-7 flex justify-between border-t border-border pt-5 text-[12.5px] text-text-tertiary">
            <span>Locked out after repeated attempts</span>
            <span className="font-mono">15 min cool-down</span>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Turns whatever failed into copy the person can act on. The backend already writes good
 * `detail` text for every case it anticipated (see AuthService.LoginAsync) — this only adds
 * value for the cases the backend can't phrase for itself: a network failure, or a rate limit
 * with a concrete wait time.
 */
function describeLoginError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "rate_limited") {
      return err.retryAfterSeconds
        ? `Too many attempts. Try again in ${err.retryAfterSeconds} seconds.`
        : err.message;
    }
    return err.message;
  }

  return "Could not reach the server. Check your connection and try again.";
}
