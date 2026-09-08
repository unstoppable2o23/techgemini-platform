# Phase 23.2 — Data Integrity

**Phase:** 23.2 — Polytechnic correction and medical education intelligence v1

---

## 1. Counts (before → after)

| Entity | Before | After | Δ | Status |
|--------|--------|-------|---|--------|
| Career (active) | 289 | 289 | 0 | unchanged (test M21, full-suite) |
| Degree | 751 | 751 | 0 | unchanged (test M21) |
| University | 20 | 20 | 0 | unchanged (test M21, G9) |
| IndianInstitution | 73,969 | 73,969 | 0 | unchanged (test M21, G9) |
| Program | 75 | 80 | **+5** | verified MBBS rows only (test M22) |
| Program UNVERIFIED | 0 | 0 | 0 | no fabrication (tests M22, G9) |
| Verified MBBS (degree MBBS) | 4 | 9 | +5 | 7 India + 2 international; all VERIFIED |

## 2. Integrity rules enforced by tests

- No verified Program row is attached to a diploma-level institution (G8).
- Program table is exactly 80 with 0 UNVERIFIED rows (M22).
- The 5 new institutions resolve via `verified-program`, never by category guess (M19).
- No duplicate MBBS rows per institution (M20).
- Registry covers 34/34 active Healthcare & Medicine careers (M2); disciplines with no
  statutory register state so explicitly and cite nothing (M3/M4).

## 3. Scratch cleanup

All `scripts/_tmp-p232-*.mjs` probes and pre-commit scratch audit scripts were deleted before
commit. Only committed evidence and the idempotent seed remain under `scripts/audit` and
`scripts/seed-programs-phase232-mbbs.mjs`.

## 4. Deliverables in this commit

- `scripts/audit/phase23_2-engine-freeze.json`
- `scripts/audit/phase23_2-medical-audit.json`
- `scripts/audit/phase23_2-polytechnic-audit.json`
- `scripts/audit/phase23_2-*.md` (9 reports incl. this one)
- `scripts/seed-programs-phase232-mbbs.mjs`