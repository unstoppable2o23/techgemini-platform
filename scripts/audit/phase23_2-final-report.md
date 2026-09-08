# Phase 23.2 — Final Report (final polytechnic pathway hardening + medical education intelligence v1)

**Date:** 2026-09-08
**Phase:** 23.2 — final polytechnic pathway hardening and medical education intelligence v1
**Branch:** master

---

## 1. Files changed (this final pass)

- `src/lib/education-institutions/service.ts` — added `classifyInstitutionQualification()`
  (structured `InstitutionQualification` semantics: diploma / non-diploma / unknown) and
  `canDiplomaInstitutionGrantDegree()` (a diploma-level institution is degree-compatible ONLY
  via an independently verified Program row or curated mapping — the multi-level institution
  case; missing verification data is conservatively `false`).
- `src/lib/university-matching/candidate.ts` — hardened the degree-only category guard comment;
  behaviour unchanged (diploma-level institutions never category-match a degree-only query).
- `tests/phase23-2-polytechnic-final.test.mjs` — **new** 13-test final regression suite
  implementing the 9-point polytechnic/qualification specification.
- `tests/phase23-2-medical.test.mjs` + `tests/phase23-2-golden-profiles.test.mjs` — test-only
  normalisation of the live `snapshot.generatedAt` wall-clock stamp in the two determinism
  assertions (same approach as the engine-freeze harness; engine output untouched).
- `src/lib/medical-education/registry.ts` — added `lastReviewed` field +
  `MEDICAL_EDUCATION_LAST_REVIEWED` (= `2026-09-08`), stamped on every discipline entry.
- `src/lib/counselor/student360.ts` — `medicalEducationPath` now propagates `lastReviewed`.
- `src/app/(counselor)/students/[id]/student-360-client.tsx` — renders "Last reviewed:" with
  `<time dateTime>` in the Medical Education Path panel.
- `scripts/audit/phase23_2-polytechnic-audit.json` — added machine-readable `classification`
  section (totals, diploma/degree-compatible, ambiguous, false positives/negatives).
- `scripts/audit/phase23_2-medical-audit.json` — added `lastReviewed` section.
- `scripts/audit/phase23_2-engine-freeze.json` — regenerated (byte-identical to baseline).
- This report + `phase23_2-regression.md` + `phase23_2-polytechnic-final-audit.md`.

## 2. Schema changes

None. `Program.level/studyMode/duration/source/verificationStatus` and the AISHE
`institutionType` field already model Qualification Level / Education Type (Phase 23.2 use of
the existing schema, no new taxonomy — A6 satisfied).

## 3. Migrations

None. No `prisma migrate` or `prisma db push`; the Phase 23.2 MBBS seed
(`scripts/seed-programs-phase232-mbbs.mjs`) is idempotent and was already applied, committed,
and removed from the working tree. No destructive operations.

## 4. Polytechnic classification — before / after

**Before:** category discovery matched degree-only queries (B.TECH Computer Science, M.TECH
Environmental Engineering, …) to the 5,337 `Technical/Polytechnic` AISHE rows purely on the
shared `Technical` token; `getSingleCandidate` could report `institutionType-category` for a
diploma-level institution in a degree-only context.

**After (final pass):** classification counts computed live from the dataset:

| Metric | Count |
|---|---|
| Total institutions evaluated (`IndianInstitution`) | 73,969 |
| Diploma-compatible (type is polytechnic or `(Diploma)`) | 14,213 |
| — `Technical/Polytechnic` | 5,337 |
| — `Nursing (Diploma) Institute` | 4,821 |
| — `Teacher Training (Diploma) Institute` | 3,913 |
| — `Ayurvedic Nursing (Diploma) Institution` | 142 |
| Degree-compatible (non-diploma typed) | 58,329 |
| Ambiguous (missing `institutionType`) | 1,427 |
| False-positive classifications | 0 |
| False-negative classifications | 0 |
| VERIFIED Program rows at diploma-level institutions | 0 |

Qualification Level is driven **only** by structured `institutionType`; institution **names**
(polytechnic/engineering/technical/institute/college) never participate. Missing type data is
conservatively `unknown` — never invented. A diploma-level institution is degree-compatible only
when an independently verified Program row proves it (multi-level case); there are currently 0
such rows, so no degree capacity is hidden or invented. Sums check: 14,213 + 58,329 + 1,427 =
73,969.

## 5. Regression test results

- `tests/phase23-2-polytechnic-final.test.mjs` — **13/13** pass: qualification semantics
  (diploma→Polytechnic only; classification from type, never name; missing data → unknown;
  `canDiplomaInstitutionGrantDegree` proof-gated) and the 9-point routing safety suite:
  1. diploma student → Polytechnic/Diploma institutions (disjoint tracks);
  2. diploma student never receives a B.E./B.Tech-only institution result (`none`);
  3. B.Tech student → engineering degree institutions via the verified-program tier; polytechnic
     rows stay blocked;
  4. multi-level institution → program data determines qualification, not name/type;
  5. institution named "Polytechnic" with a degree program → program data decides;
  6. institution named "Engineering" offering Diploma only → remains Diploma;
  7. no institution-name substring false positives;
  8. diploma → degree progression is conditional, never automatic;
  9. missing qualification data → conservative result.
- Poly / medical / golden suites: 60/60 green across the four Phase 23.2 files.
- **Full suite:** 592/592 pass (was 579; +13 new).

## 6. Medical careers enriched

34/34 active Healthcare & Medicine careers covered; 21-discipline registry with official
evidence sources; 7 disciplines honestly state "no central statutory register" (`sources: []`).
Every discipline entry now carries a **Last reviewed date** (`2026-09-08`) surfaced in the UI
as "Last reviewed:" — the medical education knowledge base is never presented as timeless.

## 7. Medical career → program mappings (added/fixed)

Medicine→MBBS (Professional Degree, PRIMARY), Dentistry→BDS (PRIMARY), Pharmacology→B.Pharm,
Nursing→Nursing, Physiotherapy→Physiotherapy, Audiology→Audiology and Speech-Language Pathology,
Occupational Therapy→Occupational Therapy, Optometry→Optometry, Veterinary Science→Veterinary
Science, Clinical Research→Clinical Research. No health career maps to MBBS except Medicine.

## 8. Institution mapping safeguards

- Degree-only category discovery excludes diploma-level institutions.
- `getSingleCandidate` never assigns `institutionType-category` to a diploma-level institution
  in a degree-only context.
- Medical institutions are surfaced only with verified-program/curated evidence (no name-based
  medical classification; no MBBS conflation).
- Structured medical institution display uses name/location/country/discipline/program/
  qualification/level/verification status/official source/official URL/verified date.

## 9. Protected datasets

`University` (20) and `IndianInstitution` (73,969) unchanged — **UNIVERSITY DATA PROTECTED**,
**INDIANINSTITUTION DATA PROTECTED**. Program row count 80 (0 UNVERIFIED). No reseed/rebuild/
truncate/mass-update.

## 10. Build / test / freeze

- **Test:** 592/592 pass (`npm test`, 0 fail).
- **Type:** `npx tsc --noEmit --skipLibCheck` → 0 errors.
- **Build:** `npm run build` → PASS.
- **Engine freeze:** `scripts/audit/phase23_2-engine-freeze.json` byte-identical to
  `phase18-1-engine-freeze-baseline.json` excluding `generatedAt` — 289 careers, 23 profiles.
- Vercel: https://technology-platform.vercel.app/ (no infra change this branch).

## 11. Explicit confirmations

- **CAREER ENGINE UNCHANGED**
- **ASSESSMENT ENGINE UNCHANGED**
- **UNIVERSITY DATA PROTECTED**
- **INDIANINSTITUTION DATA PROTECTED**

## 12. Commit

`Phase 23.2: final polytechnic pathway hardening and medical education intelligence v1`