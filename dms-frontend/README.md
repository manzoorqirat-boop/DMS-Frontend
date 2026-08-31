# DMS Frontend

React + TypeScript + Vite + Tailwind. First slice built: sign-in and the authenticated shell.

## Before first run

**Nothing in this project has been compiled or run.** There is no network access in the
environment it was written in, so `npm install` was never executed and neither Vite's dev
server nor `tsc` has checked a single file. Static checks were run by hand instead — every
`@/...` import resolves to a real file, every named import matches a real export, JSON configs
parse, braces balance — but that is not the same as a real build. Expect `npm run build` to
surface something on first try; most likely candidates are a Tailwind arbitrary-value class
that doesn't parse the way intended, or a TypeScript strictness complaint from `noUnusedLocals`.

```bash
npm install
cp .env.example .env      # defaults are fine for local dev against the Docker Compose backend
npm run dev                # http://localhost:5173
```

Needs the backend running (`docker compose up --build` in `DMS-Backend/`) and a bootstrap
administrator seeded — see that project's README. Sign in with whatever
`Bootstrap:AdminUserName` / `Bootstrap:AdminPassword` were set to.

## What's built

- **Sign-in** (`/login`) — calls `POST /api/auth/login`, stores the session, redirects to
  wherever the person was headed (or `/` by default).
- **Session persistence** — `sessionStorage`, not `localStorage`. There is no refresh token
  and no server-side revocation list on the backend, so a bearer token is valid until it
  expires regardless of what the frontend does. `sessionStorage` at least clears on tab close;
  see `src/lib/auth-storage.ts` for the reasoning.
- **Centralized 401 handling** — any API call, anywhere, that comes back 401 triggers the same
  clean logout as pressing "Sign out." See `registerUnauthorizedHandler` in
  `src/lib/api-client.ts`.
- **Rate-limit and lockout messaging** — the login form distinguishes `invalid_credentials`,
  `account_locked`, and `rate_limited` (429, with the `Retry-After` seconds if the header is
  present), matching the backend's actual `AuthService` and `RateLimiting` behavior exactly.
- **The app shell** — sidebar, topbar with the signed-in user's name and a sign-out button.
- **The document register** (`/documents`) — real server-side search (debounced) and
  document-type filtering, a current-revisions-only toggle, and real pagination consuming the
  backend's `PagedResult<T>` envelope directly. See "The API contract" below for one filter it
  deliberately does *not* have, and why.

## The API contract

**There's no generated client yet, but the tooling for one is wired up.** `npm run
generate:api` runs `openapi-typescript` against the backend's own `/swagger/v1/swagger.json`
and writes `src/types/generated-api.d.ts` — it just hasn't been run, because this project was
built with no network access and no live backend to point it at. Once both exist, running it
is the right next step; today's hand-written types in `src/types/` are the honest substitute,
each one flagged where it's a best-effort reconstruction rather than a verified copy.

`src/types/auth.ts`, `src/types/documents.ts`, `src/types/paging.ts`, and
`src/types/document-types.ts` mirror their backend counterparts by hand. Until the generator
is actually run, nothing catches a drift between these and the real DTOs automatically — if
a field is renamed on the backend, these files won't know until something breaks at runtime.

**The document register's document-type filter is real; a status filter isn't built, on
purpose.** `GET /api/documents` accepts `siteId`, `departmentId`, `documentTypeId`, `search`,
`currentRevisionsOnly`, `page`, and `pageSize` — there's no `status` parameter. A client-side
"filter by status" against a single page of results would silently misbehave under pagination
(fewer rows than the page size, or a filtered view that misses matching rows sitting on other
pages). That's a real gap in the backend's query surface, not something to paper over on the
frontend — it should be added as a proper query parameter there before this screen pretends
to support it.

## Known gaps

Palette, type, and the "Lifecycle Rail" concept are documented inline in
`src/lib/lifecycle.ts` and `src/components/LifecycleRail.tsx` — briefly: the six real document
statuses (Draft → In review → Approved → Effective → Superseded → Obsolete) are the one place
this design spends deliberate color, and that same six-color mapping is the single source of
truth for every status chip anywhere in the app (`src/components/StatusBadge.tsx` already uses
it). Don't introduce a status color outside `LIFECYCLE_STAGES` / `STAGE_CLASSES` — the entire
point is that a color means the same thing everywhere it appears.

Fonts: Space Grotesk (display), IBM Plex Sans (UI text), IBM Plex Mono (document numbers,
hashes, timestamps — anywhere the content is itself a precise, audit-relevant value rather
than prose).

**On Tailwind and dynamic class names:** Tailwind's JIT scanner only picks up class names that
appear as literal strings somewhere in the source it scans. `` `bg-stage-${key}` `` at runtime
would generate no CSS at all. `STAGE_CLASSES` in `lifecycle.ts` exists specifically to avoid
this — every class any component needs is written out in full there. Keep new status-adjacent
styling going through that map rather than building class names dynamically.

## The API contract

`src/types/auth.ts` mirrors `Dms.Application.Auth.AuthDtos` by hand — there's no shared-types
pipeline (no generated OpenAPI client) yet, which is the biggest structural gap in this
project. The backend does expose Swagger at `/swagger` (see its README) with the full schema;
generating a typed client from that — `openapi-typescript` or similar — instead of hand-mirrored
interfaces is the natural next step once more of the API surface has a frontend consumer.

Until then: if a backend DTO shape changes, the corresponding hand-written type here has to be
updated by a person, and nothing will catch a drift automatically.

## Known gaps

- **No refresh token, no revocation** — inherited directly from the backend. A stolen token is
  valid until `Jwt:TokenMinutes` runs out (60 minutes in dev) regardless of anything the
  frontend does; logging out client-side doesn't invalidate the token server-side.
- **No password-change screen.** `POST /api/users/me/change-password` exists on the backend;
  nothing here calls it yet.
- **`/admin/users` is stubbed.** The sidebar links to it so navigation reads correctly as more
  is built, but it currently renders the dashboard placeholder.
- **No generated API client** — see "The API contract" above.
- **No status filter on the register** — see "The API contract" above; this one is a backend
  gap, not a frontend one.
- **No permission-aware UI.** Every authenticated user sees every sidebar link; nothing checks
  `GET /api/roles/me/permissions` yet to hide what a user can't act on.
- **No tests.** Nothing here has an equivalent to the backend's `Dms.Domain.Tests`.
- **No document detail screen.** Clicking a register row does nothing yet — `DataTable`
  supports an `onRowClick`, but the register doesn't pass one until there's a screen to
  navigate to.

## Project layout

```
src/
  api/              typed fetch functions, one file per backend resource
  lib/              api-client.ts (the one place every HTTP error is normalized),
                    auth-storage.ts, lifecycle.ts (the color/status source of truth),
                    use-debounced-value.ts
  types/            hand-mirrored backend DTOs, flagged where best-effort
  features/auth/    AuthContext, useAuth, LoginPage, ProtectedRoute
  features/documents/  DocumentRegisterPage
  components/       DataTable, PaginationBar, EmptyState, LifecycleRail, StatusBadge — all
                    generic/reusable, none tied to a single screen
  app-shell/        Sidebar, AppShell, DashboardPlaceholder
```
