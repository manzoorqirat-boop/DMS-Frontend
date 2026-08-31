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
