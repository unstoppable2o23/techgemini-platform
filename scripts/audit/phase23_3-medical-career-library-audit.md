# Phase 23.3 — Medical Career Library Visibility Audit

**Phase:** 23.3 — medical career library visibility and education intelligence v1

**Commit:** (written after full validation) — engine freeze byte-identical, 611/611 tests, tsc clean, build PASS.

---

## 1. Before / after medical career counts

- **Career catalog before and after: 289 active careers** (unchanged; test 18 asserts the count
  stays frozen so the career-matching engine freeze baseline `phase18-1-engine-freeze-baseline.json`
  remains intact). No career rows were created, renamed or deleted for this phase.
- **Healthcare & Medicine careers: 34** — unchanged, all active.
- **Careers created: 0. Careers enriched: 0 rows touched.** The visibility fix is purely additive
  search semantics — it changes how existing careers are *found*, never the catalog itself.

## 2. Root cause of the "missing medical careers" gap

Medical careers were always stored, active and returned by `/api/careers`. The genuine defect was
**search discoverability**:

| User query  | Before 23.3        | After 23.3                      |
|-------------|--------------------|----------------------------------|
| `medical`   | matched 0 (Medicine name has no "medical") | all 34 Healthcare & Medicine careers |
| `doctor`    | 0                  | Medicine + Surgeon               |
| `dentist`   | Dentistry (by name) | Dentistry (canonical, same)     |
| `pharmacy` / `pharmacist` / `pharma` | 0 | Pharmacology |
| `optometrist` | 0                | Optometry                       |
| `physiotherapist` | 0            | Physiotherapy                   |
| `nutritionist`, `vet`, `biotech`, `clinical trial`, `x-ray`, `ultrasound`, … | 0 or partial | canonical career(s) |

Failure modes fixed:
1. `src/app/(student)/career-library/career-library-client.tsx` matched only `(title||name)`
   or `shortDescription` substring — it could never find careers by professional title.
2. `src/app/api/careers/route.ts` mirrored the same substring-only `contains` logic.
3. `scripts/seed-careers.mjs` wrote `category: c.category || "Other"` on update — re-running the
   caree seed after `seed-career-intelligence` would erase the curated `Healthcare & Medicine`
   category. Now it preserves the existing category when the seed JSON carries none.

## 3. Shared search layer (no duplicate careers)

New module `src/lib/careers/search.ts` is the single matcher used by BOTH the client grid and the
API route (behaviour stays deterministic and testable):

- normalises queries (lowercase / trim / whitespace collapse);
- substring match on name / title / short description / subcategory / slug, plus an exact
  (case-insensitive) category match;
- ~40 curated alias terms map everyday phrasing to canonical slugs that already exist
  (`doctor`→medicine/surgeon, `pharmacy`→pharmacology, `lab technician`→medical-laboratory-sciences,
  `medical imaging`→radiology-technology, `clinical trial`→clinical-research, `vet`→veterinary-science,
  …) — **every target verifiably exists in the catalog, so aliases can never fabricate or
  duplicate a career**;
- healthcare broad terms (`medical`/`healthcare`) expand to the whole Healthcare & Medicine
  category; the *specific* term `medicine` stays scoped to careers genuinely matching Medicine,
  so it never blanket-matches the entire bucket.

`buildCareerSearchWhere()` produces the API's Prisma `where.OR`; `careerMatchesQuery()` drives the
client grid. Both are covered by tests 1–9 and 13.

## 4. Minimum verification list (Part 2) — result

20 core entry-level medical careers verified present, active, titled, described and with
resolvable detail slugs (test 10/11/12):

Medicine, Surgeon, Dentistry, Pharmacology, Nursing, Physiotherapy, Occupational Therapy, Optometry,
Medical Laboratory Sciences, Radiology Technology, Public Health, Biomedical Scientist,
Biotechnology Research, Clinical Research, Hospital Administration, Paramedic, Nutrition and
Dietetics, Audiology, Genetic Counseling, Veterinary Science.

> AYUSH: no standalone catalog row exists (deliberate — adding a row would break the frozen
> Career=289 engine baseline and duplicate the Medicine pathway). AYUSH content is delivered
> through the existing medical-education registry layer (AYUSH discipline, state-level admissions,
> `careerSlugs` mapped to the medicine pathway), matching the Phase 23.2 audit note. This is
> documented, not silent.

Category placement: 18 of the core are under `Healthcare & Medicine`; `Biomedical Scientist` and
`Biotechnology Research` are deliberately curated under `Life Sciences` (test 11). Search terms
`biomedical`/`medical`/`biotechnology` still surface them so they are not hidden.

## 5. Mappings (Part 5) — no MBBS inflation

Verified via `getCareerPrograms` (tests 14–17):

| Career                | PRIMARY program               | MBBS present |
|-----------------------|-------------------------------|:------------:|
| Medicine              | Medicine (MBBS)               | yes          |
| Dentistry             | Dentistry (BDS)               | no           |
| Pharmacology (Pharmacy)| Pharmacy (B.Pharm)           | no           |
| Nursing               | Nursing (Bachelor's)          | no           |
| Physiotherapy         | Physiotherapy (Bachelor's)    | no           |
| Occupational Therapy  | Occupational Therapy (Bachelor's) | no        |
| Optometry             | Optometry (Bachelor's)        | no           |
| Medical Laboratory Sciences | Medical Laboratory Technology | no       |
| Radiology Technology  | Medical Imaging Technology    | no           |
| Public Health         | Public Health (Master's)      | no           |
| Biomedical Scientist  | Biomedical Engineering        | no           |
| Biotechnology Research| Biotechnology Engineering     | no           |
| Clinical Research     | Clinical Research             | no           |

No non-medicine career maps to MBBS; Medicine is the only MBBS career. BDS/B.Pharm/Nursing/
Physiotherapy/Optometry/OT/MLT/MIT are each their own PRIMARY — never routed through MBBS.

## 6. Content & medical-education wording (Parts 4 & 6)

- All 10 flagship medical careers (Medicine, Dentistry, Pharmacology, Nursing, Physiotherapy,
  Occupational Therapy, Optometry, Medical Laboratory Sciences, Radiology Technology, Public
  Health) carry full structured content: introduction, eligibility, recommendedDegrees,
  recommendedSubjects, technicalSkills, softSkills, FAQs, seoTitle, indiaRelevance. No gaps.
- Entrance/NEET wording: registry-driven and conservative; NEET-UG is referenced only for the
  regulated UG entrance disciplines (Medicine, Dentistry, Nursing) and stated conservatively
  ("typically", never "must/required"). No fabricated seats/cutoffs/fees/dates anywhere in medical
  content. The only `2024` strings in `careers-data.json` are non-medical (cybersecurity/design/
  dev) article titles unrelated to admission data — left untouched, documented here.
- Medical education registry retains `MEDICAL_EDUCATION_LAST_REVIEWED = 2026-09-08` (`lastReviewed`
  stamped on all 21 disciplines, rendered as "Last reviewed:").

## 7. Polytechnic/diploma regression (Part 7)

Phase 23.2 invariants are untouched and re-asserted (test 19): `Technical/Polytechnic` →
diploma, `null` type → `unknown`, degree-proof gate `canDiplomaInstitutionGrantDegree` unchanged.
Full Phase 23.2 polytechnic suites (semantics + routing safety + golden hardening) and the diploma-
vs-degree separation suites all remain green in the 611-test run.

## 8. Institution classification (Part 9)

No changes to institution classification this phase: `classifyInstitutionQualification` /
`canDiplomaInstitutionGrantDegree` remain structure-driven (`institutionType`), name-agnostic, and
covered by the Phase 23.2 suites. `University` (20) and `IndianInstitution` (73,969) datasets
were not modified (test M21 / G9 still green).

## 9. Protected datasets & freeze integrity

| Guard | Result |
|---|---|
| Career count frozen at 289 | ✓ (test 18) |
| Engine freeze byte-identical vs `phase18-1-engine-freeze-baseline.json` (excl. generatedAt) | ✓ harness diff true |
| `npm test` | 611/611 pass (33 suites) |
| `npx tsc --noEmit --skipLibCheck` | 0 errors |
| `npm run build` | PASS |
| University rows | untouched |
| IndianInstitution rows | untouched |
| `prisma db push --accept-data-loss` | never used |

## 10. New tests (Part 12)

`tests/phase23-3-medical-career-library.test.mjs` — 19 tests across 4 suites:

1. Search-layer unit tests (1–9): normalisation, professional-title aliases
   (`doctor`→Medicine, `dentist`→Dentistry, `pharmacy`/`pharmacist`→Pharmacology), practical terms
   (physiotherapist/optometrist/nutritionist/vet), broad-`medical` bucket vs specific-`medicine`
   scoping, case-insensitivity across fields, and the API where-builder (empty → no OR; broad →
   category expansion).
2. Data presence (10–13): 20 core careers active with title+description, healthcare category
   placement (Life Sciences for biomedical/biotech), detail-slug resolution, and DB-backed
   where-builder surfacing (doctor→Medicine; medical→every healthcare core; biotechnology→
   Biotechnology Research).
3. Program mappings (14–17): Medicine→MBBS PRIMARY; Dentistry→BDS (never MBBS); pharmacy/nursing/
   physiotherapy never MBBS (+Pharmacology→B.Pharm); allied/bio careers map to their own PRIMARY;
   no new career rows (test 18).
4. Polytechnic regression (19): Phase 23.2 qualification + degree-proof invariants unchanged.

## 11. Files changed

- `src/lib/careers/search.ts` — NEW shared search/alias/broad-term matcher.
- `src/app/(student)/career-library/career-library-client.tsx` — grid filter uses
  `careerMatchesQuery`.
- `src/app/api/careers/route.ts` — search `where` built via `buildCareerSearchWhere` (+ retains
  skill matching).
- `scripts/seed-careers.mjs` — preserve existing `category` on update when the seed JSON omits it.
- `tests/phase23-3-medical-career-library.test.mjs` — NEW, 19 tests.

No schema changes. No seed-data file changes. No engine / scoring / weights / question-bank
changes (engine V1 remains frozen).