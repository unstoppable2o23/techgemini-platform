# Phase 19 — University Profile Intelligence — Final Report

**Date:** 2026-08-28
**Engine:** Frozen (Phase 16 program-aware matcher unchanged, verified > curated > category)
**Data:** READ-ONLY (University 20, IndianInstitution 73,969, Program 75) — profiles are READ VIEWS

## 1. Field inventory (what can honestly be shown)

**University (global):** name, country, region, qsRank, status, size, focus, research, overallScore, academicRepScore, employerRepScore, facultyStudentScore, citationsScore, intlFacultyScore, intlStudentScore, employmentScore, sustainabilityScore, domains, webPages, logoUrl — qsRank/scores partial (“Not available” when null), never influence matching (display-only).

**IndianInstitution (India):** name, type, state, district, website, yearOfEstablishment, location, institutionType, management, universityName, source — district/website/yearOfEstablishment/location/institutionType/management partial (“Not available”).

**Program:** name, level, studyMode, duration, source, sourceUrl, verificationStatus, verifiedAt, degree (via Degree.name), specialization (via Specialization.name) — all present for VERIFIED (75), level/studyMode/duration partial.

**Out of scope (explicitly do not exist, never shown):** tuition, acceptance rate, eligibility invention, campus details, facilities, history, rankings in scoring — all “Not available” or omitted, never blank placeholder that looks real.

## 2. Profile structure implemented (student + counselor)

**Identity:** Official name, location (country/state/city/district where data exists, else “Not available”), dataset type (India institution / international university), type, institutionType, management, website, domains/webPages, qsRank, logoUrl.

**Programs:** Grouped by Degree, specializations per program, verification badge (✓ Verified program / Relevant institution / Not yet verified), source and verifiedAt visible for verified, freshness badge, programs with no evidence NOT listed.

**Source freshness:** CURRENT (≤12 months), RECENT (≤24), HISTORICAL (>24), UNKNOWN (no date) — computed at read time from verifiedAt, thresholds documented in `src/lib/university-profile/freshness.ts` as `FRESHNESS_THRESHOLDS` (CURRENT_MONTHS 12, RECENT_MONTHS 24).

**Career context (student-specific):** When opened from matching flow (`?studentId=&careerId=`), shows `Career → Education → Verified program → Institution` chain, `matchScore`, `confidenceScore`, `reasons` — reused from Phase 16 `getUniversityMatchForInstitution` (same engine, no fork). When opened without student context (direct browse), neutral profile with no fake personalization.

**What never shows:** Admission probability, invented tuition/fees/living costs, fabricated facilities/rankings/history, internal scoring field names, “best university” claims.

## 3. Source freshness: thresholds, computation, UI treatment

- **Thresholds:** `CURRENT_MONTHS 12`, `RECENT_MONTHS 24` — constants in `freshness.ts`, not magic numbers.
- **Computation:** `computeFreshness(verifiedAt)` at read time — `(now - verifiedAt) / 30.44` months → CURRENT/RECENT/HISTORICAL/UNKNOWN. Overall freshness = most recent verified program’s freshness, or UNKNOWN if no verified.
- **UI:** Freshness badge next to verification badge — “✓ Verified program · verified Mar 2025 (Current)” vs “✓ Verified program · verified 2022 (Historical)” vs “UNKNOWN — no verifiable date”. Stale data shown WITH its age, never silently. `verifiedAt` never backfilled if null.

## 4. API changes (additive; matching API unchanged)

**New profile API (additive, bounded, indexed, explicit nulls):**
- `GET /api/universities/[id]/profile?dataset=indian|global&studentId=&careerId=&degreeId=&specializationId=&page=&limit=` — returns `identity` (with “Not available” for missing), `programs` (byDegree, all paginated, total, verifiedCount, hasVerified, page/totalPages/limit), `freshness` (overall, programFreshness), `studentContext` (when applicable, with pathwayChain), `hasPrograms`, `hasVerifiedPrograms`, `isEmpty`, `_future` (fitTiers, comparison null for Phase 20/21).
- Bounded: `take: 100` per profile, `limit` 1–100 (default 50), `page` param, indexed queries (Program by `indianInstitutionId`/`universityId`, `verifiedAt` desc).
- Same API serves student UI and counselor view (role-based field exposure is fine, logic forks are not).
- **Matching API unchanged:** `GET /api/student/university-matches` and `GET /api/student/university-matches/[institutionId]` still return `institution`, `program`, `degree`, `specialization`, `verificationStatus`, `matchScore`, `confidenceScore`, `reasons` — extended compatibly to include `program` when verified, not breaking.

## 5. Counselor view: confirmation of shared matching logic (no fork)

- Counselor calls `GET /api/counselor/students/[id]/university-profile?institutionId=&dataset=&careerId=` — verifies `loadAuthorizedStudent`, then calls **same** `getUniversityProfile` with `studentId` (reuses Phase 16 `getUniversityMatchForInstitution`).
- Shows: why recommended (`reasons` counselor-readable), which program matched (with verification + freshness), student prefs (country, target institutions, budget where reliable, education pathway, career context), full chain `Career → Education → Degree/Specialization → Program → Institution`.
- **No separate counselor matching logic** — if counselor needs data student API doesn't return, same API is extended, not forked — verified via test `Counselor view: identical match results`.

## 6. Future-proofing: how Phase 20 and 21 will consume this API

- **Static profile data:** `identity`, `programs` (exists regardless of student) — Phase 20 fit tiers will be computed from `matchScore`/`confidence` + `verificationStatus`, no profile refactor.
- **Student-context data:** `studentContext` (match result, pathway chain) — Phase 20 will map `matchScore` + `verificationStatus` to `Strong Fit / Good Fit / Potential Fit / Explore` (with “Strong profile fit” not “safe admission”) without changing profile shape.
- **Future overlay data:** `_future.fitTiers` and `_future.comparison` are null placeholders — Phase 21 will populate comparison flags (side-by-side) via same additive pattern.
- Clean separation ensures Phase 20/21 consume `GET /api/universities/[id]/profile` **without refactoring**.

## 7. Data gaps surfaced by profiles

- **Institutions with no verified programs:** Many Indian institutions (73,969 total, only ~30 have verified programs) — profile shows “No verified programs on record for this institution yet.” (honest empty state, not blank).
- **Programs with missing level/studyMode/duration:** Some verified programs have null duration/studyMode — shown as “Not available”, not invented.
- **Stale data:** Programs verified 2022 would show HISTORICAL — none currently stale (all 2026-08-28, so CURRENT), but system correctly handles it.
- **Missing fields:** qsRank, region, district, website for many — shown as “Not available”, never placeholder. Input to future data phases: need more verified programs for Business/Finance (still 13.9%), Law (20%), Arts (3.6%), Other (10.3%), and Master's levels.

## 8. Tests / typecheck / lint / build results

- **Tests:** `tests/university-profile.test.mjs` (10 new): profile with verified (badges/sources/freshness), no programs (empty state), partial data (Not available, no crash), freshness boundaries (4 cases, thresholds documented), with context (pathway chain + reasons), without context (neutral), counselor identical, pagination, absence markers, regression (engine frozen) — plus `tests/program-verified.test.mjs`, `tests/university-matching.test.mjs`, `tests/university-expansion.test.mjs` — **217 pass, 0 fail**
- **Typecheck:** `tsc --noEmit --skipLibCheck` — **pass** (fixed `useParams`/`useSearchParams` to props)
- **Lint:** `next lint` — Invalid project directory (pre-existing, no eslint config)
- **Build:** `next build` — **pass** (new route ` /universities/[id]` added)

## 9. Regression results (Phases 16-18 suites)

- Phase 16 program-aware matching: 207 tests — pass (curated 85, verified 100, confidence, deterministic ranking, career→education→program)
- Phase 17 expanded programs: 62→75 programs — pass (counts 20-75, India/Intl, no fabricated source)
- Phase 18 institutions: 11 new institutions + 13 programs — pass (import idempotent, no cross-dataset duplicates, country filtering, budget safe)
- Career Matching + Education flows: unchanged — pass

## 10. Safety confirmation: zero writes to University, IndianInstitution, Program records; no fabricated content; no admission claims; rankings not introduced into any scoring

- **University rows modified:** 0 (20 unchanged)
- **IndianInstitution rows modified:** 0 (73,969 unchanged)
- **Program rows modified:** 0 (75 unchanged, profiles are READ VIEWS)
- New fields are additive schema (profile aggregates, not institution writes) — verified via `git diff` (only new `src/lib/university-profile/` + `src/app/universities/[id]/page.tsx` + `src/app/api/universities/[id]/profile/route.ts` + counselor route, no institution writes)
- No invented tuition/fees/living costs, no acceptance rates, no eligibility, no “competitive” language, no internal scoring fields exposed, no “best university” claims
- Rankings (qsRank) displayed where exists, never influence `scoreInstitution` (weights unchanged, verified in `score.ts`)
- Freshness never backfilled, stale never presented as current
