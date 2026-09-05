# Phase 23.1 — Final Report

**Date:** 2026-09-05
**Phase:** 23.1 — Polytechnic/Diploma Pathway Correction
**Branch:** master

---

## 1. Affected institutions

- Polytechnic-type institution rows in the AISHE dataset: **5337** (all `Technical/Polytechnic`).
- No institution rows were added, removed, or mutated. Marking/correction is at mapping/token/roadmap/UI level.

## 2. Incorrect mappings found (pre-fix)

1. **`deriveInstitutionTypeTokens`** mapped a `Diploma in X Engineering` to both `["Polytechnic","Technical"]` — the diploma was also classified into the degree-granting Technical category.
2. **`tests/education-institution.test.mjs:18`** wrongly asserted that `B.TECH Computer Science` includes "Polytechnic" (a degree labelled as a diploma).
3. **Class-10 roadmap** had no diploma branch — the technical track was invisible.
4. **`seed-education-orphans.mjs`** skip-logic suppressed SUBJECT_LINK creation for degree-mapped careers.
5. **UI** showed raw `Technical/Polytechnic` with no "Diploma / Polytechnic" separation; counselor 360 lacked both post-Class-10 tracks.

## 3. Corrections made

1. FIELD_RULES `excludeIf: ["diploma"]` — diploma degrees map to `["Polytechnic"]` only; B.E./B.Tech map to `["Technical"]` only (disjoint).
2. Corrected test contract + added diploma/degree separation tests.
3. Rewrote `SCHOOL_CLASS10` roadmap: neutral pathway-choice + diploma branch (Explore → Compare → Verify eligibility → Select → Complete) with conditional India lateral entry / abroad acceptance check, plus academic alternative.
4. Added `diplomaIntent` / `diplomaIntentOverride` plumbing (pure derive; engine untouched).
5. Fixed orphan-seed skip logic.
6. UI labels: "Diploma / Polytechnic — not a B.E./B.Tech degree institution" (career library + indian colleges); counselor 360 dual-pathway education panel.
7. New `tests/polytechnic-diploma.test.mjs` regression suite (mission items 1–2 + golden cases A–F).

## 4. Remaining exceptions / limitations

- Per-institution "diploma-only" vs "degree-granting" cannot be separated at query level because all 5337 rows share the single AISHE type `Technical/Polytechnic`. Mitigated by: 0 Program rows at polytechnic institutions, neutral disclaimer, and roadmap/token separation.
- No verified evidence exists to declare any particular polytechnic also runs B.E./B.Tech; none is fabricated (Phase 6 rule).
- The degree catalog has no technical Diploma-in-Engineering rows; only legitimate postgraduate diplomas exist.

## 5. Counts before / after

| Entity | Before | After | Δ |
|--------|--------|-------|---|
| University | 20 | 20 | 0 |
| IndianInstitution | 73969 | 73969 | 0 |
| Program | 75 | 75 | 0 |
| Career | 289 | 289 | 0 |
| Degree | 751 | 751 | 0 |
| CareerEducationPathway | 2111 | 2111 | 0 |

## 6. Verification

- **Tests:** 532 pass / 0 fail (`npm test`), including previously-failing `tests/education-pathways.test.mjs:39` and the corrected `tests/education-institution.test.mjs:18`.
- **Engine freeze:** golden harness byte-identical vs `phase18-1-engine-freeze-baseline.json`.
- **TypeScript:** `npx tsc --noEmit --skipLibCheck` → PASS (0 errors).
- **Build:** `npm run build` → PASS.
- **Vercel:** https://technology-platform.vercel.app/ (SUHAIL branding) — deployment reported SUCCESS in Phase 23; not re-coded by this branch-only correction (no infra change). Status to be confirmed at push time.
