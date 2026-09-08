# Phase 23.2 — Final Report

**Date:** 2026-09-08
**Phase:** 23.2 — Polytechnic correction and medical education intelligence v1
**Branch:** master

---

## 1. What changed

### Part A — Polytechnic harness (degree vs diploma hardening)

- `isDiplomaLevelInstitutionType()` classifier (type contains `polytechnic` or `(diploma)`).
- Degree-only category discovery excludes diploma-level institutions; `M.TECH Environmental
  Engineering` now yields an honest empty.
- `getSingleCandidate()` never assigns `institutionType-category` to diploma-level
  institutions in degree-only contexts (basis `none` + `CATEGORY_EMPTY_DISCLAIMER`).
- `institutionQualificationLabel()` honest Diploma / Polytechnic labels.

### Part B — Medical education intelligence v1

- **Registry** (`src/lib/medical-education/registry.ts`): 21 disciplines, 34/34 Healthcare &
  Medicine career coverage, `regulatedEntrance` = exactly {medicine, dentistry, nursing},
  source/honesty contract enforced by tests (M3/M4).
- **Roadmap** branch in `src/lib/roadmap/rules.ts`: medical India/abroad steps, conservative
  NEET-UG wording, internship/PG-entrance/licensing steps, deterministic.
- **Verified MBBS programs**: +5 rows (Program 75→80) via idempotent seed — KGMU Lucknow,
  MAMC Delhi, LHMC Delhi, Grant MC Mumbai, CMC Vellore — all official-website-sourced,
  VERIFIED, resolve `mappingBasis=verified-program`.
- **UI**: Career Library MEDICAL EDUCATION PATH section; student 360 education panel with
  entrance/degree/internship/registration rows, alternatives, sources, conservative note.

## 2. Polytechnic issues → status

1. Degree-only category could match 5,337 polytechnic rows via `/technical/i` → **fixed**.
2. Candidate could report `institutionType-category` for a diploma-level institution →
   **fixed** (basis `none`).
3. Empty degree-only search mislabelled → **fixed** (honest not-found).
4. Per-institution diploma-vs-degree within the Technical/Polytechnic block (single AISHE
   type) → **remaining** (documented limitation, mitigated by 0 program rows + disclaimers).
5. Catalog has no technical Diploma-in-Engineering rows → **remaining** (as designed).

## 3. Medical coverage delivered

- Medical careers enriched: 34/34 within Healthcare & Medicine; registry + roadmap for 6 core
  medical-education careers rendered in the Career Library (see `phase23_2-medical-education.md`).
- Programs added: **5** (verified MBBS) → linked to `IndianInstitution` rows via Program
  table (no institution rows created/mutated).
- Institutions enriched: none created; 5 pre-existing AISHE institutions get verified MBBS
  Program rows + official source URLs (KGMU/MAMC/LHMC/Grant/CMC).
- Sources: NMC, NTA, DCI, INC, PCI, NCISM, NCH, AHP NEC (NCAHP), VCI, ICAR, NCERT — registry
  gate (M4); institutions cite official websites.

## 4. Verification

- Tests: **565 pass / 0 fail** (`npm test`; 532 + 33 new).
- TypeScript: `npx tsc --noEmit --skipLibCheck` → 0 errors.
- Build: `npm run build` → PASS.
- Engine freeze: **byte-identical** vs `phase18-1-engine-freeze-baseline.json` (excluding
  `generatedAt`); careersScored 289, profiles 23.
- Determinism: roadmap (M13) and degree-only discovery (G10) byte-identical across runs.

## 5. Explicit confirmations

- **CAREER ENGINE UNCHANGED** — byte-identical golden output vs frozen baseline.
- **ASSESSMENT ENGINE UNCHANGED** — not touched in this phase.
- **UNIVERSITY DATA SAFE** — 20 rows, unmodified.
- **INDIANINSTITUTION DATA SAFE** — 73,969 rows, unmodified (Program rows are a separate
  table; +5 verified MBBS links only).

## 6. Commit

- Message: `Phase 23.2: polytechnic correction and medical education intelligence v1`
- Artifacts: see `phase23_2-data-integrity.md`.