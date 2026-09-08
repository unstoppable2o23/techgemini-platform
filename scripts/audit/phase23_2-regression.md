# Phase 23.2 — Regression

**Phase:** 23.2 — final polytechnic pathway hardening and medical education intelligence v1

---

## 1. Career engine freeze (Part D)

Ran `scripts/audit/phase16b-golden-harness.mjs` before and after; diffed against
`phase18-1-engine-freeze-baseline.json` with `generatedAt` excluded.

- **Byte-identical: true**
- careersScored: **289**; profiles: 23; no score/rank/confidence/period shift.

**CAREER ENGINE UNCHANGED. ASSESSMENT ENGINE UNCHANGED.**

## 2. Test suite (final pass)

- `npm test` → **592 pass / 0 fail** (29 suites).
  - 579 (previous Phase 23.2 commit) + **13 new** `phase23-2-polytechnic-final` tests
    (qualification-semantics helpers + the 9-point polytechnic routing safety suite).
- Phase 23.2 files: polytechnic G1–G10 (10), medical M1–M23 (23), golden A–L (14),
  polytechnic-final (13) — all green (60/60 across the four files).
- Baselines re-verified: program-verified bound 20–85; career-program-mapping Program 80.
- Determinism assertions in medical/golden suites now normalise the live
  `snapshot.generatedAt` wall-clock stamp app-side (test-only; matches the freeze harness).

## 3. TypeScript / build

- `npx tsc --noEmit --skipLibCheck` → 0 errors.
- `npm run build` → PASS.

## 4. Data integrity (Part H)

| Entity | Before | After |
|--------|--------|-------|
| Career (active) | 289 | 289 |
| Degree | 751 | 751 |
| University | 20 | 20 |
| IndianInstitution | 73,969 | 73,969 |
| Program | 75 | 80 (+5 verified MBBS) |
| Program UNVERIFIED | 0 | 0 |

No destructive migration; no `prisma db push --accept-data-loss`; no reset. University and
IndianInstitution data are protected.