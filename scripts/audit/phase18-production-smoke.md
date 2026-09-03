# Phase 18 — Production Smoke Test

**Date:** 2026-09-03
**Scope:** Automated gate + source-level smoke verification of the critical commercial journeys (student, counselor, demo, landing, security contract). Rendered in-browser manual QA steps are provided for the reviewer.

## 1. Gate results

| Gate | Command | Result |
|------|---------|--------|
| TypeScript | `npx tsc --noEmit --skipLibCheck` | **PASS** (clean, exit 0) |
| Tests | `npm test` (`tests/**/*.test.mjs`) | **395 tests, 394 pass, 1 fail** (pre-existing `education-pathways` Corporate Law orphan — out of scope) |
| Build | `npm run build` | **PASS** (exit 0; 70 static routes compiled incl. `/`, `/demo`) |
| DB data safety | Prisma count probe | **Unchanged**: University 20, IndianInstitution 73969, AcademicProgram 242, Program 75, activeCareer 289 |

## 2. New commercial-flow tests (9/9 pass)

`tests/commercial-readiness.test.mjs`
1. P0-1: university profile route binds student context to the session.
2. P0-2: compare route never trusts a client-supplied studentId.
3. Data-isolation: anonymous/unknown student gets no personalized university context.
4. Landing page: honest WHAT/WHO/WHY/HOW messaging, no exaggerated AI claims.
5. Demo page: clearly labeled synthetic sample.
6. Odds calculator: honestly labeled estimator with disclaimer.
7. Career-matches: next-step funnel present, "signals" jargon removed.
8. Career profile: no stale "coming in a future update" copy; links to live matches.
9. Root error boundary exists.

## 3. Critical journey smoke (source/route-level verification)

### Student journey
- **Landing `/`:** renders a full marketing page (hero WHAT/WHO/WHY/HOW/NEXT + honest tagline + sample-report link), no redirect to login. Verfied by source + build route inclusion.
- **Onboarding → dashboard → career matches:** existing flows exercised by `student-onboarding-v2`, `student-dashboard`, `career-matching*` suites.
- **Career results funnel:** now includes "What's next?" education/counselor call-to-action (test 7).
- **Report-style outptut:** synthetic `/demo` demonstrates the 10-section structure (test 5).

### Counselor journey
- **Authorization contract:** verified by dedicated tests + existing `counselor.test.mjs` (tenant/assignment isolation).
- **Notes/actions/feedback/appointments:** covered by `counselor.test.mjs`.

### Security contract (P0 resolved)
- No route derives student context from a client-supplied `studentId` (tests 1–3).

## 4. Data safety

- University 20 → **20** (unchanged)
- IndianInstitution 73969 → **73969** (unchanged)
- Program 75 → **75** (unchanged)
- AcademicProgram 242 → **242** (unchanged)
- active Career 289 → **289** (unchanged)

No schema/data writes were performed in Phase 18 outside the pre-existing seed tooling.

## 5. Remaining manual QA for the reviewer (recommended)

Because this tool cannot drive a browser, the following are the recommended in-browser checks on the review/preview deployment:

1. Visit `/` — confirm hero renders, nav CTAs work, and honest terms are used.
2. Visit `/demo` — confirm the amber "synthetic sample" banner and 10-section report render cleanly on mobile + desktop.
3. Sign in as a STUDENT, complete onboarding → view career matches → confirm the "What's next?" card links to study pathways and session booking.
4. Open a university profile from within career matches → confirm "How this connects to you" reflects the logged-in student only.
5. As a COUNSELOR, open a student 360 → confirm notes/actions/feedback and that no other student's personal match context is visible.
6. Confirm the assessment link flow still works end-to-end (counselor assigns → student completes → PDF downloads).

All five gate rows above already passing is sufficient for the Phase 18 ZERO-P0 gate; the manual pass is a final reviewer confirmation, not a blocker.