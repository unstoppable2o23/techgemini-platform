# Phase 23.2 — Polytechnic Hardening Baseline (Part A)

**Phase:** 23.2 — Polytechnic correction and medical education intelligence v1
**Part:** A — Degree vs Diploma separation hardening

---

## 1. Scope

Extends the Phase 23.1 diploma/degree separation at the query and candidate layers so that
degree-only outcomes can never surface diploma-serving institutions.

## 2. Baseline facts (verified)

- IndianInstitution rows: **73,969** (unchanged from Phases 16–23.1).
- Polytechnic-type rows: **5,337** (all AISHE `Technical/Polytechnic`).
- Institutions with a `(Diploma)` suffix in `institutionType`: counted in
  `scripts/audit/phase23_2-polytechnic-audit.json` (gross count, same dataset).
- Program rows: **75** at phase start (all verified; 0 UNVERIFIED).
- University rows: **20** (unchanged).

## 3. Diploma-level classifier

`isDiplomaLevelInstitutionType(type)` returns `true` when the AISHE `institutionType`
contains `polytechnic` or `(diploma)`. Because the entire 5,337-row polytechnic block shares
the single type `Technical/Polytechnic`, the classifier treats the whole block as
diploma-serving — the same limitation documented in Phase 23.1.

## 4. Candidate-layer contract

- `getSingleCandidate(id, dataset, degreeName?)` must never assign the
  `institutionType-category` basis to a diploma-level institution for a degree-only context.
- Degree-only category discovery must never produce polytechnic institutions
  (exclusion applies when no degree name in the path vocabulary contains `/diploma/i`).
- Empty degree-only category results report basis `none` with the
  `CATEGORY_EMPTY_DISCLAIMER` message ("degree correctly not found at any institution in
  this list") rather than a misleading category basis.

Reference: `src/lib/university-matching/candidate.ts`, `src/lib/education-institutions/service.ts`.

## 5. Evidence

See `scripts/audit/phase23_2-polytechnic-audit.json` and the golden suite
`tests/phase23-2-polytechnic.test.mjs` (G1–G10).