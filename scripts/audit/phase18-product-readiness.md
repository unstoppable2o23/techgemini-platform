# Phase 18 — Commercial Product Readiness Audit

**Date:** 2026-09-03
**Phase:** 18 (Commercial Product Readiness & Launch V1)
**Baseline:** Phase 17 complete, pushed (`64eeb1f`). Baseline branch `master` in sync with `origin/master`.
**Method:** Live code inspection of the app surfaces (landing, auth, student onboarding/dashboard/assessment/results, career/program/university recommendations, counselor dashboard/admin, reports, appointments, leads, mobile, error/loading/empty states) plus a focused security review of API routes and authorization. No production data was modified during this audit.

---

## 1. Product surfaces inventoried

| Surface | Route | Status |
|---------|-------|--------|
| Landing page | `/` | Was a bare `redirect("/auth/login")` — no marketing surface |
| Demo / sample report | `/demo` | Did not exist (added in Phase 18 as synthetic demo) |
| Auth (login/register/forgot) | `/auth/*`, `/api/auth/*` | Password reset flow non-functional |
| Student onboarding | `/career-preferences`, `/dashboard` | Composable 5-step flow, coherent |
| Student dashboard | `/dashboard`, `/api/student/dashboard` | Strong, action-oriented |
| Career matches | `/career-matches`, `/api/student/career-matches` | Good; funnel CTA + jargon gaps |
| Career detail | `/career-library/[slug]`, `/api/careers/[id]/*` | Rich, honest disclaimers |
| Career → Program | `/api/careers/[careerId]/programs` | Present |
| University detail | `/universities/[id]`, `/api/universities/[id]/profile` | **P0: arbitrary-studentId leak (fixed)** |
| University compare | `/compare`, `/api/student/compare` | **P0: client-supplied studentId (fixed)** |
| Shortlist / saved | `/shortlist`, `/saved`, `/api/student/shortlist` | Functional; minor saved-state gap |
| Indian colleges | `/indian-colleges` | Functional |
| College finder | `/college-finder` | Functional |
| Odds tool | `/odds-calculator` | Overstated "AI" claim (fixed) |
| Solidity of report/PDF | exam result PDF only | Assessment-result PDF exists; full 10-section report recommended |
| Counselor list | `/counselor/students` | Functional, strongly authorized |
| Counselor 360 | `/counselor/students/[id]` | Comprehensive 7-tab view |
| Counselor notes/actions | notes + actions APIs | Functional |
| Mobile/responsive | global | Consistent responsive grids + bottom nav |

---

## 2. Issue classification

### P0 — blocks demo / sale / safe use (4 found → 2 fixed, 2 qualified below)

| # | Issue | File | Resolution |
|---|-------|------|------------|
| P0-1 | **Unauthenticated endpoint accepted arbitrary `?studentId=`** and returned that student's personalized match context (scores, confidence, reasons, matched program) to any caller. | `src/app/api/universities/[id]/profile/route.ts` | **FIXED** in Phase 18: now requires a session and derives the subject student from `session.user.id`; client-supplied `studentId` is ignored. |
| P0-2 | **Authenticated client could pass arbitrary `studentId`** in the comparison body, overriding the session id and leaking another student's match context. | `src/app/api/student/compare/route.ts` | **FIXED** in Phase 18: `effectiveStudentId` is now forced to `session.user.id`. |
| P0-3 | **Assessment assignment routes are unauthenticated** (token-only): `progress`, `complete`, `retake`. | `src/app/api/tests/assignments/{progress,complete,retake}/route.ts` | **Qualified to P1, documented.** The token is a high-entropy, per-assignment bearer credential delivered to the student as the assessment link (counselor → student, URL + localStorage). Someone with a specific token can read/write *that assignment's* answers, but cannot enumerate or read *other* students' assignments. This is the intended shared-link flow. Full session-binding would break that flow; recommended hardening is short-lived/single-use tokens (see §4). Not a cross-student arbitrary-id leak like P0-1/P0-2. |
| P0-4 | **Forgot-password is non-functional**: shows "sent" but sends nothing; no reset page/route exists. | `src/app/auth/forgot-password/page.tsx` | **Qualified to P1, documented.** Blocks password recovery (production usability), not a data-isolation leak. Requires an email/reset infrastructure decision before build (see §4). |

### P1 — serious UX / reliability / hardening (documented; some fixed)

| # | Issue | File | Resolution |
|---|-------|------|------------|
| P1-1 | Landing `/` was a bare redirect — no sales positioning. | `src/app/page.tsx` | **FIXED**: full WHAT/WHO/WHY/HOW/NEXT marketing surface built with honest framing. |
| P1-2 | "AI Odds Calculator" overstated (deterministic heuristic, no AI); no disclaimer. | `src/app/(student)/odds-calculator/page.tsx` | **FIXED**: relabeled "Chance Estimator", plain-language disclaimer added. |
| P1-3 | Stale contradictory copy: "career recommendations coming in a future update" while career-matches is live. | `src/app/(student)/career-profile/career-profile-client.tsx` | **FIXED**: replaced with live link + honest framing. |
| P1-4 | Career-results page lacked direct next-step CTAs (education/university/counselor). | `src/app/(student)/career-matches/career-matches-client.tsx` | **FIXED**: added "What's next?" funnel card. |
| P1-5 | "career signals" internal jargon shown to students. | career-matches description | **FIXED**: plain-language description. |
| P1-6 | No global error boundary; error UI only on career-matches. | `src/app/` | **FIXED**: added root `src/app/error.tsx`. |
| P1-7 | No middleware-level API auth guard; per-route `getServerSession` only. | `src/middleware.ts` | Documented hardening recommendation (§4). |
| P1-8 | `register` route auto-creates / falls back to a first tenant on unknown subdomain. | `src/app/api/auth/register/route.ts` | Documented review item (§4). |
| P1-9 | `/api/public/logo?email=` leaks a per-user brand response, enabling account enumeration. | `src/app/api/public/logo/route.ts` | Documented recommendation: key by tenant rather than email, or rate-limit (§4). |
| P1-10 | JWT sessions are not revocable on disable/password change (7-day tokens). | `src/lib/auth.ts` | Documented review item (§4). |
| P1-11 | Bearer-token assessment routes (P0-3 above). | tests assignment routes | Documented (§4). |
| P1-12 | Forgot-password non-functional (P0-4 above). | auth | Documented (§4). Assessed as P1 usability after qualification. |

### P2 — polish (documented, low-risk, largely not changed to avoid churn)

| # | Issue | Resolution |
|---|-------|------------|
| P2-1 | `SaveButton` never reflects pre-existing saved state on revisit (dashboard/list). | Minor UX; shortlist pages handle their own state. Not changed in Phase 18. |
| P2-2 | `/api/institutions` returns the full pageable dataset without auth while CSV requires auth. | Inconsistent control; data is non-PII reference data. Not a blocker. |
| P2-3 | Admin `counselors` GET returns full `counselorProfile` (UPI/payment fields) minus `passwordHash`. | Hardening nicety. |
| P2-4 | Raw `err.message` returned in `admin/universities/upload` and `student/career-preferences`. | Controlled contexts; minor cleanup. |
| P2-5 | Inconsistent password policy (public register min 8 vs counselor-created min 6). | Align to 8 recommended. |
| P2-6 | No audit-logging of sensitive admin actions. | Documented recommendation. |
| P2-7 | `/counselor/students/[id]/actions` PATCH reads `request.json()` twice. | Functional bug worth cleaning. |
| P2-8 | `SUPER_ADMIN` bypasses tenant isolation by design in `loadAuthorizedStudent`. | Confirm intended privilege. |
| P2-9 | Career Profile page exposes raw signal dimension labels like "interest intense". | Cosmetic; contextualized under dimension labels. |
| P2-10 | Assessment-result-only PDF; no combined counselor report PDF. | Enhancement (§4). |
| P2-11 | Duplicate test-link "Back to home" now resolves to the real landing page (improved). | N/A |

---

## 3. Journey coverage at audit time (before Phase 18 fixes)

- **Student journey:** on-boarding → dashboard → career matches → career detail → education pathway → university shortlist → counselor handoff all exist and connect. Funnel was weakest at the career-results → education/university transition and on the non-existent landing page.
- **Counselor journey:** student list → Student 360 (7 tabs) → notes/actions/appointments/feedback all present, with strong authorization (`loadAuthorizedStudent`: auth + role + assignment + tenant). No combined report/PDF export.

---

## 4. Documented recommendations (not all built in Phase 18 — scope control)

These are logged as input to future hardening, not implemented here to avoid over-engineering or breaking working flows:

1. **Middleware API auth guard** with a public whitelist to enforce `getServerSession` centrally (prevents any forgotten per-route guard from exposing a route).
2. **Short-lived / single-use assessment tokens** to limit the bearer-token window (asset: test assignment flow).
3. **Email + password-reset infrastructure** for the forgot-password flow (requires an email provider decision).
4. **Replace `/api/public/logo?email=`** with a tenant-keyed lookup and/or rate limiting to stop account enumeration.
5. **Per-request `isActive` / token-version check** to allow revocation of disabled users.
6. **Align password policy to min 8** across all account-creation paths.
7. **Audit-logging table** for sensitive admin actions (counselor creation, password resets, feature toggles).
8. **Full 10-section counselor report PDF** using the existing `html2canvas`/`jspdf` capability already in the exam result flow.

---

## 5. Data safety confirmation

Per Phase 18 scope control (no data expansion): **University count unchanged, IndianInstitution unchanged, Program count unchanged, active Career count unchanged** by this phase. No `prisma db push --accept-data-loss`, no DB reset, no dataset rewrites. A DB baseline probe is recorded in `phase18-final-report.md` before/after to demonstrate parity.