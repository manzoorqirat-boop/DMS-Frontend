/**
 * Mirrors src/Dms.Application/Auth/AuthDtos.cs exactly. Kept as a hand-written type file
 * rather than generated, since there's no OpenAPI client generation step yet — see the
 * project README for why that's a deliberate gap, not an oversight.
 */

export interface LoginRequest {
  userName: string;
  password: string;
}

/**
 * The full shape of a successful login. Note there is no permission list here by design —
 * AuthDtos.cs is explicit that baking permissions into the response would freeze them until
 * the token expires, so a revoked role would keep working. The frontend asks
 * GET /api/roles/me/permissions for that, scoped to wherever the user is actually working.
 */
export interface LoginResult {
  accessToken: string;
  expiresAt: string; // ISO 8601, from DateTimeOffset
  userName: string;
  fullName: string;
  department: string;
  designation: string;

  /**
   * The caller must change their password before doing anything else — either the account was
   * just created (the administrator who set the password knows it, and here the password is
   * also the e-signature credential), or it has passed the policy's expiry.
   *
   * A token IS issued either way, because changing a password requires being authenticated.
   * The app is responsible for refusing to go anywhere except the change screen until this
   * clears; see ProtectedRoute.
   */
  mustChangePassword: boolean;

  /** "new_account" or "password_expired" when mustChangePassword is set. */
  passwordChangeReason: string | null;
}

/**
 * The ProblemDetails shape every non-2xx response uses, per ResultExtensions.ToProblem() and
 * GlobalExceptionHandler. `code` is what the UI should branch on; `title`/`detail` are for
 * display, and `title` happens to carry the same value as `code` today — don't rely on that
 * staying true, branch on `code`.
 */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  traceId?: string;
  [key: string]: unknown;
}

/** The 429 body written by RateLimiting.OnRejected — distinct shape, not a ProblemDetails. */
export interface RateLimitedResponse {
  code: "rate_limited";
  detail: string;
}
