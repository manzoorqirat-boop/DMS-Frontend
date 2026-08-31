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

**Every register filter is applied server-side.** `GET /api/documents` accepts `siteId`,
`departmentId`, `documentTypeId`, `search`, `status`, `currentRevisionsOnly`, `page`, and
`pageSize`.

`status` was missing for a while, and the register deliberately shipped without a status filter
rather than faking one client-side: filtering a single fetched page would have misbehaved the
moment the register outgrew one page, showing fewer rows than the page size and missing
matching rows on other pages. The backend now filters properly, which is what makes both the
register's filter and the dashboard's per-stage counts trustworthy.

The register reads `status` and `currentRevisionsOnly` from the URL rather than component
state, so the dashboard's per-stage links land on a filtered view, and a filtered view is
shareable and survives a refresh. `currentRevisionsOnly` is only written to the URL when
false — a URL carrying the default value is noise in something people copy.

## The design system

Palette, type, and the "Lifecycle Rail" concept are documented inline in
`src/lib/lifecycle.ts` and `src/components/LifecycleRail.tsx` — briefly: the six real document
statuses (Draft → In review → Approved → Effective → Superseded → Obsolete) are the one place
this design spends deliberate color, and that same six-color mapping is the single source of
truth for every status chip anywhere in the app. `src/components/StatusBadge.tsx` and the
dashboard's `LifecyclePipeline` both read from it, which is why the sign-in rail, a status chip
and the dashboard pipeline can never disagree about what a colour means. Don't introduce a
status color outside `LIFECYCLE_STAGES` / `STAGE_CLASSES`.

Fonts: Space Grotesk (display), IBM Plex Sans (UI text), IBM Plex Mono (document numbers,
hashes, timestamps — anywhere the content is itself a precise, audit-relevant value rather
than prose).

**On Tailwind and dynamic class names:** Tailwind's JIT scanner only picks up class names that
appear as literal strings somewhere in the source it scans. `` `bg-stage-${key}` `` at runtime
would generate no CSS at all. `STAGE_CLASSES` in `lifecycle.ts` exists specifically to avoid
this — every class any component needs is written out in full there. Keep new status-adjacent
styling going through that map rather than building class names dynamically.

## Known gaps

- **No refresh token, no revocation** — inherited directly from the backend. A stolen token is
  valid until `Jwt:TokenMinutes` runs out (60 minutes in dev) regardless of anything the
  frontend does; logging out client-side doesn't invalidate the token server-side.
- **No generated API client** — see "The API contract" above. Hand-mirrored types in
  `src/types/` are the interim, and nothing catches drift automatically.
- **No permission-aware UI.** Every authenticated user sees every sidebar link; nothing reads
  `GET /api/roles/me/permissions` to hide what a user can't act on. Every real check happens
  server-side, so this is a rough edge rather than a security gap.
- **No tests.** Nothing here has an equivalent to the backend's `Dms.Domain.Tests`.
- **Desktop Word save is unproven.** The WebDAV round-trip (`Open in Word`) opens and edits
  correctly but the save-back has not yet succeeded end to end; see the backend README. The
  in-browser editor and the read-only viewer are unaffected.

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
