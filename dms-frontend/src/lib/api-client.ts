import type { ProblemDetails, RateLimitedResponse } from "@/types/auth";

/**
 * Base URL for the API. Empty string means "same origin, relative /api/... paths" — which is
 * what the Vite dev proxy expects, and also what works in production if the frontend is
 * served from the same origin as the API. Set VITE_API_BASE_URL to point elsewhere (a
 * separately-hosted API), in which case CORS on the API side has to list this origin — see
 * Cors:AllowedOrigins in appsettings.json.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Thrown for every non-2xx response. Carries the backend's own error `code` (from
 * ResultExtensions.ToProblem's extensions, or "rate_limited" from the 429 handler) so callers
 * can branch on stable machine-readable values rather than parsing prose — the same contract
 * the backend itself was built around.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    /** Seconds to wait before retrying, read from the 429 response's Retry-After header. */
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Set by AuthContext on mount. A plain callback reference rather than importing AuthContext
 * here — this module has to stay below the auth layer in the dependency graph so anything can
 * call the API without a circular import, while still letting a 401 from *any* call
 * (not just login) trigger a clean logout.
 */
let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

/** The bearer token to attach, read fresh on every call rather than captured once at import time. */
let currentToken: string | null = null;
export function setAuthToken(token: string | null): void {
  currentToken = token;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Skip attaching the bearer token — used only for /api/auth/login itself. */
  anonymous?: boolean;
  signal?: AbortSignal;
}

/**
 * The one function every API call goes through. Deliberately small: this is not meant to grow
 * into a generic HTTP client with retries and caching — it exists to enforce one thing
 * consistently, which is that every error response is turned into the same typed shape
 * regardless of which endpoint produced it.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, anonymous = false, signal } = options;

  // FormData (multipart uploads) must go through untouched, with no Content-Type set — the
  // browser fills in `multipart/form-data; boundary=...` itself, and JSON.stringify-ing a
  // FormData instance would silently send "{}" instead of the file.
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const headers: Record<string, string> = {};
  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (!anonymous && currentToken) {
    headers["Authorization"] = `Bearer ${currentToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    signal,
  });

  // 204 No Content and other empty-body successes — nothing to parse, nothing to return.
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;

  if (response.ok) {
    return data as T;
  }

  // A 401 fires the registered handler before the error is thrown, so a session that expired
  // mid-use gets cleaned up centrally rather than every call site remembering to check.
  if (response.status === 401) {
    onUnauthorized?.();
  }

  if (response.status === 429) {
    const rateLimited = data as RateLimitedResponse | undefined;
    const retryAfterHeader = response.headers.get("Retry-After");
    throw new ApiError(
      429,
      rateLimited?.detail ?? "Too many attempts. Wait a minute and try again.",
      rateLimited?.code ?? "rate_limited",
      retryAfterHeader ? Number(retryAfterHeader) : undefined,
    );
  }

  const problem = data as ProblemDetails | undefined;
  throw new ApiError(
    response.status,
    problem?.detail ?? `Request failed with status ${response.status}.`,
    problem?.code,
  );
}

/**
 * For binary responses (a template's .docx file, a printed controlled copy) — apiFetch always
 * JSON-parses the body, which would corrupt a file download. Same auth header and ApiError
 * shape on failure, but returns the raw Blob on success instead.
 *
 * Takes a method because printing a copy is a POST that returns a file: it increments the
 * copy's print count and writes a PrintEvent, so it cannot be a GET.
 */
export async function apiFetchBlob(
  path: string,
  signal?: AbortSignal,
  method: "GET" | "POST" = "GET",
): Promise<Blob> {
  const headers: Record<string, string> = {};
  if (currentToken) {
    headers["Authorization"] = `Bearer ${currentToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { headers, signal, method });

  if (response.ok) {
    return response.blob();
  }

  if (response.status === 401) {
    onUnauthorized?.();
  }

  let detail = `Request failed with status ${response.status}.`;
  let code: string | undefined;
  try {
    const problem = (await response.json()) as ProblemDetails;
    detail = problem.detail ?? detail;
    code = problem.code;
  } catch {
    // Non-JSON error body — fall back to the generic message above.
  }

  throw new ApiError(response.status, detail, code);
}
