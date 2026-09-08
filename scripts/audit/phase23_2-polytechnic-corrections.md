# Phase 23.2 — Polytechnic Corrections (Part A)

**Phase:** 23.2 — Polytechnic correction and medical education intelligence v1

---

## 1. Issues found (pre-fix)

1. **Degree-only category over-broad matching.** Category discovery for a degree such as
   `B.TECH Computer Science` or `M.TECH Environmental Engineering` could match the 5,337
   `Technical/Polytechnic` rows purely on the shared `/technical/i` token even though those
   institutions are diploma-serving and the requested degree catalog contains no
   diploma-level engineering program.
2. **Unsafe candidate basis.** `getSingleCandidate()` could return basis
   `institutionType-category` for a Polytechnic or `(Diploma)` institution in a degree-only
   context, implying the institution grants the degree when it does not.
3. **Empty-result mislabel.** A genuinely empty degree-only search returned category basis
   instead of "not found", which could read as "the institution is a candidate for this
   degree".

## 2. Corrections made

1. Added `isDiplomaLevelInstitutionType()` to `src/lib/education-institutions/service.ts`
   (type contains `polytechnic` or `(diploma)`).
2. Degree-only category discovery excludes diploma-level institutions whenever the queried
   degree has no `/diploma/i` in its name; `M.TECH Environmental Engineering` now correctly
   yields an honest empty result.
3. `getSingleCandidate()` returns basis `none` (never `institutionType-category`) for
   diploma-level institutions in degree-only contexts.
4. `institutionQualificationLabel()` now returns `null` for non-diploma types and the honest
   "Diploma / Polytechnic" vs "Diploma" labels for diploma-serving types (UI honesty only).
5. Golden regression suite `tests/phase23-2-polytechnic.test.mjs` (G1–G10) added.

## 3. Remaining exceptions / limitations

- Per-institution "diploma-only" vs "degree-granting" within the 5,337-strong
  `Technical/Polytechnic` block cannot be separated at query level (single AISHE type).
- No verified Program row attaches to any diploma-level institution (0 such rows); none is
  fabricated.
- Degree catalog has no technical Diploma-in-Engineering rows; only legitimate postgraduate
  diplomas exist.

## 4. Files touched (Part A only)

- `src/lib/education-institutions/service.ts`
- `src/lib/university-matching/candidate.ts`
- `tests/phase23-2-polytechnic.test.mjs`
- `tests/education-institution.test.mjs` (baseline contract)

## 5. Verification

- 33/33 P23.2 golden tests pass (G1–G10 polytechnic + M1–M23 medical).
- Full suite: 565/565 pass (`npm test`).
- `npx tsc --noEmit --skipLibCheck` → 0 errors; `npm run build` → PASS.
- Engine freeze byte-identical (see `phase23_2-engine-freeze.md`).