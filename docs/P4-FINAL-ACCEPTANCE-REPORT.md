# P4 Final Production Acceptance Report

- **App:** SUHAIL — Career + Education Guidance Platform
- **Scope:** §3–§40 of the P4 acceptance brief against the current server-side state (branch `main`, tip `4518aa3` + P4 changes below)
- **Environment:** local Node.js production build (`next build` → `next start`, Next.js 14 App Router), Prisma, PostgreSQL
- **Verification tooling:** real-browser E2E via Playwright (chrome headful + headless, `playwright-core` 1.63.0) in `/dashboard`-adjacent scratch dir `%TEMP%\opencode\p4-browser`; fixtures and captures in `p4-output/`; server restarted with the accepted build before the final pass
- **Status vocabulary (per brief §38):** `PASS` / `FAIL` / `BLOCKED — BROWSER ENVIRONMENT REQUIRED` / `BLOCKED — PRODUCTION ENVIRONMENT REQUIRED` / `BLOCKED — DATA REQUIRED` / `IMPLEMENTED — NOT YET ACCEPTED` / `DEFERRED — FUTURE FEATURE`

---

## 1. Protected data & baseline integrity (§3)

`University` / `IndianInstitution` / catalog tables were **read-only** during the entire pass; the only writes were the transient acceptance fixtures below (all cleaned at the end) and no catalog mutation.

Final counts (after fixture cleanup, `p4-final-counts.mjs`):

| Table | §3 baseline | Final | Match |
|---|---|---|---|
| University | 20 | 20 | ✅ |
| IndianInstitution | 73969 | 73969 | ✅ |
| Career | 293 | 293 | ✅ |
| Degree | 751 | 751 | ✅ |
| Program | 80 | 80 | ✅ |
| AcademicProgram | 242 | 242 | ✅ |
| Subject | 59 | 59 | ✅ |
| Specialization | 726 | 726 | ✅ |
| TestAssignment | 0 | 0 | ✅ |
| CareerProgramMapping | 871 | 871 | ✅ |
| CareerTrait | 5971 | 5971 | ✅ |
| IN_PROGRESS exams | 0 | 0 | ✅ |

**Status: PASS** — counts exactly match the §3 baseline after the fixtures were cleaned.

## 2. Seed idempotency (§4)

`npm run seed` was verified re-runnable against the populated DB: degree lists are cleaned at write time (`scripts/phase16e1-data/degree-clean.mjs`), `isEmerging` is preserved when not authored, and no protected catalog is dropped or duplicated. Regression locked by `tests/phase16e1-seed-idempotency.test.mjs`.

**Status: PASS**

## 3. Standard gates (§5)

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS (0 errors) |
| `npx eslint` (full config) | PASS (0 errors; warnings are project-wide baseline) |
| `npm run build` (with `prisma generate`) | PASS (exit 0) |
| `npm test` | **801 / 801 pass** (33 suites, incl. 83 education-pathway tests) |

**Status: PASS**

## 4. E2E student journey (§6–§31)

Browser verification used fresh tenant `cms4mwqj90000k44ctu8luufa`; transient fixture student `p4.browser.student@demo.techgemini.local` (id `cmtv9hhtp0001voc6t574vl40`) plus counselor/assignment fixtures, all removed in the cleanup step.

| # | Check | Status |
|---|---|---|
| §7 | UI registration → auto-login redirect → dashboard | **PASS** (real browser) |
| §8 | Duplicate registration surfaces graceful error banner ("Unable to create account with these details", HTTP 409) | **PASS** |
| §9 | Subject signal independence (studied vs enjoyed) preserved end-to-end; DB verified `subjectsStudied: [Mathematics, Physics, Chemistry]` vs `subjectsEnjoyed: [Biology]` | **PASS** |
| §10–11 | 5-step onboarding wizard driven to completion (Indian / Maharashtra / Class 12 / 85% / studied Math·Physics·Chemistry / enjoyed Biology / career Ayurveda / USA / budget / funding / English); persisted on reload (nationality, subjects, career prefill); `completeness: 83` | **PASS** |
| §12 | All 5 assessment kinds (Stream, Ideal, Personality, Intelligences, Learning) completed in browser; report persists on re-open; `/assessments` shows 5 `Completed` badges | **PASS** |
| §13 | Career matches render and include the declared career (Ayurveda); matches reference Medicine cluster | **PASS** |
| §14 | Career library detail pages (Ayurveda, Homeopathy, Medicine) render with AYUSH, MBBS/BAMS/BHMS, NEET-UG, and counselling references | **PASS** |
| §15 | Career-library access is feature-flag gated (`featureAccess.careerLibrary`); gated-off users reach a dashboard redirect | **PASS** |
| §16 | Medical footsteps stay distinct (MBBS vs BDS vs AYUSH vs Nursing/Pharmacy/Physio) through engine guidance; 83 education-pathway tests green | **PASS** |
| §17 | AYUSH route-map v2: registry groups Integrated & Indian Systems of Medicine (AYUSH); roadmap re-personalizes to the learner's actual target — an Ayurveda/USA roadmap correctly surfaces Biology strength + USA shortlisting and does **not** fabricate an NEET requirement | **PASS** |
| §18 | Diploma/Polytechnic never labeled an engineering degree (source-verified in onboarding, career detail, and counselor student-360 guidance) | **PASS** |
| §19 | Up-to-date match surface; shortlist + compare render; compare shows the legitimate empty state ("No institutions selected for comparison.") with select-up-to-4 guidance | **PASS** |
| §20–22 | Exam result labels and education surface honest copy (no fabricated cutoffs/deadlines/eligibility verdicts); covered by tests + browser reports | **PASS** |
| §23 | Roadmap ("My Study Roadmap") renders personalized next steps for the fixture profile | **PASS** |
| §24 | College finder, Indian colleges (filters/state search), admissions guidance (NEET/JEE/CUET entrance references), shortlist all render | **PASS** |
| §25 | Messages surface renders ("No conversations" for a fresh student); conversation flow not exercised in this pass | **IMPLEMENTED — NOT YET ACCEPTED** (surface PASS, flow not browser-tested) |
| §26 | Scholarships: feature-gated correctly — flag-off student is redirected from `/scholarships` to `/dashboard`; full rendering with the flag on not re-exercised in this pass | **PASS** (gating); flag-on render **IMPLEMENTED — NOT YET ACCEPTED** |
| §27 | Settings / appointments pages render | **PASS** |
| §28–30 | Org-admin dashboard (`/org-admin`), admin counselors, and admin universities surfaces render (verified as `admin@demo.techgemini.local`, SUPER_ADMIN) | **PASS** |
| §31 | Counselor authorization boundary: authorized counselor `C1` sees the assigned student in `/students` roster, `student360` API returns **200 with full student360**, and their student-360 page renders; `C2` (different counselor / no assignment) gets **403 `{"error":"Forbidden"}`** at the API and a "You are not authorized to view this student" page | **PASS** |
| §32 | API error spot-checks: `POST /api/tests/assignments/progress {}` → **400 Invalid payload**; null answers → **400**; `POST /api/tests/assignments/complete` with bogus token → **404** (no 500s) | **PASS** |
| §35 | `/mock-tests` stub remains `DEFERRED — FUTURE FEATURE` | **DEFERRED — FUTURE FEATURE** |
| §34 | Build path used for CI (`prisma generate && next build`) is dev-server- and start-safe | **PASS** |

### Genuine defect found in this pass (fixed + re-verified)

- **Mobile horizontal overflow on `/dashboard`** (~89px, scrollWidth 480/479 at 390px viewport) — root cause: career-match `Card` items with `min-width:auto` blew out the single-column grid track on small screens. Fixed by adding `min-w-0` to the match `Card` (`src/app/dashboard/student-intelligence-hub.tsx`). **Re-verified in-browser at 390px: no overflow on dashboard/career-matches/college-finder/indian-colleges/assessments** (`mobile: no horizontal overflow on primary surfaces` → PASS in the final phase-3 run).

### Web vitals (local production build, sampled)

`PASS` for local sampling — CPU/network noise excluded; these are **local** figures, not production:

| Route | TTFB | LCP | CLS |
|---|---|---|---|
| /dashboard | 531 ms | 1.44 s | ~0.015 |
| /career-matches | 28 ms (client nav) | 836 ms | ~0.004 |
| /assessments | 34 ms (client nav) | 136 ms | 0 |

Production deployment performance is **BLOCKED — PRODUCTION ENVIRONMENT REQUIRED**.

## 5. Roles & guards (§28–§33)

- Student / counselor / org-admin / super-admin role guards verified at the page level during the browser pass (student-exclusive routes reject counselor visits; counselor routes redirect non-counselors; `/org-admin` accepts `ORGANIZATION_ADMIN`/`SUPER_ADMIN` only).
- Counselor pages live under the `(counselor)` route group at `/students` and `/students/[id]`; API scoping via `studentProfile.counselorId` → counselor's `CounselorProfile.id` returned the expected 200/403 asymmetry for authorized/unauthorized counselors (tenant mismatch also denied).

## 6. Honest limits

- **`BLOCKED — PRODUCTION ENVIRONMENT REQUIRED`:** no deployed-Vercel environment was reachable in this pass; production smoke test and production Web-Vitals are not claimed.
- **`BLOCKED — DATA REQUIRED`:** any guidance verdicts dependent on live per-institution admission data are documented as such in-app (surfaces show honest "why/next-step" copy rather than fabricated cutoffs); no fabrication was observed in the browser pass or in the 83-pathway suite.
- Transient fixtures (fixture student, 2 counselors, 5 exam assignments, exam results) created for this pass were **deleted** in the cleanup step; protected counts re-verified to the §3 baseline (see §1).

## 7. Conclusion

The current state is accepted for §3–§34 verified items. Remaining open items are production-environment verification (label only) and two `IMPLEMENTED — NOT YET ACCEPTED` surfaces whose full flows were not re-exercised in this pass (message conversation flow; scholarships rendering with the feature flag on). No failing gates remain.

**P4 source changes committed with this report** (uncommitted before this pass): `scripts/seed-career-intelligence.mjs` (seed idempotency hygiene, §4), `scripts/phase16e1-data/degree-clean.mjs` + `tests/phase16e1-seed-idempotency.test.mjs` (§4), and `src/app/dashboard/student-intelligence-hub.tsx` (mobile overflow fix).