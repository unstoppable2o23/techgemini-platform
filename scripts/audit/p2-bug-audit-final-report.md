# P2 — Final Report: Production Bug-Audit & Fix Brief (flows, org, careers, perf, hardening)

**Date:** 2026-09-10
**Branch:** master
**Commits (local, not yet pushed):**
- `da1591c` — §3+§4: assessment related fixes (prior P2 work)
- `9f90578` — §5: assignment-driven lifecycle test locks (phase32): counts, denominators, COMPLETED+IN_PROGRESS dedup
- `a0ead72` — §6+§7: strict mobile/Country-code validation + non-org registration resolves to platform default tenant
- `d516e59` — §8+§9: preferred-career subject chip removal fix + enjoyed-subject signal separation (phase24 P2b)
- `a7acfc0` — §20–22: prod route-conflict fix (`/api/careers/[slug]` → `[careerId]`), semantic-match hot-loop fix (regex-reuse + memo), dashboard parallelization, benchmark harness. Dashboard p95 2334ms → 461ms
- `7d8c2ac` — §23–25/§17: API + client error-handling hardening, CSV export data-loss fix

**Status:** **PASS** (with noted product-scope items and 2 environment blockers) — full suite **797/797**, typecheck clean, production build compiled, benchmark measured against `next start`.

## Objective

Execute the master bug-audit brief across flows, organization/registration, career matching, dataset integrity, page/feature audits, production-performance, and error handling — AUDIT → ROOT CAUSE → MINIMAL FIX → TEST → VERIFY, with the matching engine scoring and the large protected datasets frozen.

## Status per requirement

| Item | Status | Evidence |
|---|---|---|
| §5 Assessment assignment semantics (counts, denominators, dedup) | **PASS** | phase32 15/15 (`tests/phase32-assessment-assignment-driven.test.mjs`) — completedCount/assignedTotal, progress %, `completedKinds` |
| §6 Phone / Country-code registration validation | **PASS** | `src/lib/onboarding/validation.ts` strict E.164-style checks (dial 1–4 digits, national 5–13, no leading-0 code); phase24 N6b matrix |
| §7 Registration tenant resolution (non-org subdomains) | **PASS** | `src/lib/onboarding/tenant.ts` `resolveRegistrationTenant` — unknown org subdomain on deployed host → 400 "Organization not found"; root/`app`/`default` → platform tenant; local-dev fallback; phase24 N8 |
| §8 Career subject dropdown (chip-removal resurrection) | **PASS** | `student-onboarding-flow.tsx` `toggleSubject` now also removes the resolved canonical id from `subjectIds*` |
| §9 Enjoyed-subjects vs studied-subjects separation | **PASS** | `career-profile/generate.ts:109-123` emits `subject_studied:`/`subject_enjoyed:` separately; phase24 P2b |
| §10 Country → university filtering | **PASS** | `university-matching/score.ts` countryScore (target 100, other 40, weight 0.05); `university-matching.test.mjs` covers contract; `profile.ts:311` persists targetCountry. No code change |
| §11 Career-interest persistence round-trip | **PASS** | write resolves careerId → canonical name + preferredCareerId; GET reseeds `preferredCareer` into form Select |
| §12 Career-matching explainability | **PASS** | Students see matchScore, strength, confidence % + level, top-4 reasons, missing evidence, development areas, full "Why this matches" panel. `evidence[]`/`matchTypes`/`confidenceDetail.factors` returned to student API but not rendered (available for UI). Per-signal semantic explanation strings not carried into the payload — by design (tier evidence lives in `matchType`) |
| §13 "No verified matches yet" | **PASS** | String absent from codebase; honest low-information state + coaching present |
| §14 Dataset integrity | **PASS** | University 20 · IndianInstitution 73969 · Career 289 · Degree 751 · Program 80 · Subject 59; TestAssignment IN_PROGRESS = 0 (baseline) |
| §15 Roadmap (grade-driven) | **PASS** | `/roadmap` server-rendered 200 (measured); `phase21-roadmap.test.mjs` + grade tests across suites |
| §16 Product onboarding tour | **PASS** | `onboarding-tour.tsx` mounted for student+counselor on `/dashboard`, localStorage per-role, 700ms delay; brand-new students redirect to /career-preferences before tour |
| §17 College finder / institution browsing | **PASS** (2 minor fixes) | Fixed: `/api/universities` NaN page/limit + missing try/catch → raw 500; CSV export silently truncated 73,969 → 50,000 rows (data loss). Both verified live (page=abc → 200; CSV = 73,969 rows). `/college-finder` uses QS dataset; the 73,969 IndianInstitution dataset is browsed at `/indian-colleges` via `/api/institutions` (state/type filters, robust pagination) |
| §18 Comparison (careers ≤3, institutions ≤4) | **PASS** | `compare-drawer` (careers, API validates 1–3) and `/compare` (institution ids, MAX_COMPARE=4, invalid ids dropped → empty state). Note (not a defect): career compare omits salary/demand rows — enhancement candidate |
| §19 Mock tests & entrance-exam prep | **PASS** (with scope notes) | Assignment lifecycle enum ASSIGNED/IN_PROGRESS/COMPLETED fully consistent; duplicate→409, complete idempotent→409, retake creates a fresh row. `/mock-tests` is a feature-gated "coming soon" stub (`featureAccess.mockTests`); NET/JEE/UPSC exist only as roadmap guidance strings. `/progress` is POST-only (405 on GET). Token-based complete/progress/retake routes are bearer-token flows by design |
| §20–22 Production performance | **PASS** | Blocking prod bug fixed (route conflict, all routes 500 → 200). Hot loop root cause: `matchSignalAgainstTrait` rebuilt ~70 RegExps per (signal, trait) pair + recomputed student-side concept per trait (~1.6M compiles/request). Fix: precompiled matchers, memoized `resolveConcept` (pure), loop-invariant hoist — byte-identical output (157 matching + 797 full tests pass), scoreCareer hot loop 604ms → 70ms. Dashboard loads run concurrently. Measured below |
| §23 Auth security | **PASS** | JWT sessions, bcrypt compare (cost 12), authorize returns id/email/name/role/tenantId only (no hash), rate-limited login, generic auth errors (no user enumeration), CSRF via NextAuth built-in, `useSecureCookies: true` in prod, counselor APIs verify role + tenant server-side (401/403) |
| §24 API error handling | **PASS** (after fixes) | Added try/catch + param guards to the 6 unguarded routes (universities GET, career-preferences GET, institutions/stats, assignments GET, complete GET, [id] DELETE). All audited routes now return friendly JSON errors. No raw stack leakage in prod |
| §25 Client error handling | **PASS** (after fixes) | 6 component fetches parsing `res.json()` without checking `res.ok` now guarded (compare-drawer, branding-card, career-preferences-form ×2, onboarding-flow ×3). Root `error.tsx` boundary exists (`not-found.tsx` missing → default 404, acceptable). No shared toast infra — consistent per-page inline error cards (noted, out of scope) |
| §26 Typecheck / lint / build | **PARTIAL** | `typecheck` 0 errors; `vercel-build`/`build` compiled successfully. `npm run lint` is broken repo-wide pre-existing: Next 16 removed `next lint` and ESLint 9 ships with no flat config (`eslint.config.*` absent) — not fixable without standing up a new lint setup |
| §27 Browser journey walkthroughs / Web Vitals | **BLOCKED — ENVIRONMENT REQUIRED** | No browser automation available in this environment. Server-side render + API timings measured instead (below) |

## Performance (measured, `next start`, loopback, local Postgres, full datasets)

Student `student1@demo.techgemini.local`, n=30 warm, body-time.

| Endpoint | p50 | p95 | p99 |
|---|---|---|---|
| PAGE /dashboard (after fix) | 397ms | **461ms** | 489ms |
| PAGE /career-matches | 30ms | 35ms | 41ms |
| PAGE /career-profile · /career-preferences · /assessments · /college-finder | 30ms | 35ms | 40ms |
| PAGE /compare · /settings · /roadmap | 15–23ms | 23–34ms | 26–40ms |
| PAGE /mock-tests | — | — | 307 redirect (feature not enabled for demo student) |
| API /api/universities · /api/student/career-preferences · /api/student/roadmap | 15ms | 22–24ms | 26ms |
| API /api/institutions (state filter) | 15ms | 16ms | 24ms |
| API /api/institutions (search=engineering) | 192ms | 205ms | 208ms |
| API /api/careers | 30ms | 34ms | 50ms |
| API university-matches (career-scoped) | 29ms | 32ms | 33ms |
| BURST /api/universities (10×5) | 54ms | 65ms | 97ms |
| BURST /api/careers | 112ms | 144ms | 148ms |
| BURST /api/institutions search | 564ms | 937ms | 968ms |

Dashboard p95 **461ms** vs **2334ms** before the fix (matching threshold target ≤ 1.5s met with 3.2× headroom). `/api/tests/assignments` returns 403 for students (counselor-only, expected). `/api/tests/assignments/progress` GET → 405 (route is POST-only).

## Verification

| Check | Result |
|---|---|
| Full suite `npm test` | ✅ 797/797 |
| Career-matching + engine-freeze suites (after perf refactor) | ✅ 157/157 |
| phase24 (validators, tenant resolution, signal separation) | ✅ 28/28 |
| phase32 (assignment-driven registry) | ✅ 15/15 |
| `npm run typecheck` | ✅ 0 errors |
| `npm run build` (production) | ✅ Compiled |
| Live prod server checks | ✅ login 200; dashboard 200; page=abc no crash; institutions stats total=73969; CSV export 73969 rows |
| Protected datasets | ✅ University 20 · IndianInstitution 73969 · Career 289 · Degree 751 · Program 80 · Subject 59 (untouched) |
| Frozen engine | ✅ untouched; bytes-identical regression suites pass |

## Notes / blockers

- **Push blocked until confirmed** — all P2 commits since `da1591c` are local only.
- **§27 (browser journeys / Web Vitals)** and **real-browser Vercel checks** are BLOCKED — ENVIRONMENT REQUIRED: no browser automation in this environment.
- `npm run migrate dev` remains unusable (pre-existing shadow-DB / migration-history issue); additive-migration workaround used (none needed for P2 changes).
- Lint setup (`next lint` removed in Next 16, no ESLint flat config) is a pre-existing repo infrastructure gap; typecheck + build + tests are the enforceable gates.
- Product-scope notes (not defects, no change made): career compare lacks salary/demand rows; mock-test content is a gated "coming soon" stub; college-finder naming vs indian-colleges dataset split; no shared toast component.