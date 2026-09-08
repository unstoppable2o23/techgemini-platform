# Phase 23.2 — Test & Build Regression

**Phase:** 23.2 — Polytechnic correction and medical education intelligence v1

---

## 1. Test results

- **Full suite:** `npm test` → **565 pass / 0 fail** (25 suites).
  - Baseline was 532 (Phase 23.1) + **33 new** P23.2 tests (G1–G10 polytechnic, M1–M23
    medical) = 565.
- **P23.2 specific:** `tests/phase23-2-polytechnic.test.mjs` + `tests/phase23-2-medical.test.mjs`
  → 33/33 pass.
- Baselines updated deliberately:
  - `tests/program-verified.test.mjs` — verified-program bound 20–75 → **20–85** (Program 80).
  - `tests/career-program-mapping.test.mjs` — `BASELINE.Program` 75 → **80**; test text
    "remains at 75 rows" → "remains at 80 rows".

## 2. TypeScript

`npx tsc --noEmit --skipLibCheck` → **0 errors** (exit 0).

## 3. Build

`npm run build` → **PASS** (exit 0).

## 4. Static verification

- No lint config is part of this repo's standard gate; TypeScript + full test suite are the
  gate (see Phase 16 onward convention).
- Seed script `scripts/seed-programs-phase232-mbbs.mjs` is idempotent (verified via dry-run
  mode before apply).