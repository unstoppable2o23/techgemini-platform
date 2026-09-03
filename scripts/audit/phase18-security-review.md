# Phase 18 — Security Review

**Date:** 2026-09-03
**Scope:** Auth configuration, API authorization, student-data isolation, tenant isolation, secrets handling, admin controls, and protection of client-side data.

---

## 1. Summary

Security posture is strong in the areas that matter most for a launch: student data is isolated by session across every `/api/student/*` route, counselor access is gated by a 4-layer check (`loadAuthorizedStudent`: authentication → role → assignment → tenant), and no Prisma schema, secrets, or `NEXT_PUBLIC` values reach the client.

Phase 18 closed **two P0 cross-student data-leak vectors** and documented the remaining P1/P2 hardening items without weakening any existing auth.

## 2. What was found and fixed (P0)

### P0-1 — `/api/universities/[id]/profile` (fixed)
- **Before:** unauthenticated endpoint read `?studentId=` from the query string and passed it into `getUniversityProfile`, producing personalized `studentContext` (match score, confidence, reasons, matched program) for **any** student id + institution id, to **any** caller.
- **Fix:** the route now requires a session and derives the subject student from `session.user.id`. A client-supplied `studentId` is no longer accepted.

### P0-2 — `/api/student/compare` (fixed)
- **Before:** the POST body accepted a `studentId` that overrode `session.user.id`, letting any authenticated user fetch another student's personalized match context.
- **Fix:** `effectiveStudentId` is now always `session.user.id`.

### Qualified to P1 — assessment bearer-token routes (`progress`, `complete`, `retake`)
- These are **not** cross-student arbitrary-id leaks. Each is keyed by a high-entropy, per-assignment `token` delivered as the assessment link (URL + localStorage). A holder can read/write only that one assignment. This is the intended counselor→student shared-link flow; binding to a session would break it. Logged as a hardening recommendation (short-lived/single-use tokens), not changed in Phase 18.

## 3. Confirmed strengths

- **Student isolation:** every `/api/student/*` route scopes reads/writes to `session.user.id`. Confirmed there is **no** student route that accepts a bare id without self-scoping (except the counselor 360 GET, which is separately authorized via `loadAuthorizedStudent`).
- **Counselor authorization:** `loadAuthorizedStudent` performs 4 checks (auth → role COUNSELOR/SUPER_ADMIN → assignment to the calling counselor → tenant match). Verified across all `/api/counselor/students/[id]/…` routes.
- **Tenant isolation** for non-super-admins: `student.tenantId === session.user.tenantId` enforced. (SUPER_ADMIN intentionally bypasses — documented as an intended privilege to confirm.)
- **Credentials:** bcrypt (cost 12), generic login/register errors (anti-enumeration), rate-limited login & register, honeypot on register, `isActive`/tenant-active gating at login.
- **Secrets:** `.env*` gitignored, no committed secrets, no `NEXT_PUBLIC_*`, no `process.env` in client components, `passwordHash` stripped from all user/counselor responses.
- **No raw trace exposure in normal flows:** `sanitizeCareerMatch()` strips internal `trace`; no `JSON.stringify(error)`, no `<pre>` data dumps in the counselor 360 or student pages.

## 4. Documented P1 / P2 recommendations (not all built)

| # | Item | Recommendation | Severity |
|---|------|-----|----------|
| 1 | Middleware only redirects auth pages; no central API guard | Add an edge guard for `/api/*` (with public whitelist) so a forgotten per-route `getServerSession` can't expose a route | P1 |
| 2 | JWT sessions not revocable on disable/password change | Per-request `isActive`/token-version check; or periodic session validation | P1 |
| 3 | `/api/public/logo?email=` returns a per-user brand response | Key by tenant (not email) and/or rate-limit to prevent account enumeration | P1 |
| 4 | Register auto-creates/falls back to first tenant on unknown subdomain | Restrict auto-tenant creation / explicit host binding | P1 |
| 5 | Assessment token routes are bearer-only | Short-lived, single-use tokens; keep shared-link UX | P1 |
| 6 | Forgot-password non-functional | Wire an email + reset flow (needs provider decision) | P1 |
| 7 | Raw `err.message` in two admin/pref endpoints | Return generic messages, log detail server-side | P2 |
| 8 | Inconsistent password policy (min 8 vs min 6) | Align to min 8 everywhere | P2 |
| 9 | `admin/counselors` GET returns most of `counselorProfile` | Select only needed fields | P2 |
| 10 | `/api/institutions` full dataset unauthenticated vs CSV gated | Decide explicit public/private stance | P2 |
| 11 | No audit-logging of sensitive admin actions | Add an audit table | P2 |
| 12 | `actions` PATCH reads body twice | Read once | P2 |

## 5. Notes on deliberate limits

- The assessment **bearer-token** design and **SUPER_ADMIN cross-tenant privilege** are intended; Phase 18 preserved them rather than assuming they are bugs.
- No authentication code was weakened; new endpoints (landing `/`, demo `/demo`) are public marketing surfaces with no data access.