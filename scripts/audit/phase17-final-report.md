# Phase 17 — Final Report

**Phase 17 — Career → Program Intelligence v1**
**Date:** 2026-09-03 · **Base commit:** `b0ad8e7` (Phase 16E.1)

## Summary
Built the deterministic, explainable, auditable **Career → Programme** recommendation layer
connecting all 289 active careers to a curated canonical academic-programme catalogue — the
foundation for the future Career → Programme → University pipeline. The final Career → University
ranking is **out of scope** and was not built.

## What shipped (additive)
1. **`AcademicProgram`** — a clean canonical programme catalogue of **242** programmes across 17
   categories (level: 140 Bachelor's, 87 Master's, 7 Professional, 6 Diploma, 2 Certificate;
   0 duplicate names, 0 duplicate slugs). This is the §4 compatibility layer over the dirty
   `Degree` catalogue; no junk / "any degree" / "12th pass" entries are modelled.
2. **`CareerProgramMapping`** — **856** curated relationships covering **289/289 active careers**
   (100%), ~2.96 per career, with deterministic strength/confidence/priority derived from the
   relationship type.
3. **Relationship taxonomy** `PRIMARY → COMMON → SPECIALIZED → RELEVANT → OPTIONAL`, with the
   deterministic ranker in `src/lib/career-program.ts`.
4. **API** `GET /api/careers/[careerId]/programs` returning ranked programmes.
5. **Seed/load tooling** `scripts/load-phase17-data.mjs` and validation
   `scripts/phase17-data/validate-mappings.mjs`.

## Relationship distribution
PRIMARY **298** · COMMON **484** · SPECIALIZED **19** · RELEVANT **25** · OPTIONAL **30**.

## Coverage
- **289/289** active careers mapped. **0** unmapped.
- **Referential integrity:** every `programId` resolves to an `AcademicProgram`; every `careerId`
  resolves to an active `Career`; no duplicate `(careerId, programId)`; no unknown slugs.
- **4 government/defence careers** (Airforce, Industrial Safety, Defence Services, Staff
  Selection Services) carry contextual COMMON/OPTIONAL preparation only — deliberately no false
  PRIMARY degree.
- **School-stage on-ramps:** every career has an undergraduate (Bachelor's/Professional/Diploma)
  programme; seven postgraduate-led professions carry an explicit undergraduate on-ramp.
- **Family coverage:** 23/23 families, all mapped (see `phase17-family-coverage.md`).

## Golden validation (14 representative careers)
Software Engineering, Data Science, Medicine, Civil Engineering, Agriculture, History/Humanities,
Journalism/Media, Law, Psychology, Architecture, Environmental/Sustainability, Business/Finance,
Education, Design — all resolve to appropriate PRIMARY/COMMON/SPECIALIZED programme sets.

## Test & build
- **tests/career-program-mapping.test.mjs: 15/15 pass.**
- Full suite: **386 tests, 385 pass, 1 fail** — the single failure is the **pre-existing,
  out-of-scope** `education-pathways` orphan mapping (Corporate Law), unrelated to Phase 17
  (baseline was 370/371; this phase adds 15 tests).
- **TypeScript:** `tsc --noEmit --skipLibCheck` — **clean**.
- `npm run build`: **success** (programs route compiled: `/api/careers/[careerId]/programs`).

## Scope confirmations (DB safety)
- **University: untouched** (20 → 20). **IndianInstitution: untouched** (73969 → 73969).
  **Program: untouched** (75 → 75). **Degree / Specialization / Subject / Career /
  CareerEducationPathway: unchanged.**
- No `prisma db push --accept-data-loss`; no DB reset; no deletion. Only two additive tables and
  an enum were introduced.

## Deliverables
| File | Purpose |
|---|---|
| `scripts/audit/phase17-career-program-baseline.md` | Baseline + scope confirmations |
| `scripts/audit/phase17-program-quality.md` | Catalogue quality |
| `scripts/audit/phase17-career-program-coverage.md` | Mapping coverage & integrity |
| `scripts/audit/phase17-family-coverage.md` | Family coverage |
| `scripts/audit/phase17-career-program-audit.json` | Machine-readable audit |
| `scripts/phase17-data/academic-programs.json` | 242-program catalogue |
| `scripts/phase17-data/mappings/*.json` | Curated 289-career mappings |
| `scripts/load-phase17-data.mjs` | Idempotent loader |
| `scripts/phase17-data/validate-mappings.mjs` | Data validator |
| `src/lib/career-program.ts` | Ranker + service |
| `src/app/api/careers/[careerId]/programs/route.ts` | API |
| `tests/career-program-mapping.test.mjs` | Test gate |

## Hand-off
This layer is the deterministic, explainable base for the future **Career → Programme →
University** ranking. The associated institution-specific `Program` data (and University ranking)
remains the responsibility of a subsequent phase and was intentionally not built here.