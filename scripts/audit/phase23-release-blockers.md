# Phase 23 — Release Blockers & Issues Log

**Date:** 2026-09-05

Scope: issues found during Phase 23 real-world launch verification on `techgemini-platform` @ `39f0840`.

## P0 — Launch blockers (must fix before any go-live)

**None.**

## P1 — Serious issues (zero new; 3 found, 1 accepted-with-mitigation)

### P1-1 ✅ FIXED — Roadmap step PATCH authorization gap (IDOR)
`src/app/api/student/roadmap/steps/[id]/route.ts:44-47` (original) checked ownership only when
`role === "STUDENT"`. Any other authenticated role (COUNSELOR, ORGANIZATION_ADMIN, SUPER_ADMIN)
skipped both the ownership and tenant checks and could update any roadmap step by guessing a UUID.
This self-service route is now STUDENT-only with a hard ownership check (staff manage roadmaps via the
counselor routes, which run `loadAuthorizedStudent`). Regression: `tsc` clean, full suite unchanged.

### P1-2 ✅ FIXED — Registration silently enrolls signups into an arbitrary tenant
`src/app/api/auth/register/route.ts:54-66` (original) fell back to `prisma.tenant.findFirst()` for any
unmatched subdomain (production root domain, raw IPs) and even auto-created a "Default Agency" tenant,
enrolling new students into an unrelated organization (cross-tenant data pollution / quota misuse).
Now unmatched subdomains are rejected with an honest 400 except on local dev hosts
(`localhost`, `127.0.0.1`, numeric-IP hosts), where the first-tenant fallback is kept for local demos.

### P1-3 ⚠️ ACCEPTED — Password self-service reset is non-functional
`src/app/auth/forgot-password/page.tsx` was a UI-only stub: submitting simply showed "you will receive a
reset link"; no API route existed under `/api/auth/*` and `src/lib/email.ts` is a `console.log` mock — no
email is ever sent. **Mitigation applied:** the page no longer makes a false claim; it directs users to
their counselor / org admin. Staff recovery path exists (`/api/counselor/students/[id]/password` resets an
assigned student's password). **Accepted for pilot** because real email delivery infrastructure (SMTP /
provider credentials) does not exist in this deployment. Implementation plan: add a reset-token flow
(hashed token + expiry on User), a `POST /api/auth/forgot-password` + `POST /api/auth/reset-password` pair,
and wire an email provider (e.g., Resend/SendGrid); gate behind a feature check before broad self-serve.

## P2 — Minor / follow-up (not launch-blocking)

| # | Issue | Location | Status |
|---|---|---|---|
| P2-1 | No consent/legal checkbox on registration; no server-side email-format, dateOfBirth, or mobile validation; some invalid values surface non-400 errors | `src/app/api/auth/register/route.ts`, `src/app/auth/register/page.tsx` | Documented |
| P2-2 | `/api/public/logo` returns account-existence signal (low-risk enumeration) | logo route | Documented |
| P2-3 | Honeypot field can leave a submit visibly loading when bot field present (client-side) | register page | Documented |
| P2-4 | Org-admin billing "Contact Sales" / "Request Demo" buttons are inert; `POST /api/commercial/request-demo` has no UI caller | `src/app/org-admin/org-admin-dashboard-client.tsx:464-466` | Documented (wire dialog → existing API) |
| P2-5 | Counselor career-match responses include `trace` (scoring internals) — violates `sanitizeCareerMatch` contract; staff-only scope so low risk | `src/app/api/counselor/students/[id]/career-matches/route.ts:28`, `src/lib/counselor/student360.ts:84-86,170` | Documented (deliberate staff exposure) |
| P2-6 | Dashboard tour highlight falls back to a centered box when a step target is absent (e.g., no tests yet) | `src/components/onboarding-tour.tsx:119-131` | Documented |
| P2-7 | No analytics / platform-event instrumentation (see implementation plan in final verification report) | — | Planned |
| P2-8 | SUPER_ADMIN bypasses `loadAuthorizedStudent` except on `features`/`password`/`status` routes (inconsistent 404s for cross-tenant SUPER_ADMIN) | `src/lib/counselor/access.ts` | Documented |

## Non-blocking observations

- Counselor PATCH on a shared student's action returns `updated: 0` instead of a cross-owner error; fail-closed.
- Registration refuses ambiguous subdomains on deployed hosts by design (P1-2).

## Pre-existing, NOT introduced by this phase

- `tests/education-institution.test.mjs:18` — polytechnic canonicalization assertion; user-deferred fix.
- `tests/education-pathways.test.mjs:39` — 11 careers have DEGREE_PATHWAY with no SUBJECT_LINK;
  `seed-education-orphans.mjs` intentionally skips careers that already have a pathway; pre-existing data-state.