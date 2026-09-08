# Phase 23.2 — Final Report

**Date:** 2026-09-08
**Phase:** 23.2 — polytechnic pathway hardening and medical education intelligence v1
**Branch:** master

---

## 1. Root cause (polytechnic)

The AISHE dataset stores all polytechnics under the single shared type `Technical/Polytechnic`
with no per-row degree-vs-diploma flag. Prior to Phase 23.2/23.1 two layers inferred a degree
from this coarse type: category discovery matched degree-only queries via the `/technical/`
token, and `getSingleCandidate` could report `institutionType-category` for a diploma-level
institution in a degree-only context. This was a classification/data problem in
`service.ts` + `candidate.ts`, not just a label.

## 2. Corrections

- `isDiplomaLevelInstitutionType()` = type contains `polytechnic` or `(diploma)`.
- Degree-only category discovery excludes diploma-level institutions.
- Empty degree-only results → basis `none` + `CATEGORY_EMPTY_DISCLAIMER`.
- `getSingleCandidate` never category-matches a diploma-level institution for degree-only.
- Honest Diploma / Polytechnic qualification labels (UI + `institutionQualificationLabel`).
- Roadmap: distinct Class-10 diploma track; lateral entry conditional; neutral wording
  (Phase 23.1/23.2).

**Affected:** 5,337 `Technical/Polytechnic` AISHE rows (classification-level, rows untouched);
0 Program rows at diploma-level institutions. **Diploma-only institutions are no longer treated
as 4-year engineering degree institutions** (no name/type → degree inference; verified program
required).

## 3. Medical careers enriched

34/34 active Healthcare & Medicine careers covered by a 21-discipline registry; roadmap branches
(Medicine/Dentistry/Nursing medical; others generic). No new careers added; no duplicates.
Career Library MEDICAL EDUCATION PATH + student 360 education panel + alternatives + FAQ.

## 4. Medical programs added/linked

+5 verified MBBS (KGMU, MAMC, LHMC, Grant MC, CMC Vellore) → Program 75→80, all VERIFIED with
official source URLs, resolve `verified-program`. Medicine→MBBS, Dentistry→BDS, Pharmacy→B.Pharm,
Nursing, Physiotherapy etc. verified intact (B7).

## 5. Medical institutions enriched

5 pre-existing AISHE institutions linked to VERIFIED MBBS Program rows (no institution rows
created/modified). Institutions surfaced only with real program evidence (verified-program /
curated / category-with-care). University (20) and IndianInstitution (73,969) **protected**.

## 6. Sources

NMC, NTA, DCI, INC, PCI, NCISM, NCH, AHP NEC (NCAHP), VCI, ICAR, NCERT + official institution
websites. Regulator-less disciplines state so explicitly (no fabrication). See
`phase23_2-source-verification.md`.

## 7. Roadmap changes

Medical branch gated to regulated-entrance careers; India( NEET-UG via NTA, notified scope) vs
abroad (per-country regulator, never automatic) distinct; Phase 23.1 Class-10 diploma track
retained with conditional lateral entry and neutral wording.

## 8. Golden test results

`tests/phase23-2-golden-profiles.test.mjs` — 14/14 pass (A–D polytechnic, E–J medical,
K–L medical PG/abroad, determinism). Polytechnic G1–G10 and medical M1–M23 also green.

## 9. Career engine regression

Byte-identical vs `phase18-1-engine-freeze-baseline.json` (excluding `generatedAt`); 289 careers,
23 profiles.

## 10. Test / TS / build / deploy

- Test count: **579** (`npm test`, 0 fail).
- `npx tsc --noEmit --skipLibCheck` → 0 errors.
- `npm run build` → PASS.
- Vercel: https://technology-platform.vercel.app/ — deployment validated on push time (no
  infra change this branch).

## 11. Counts

- Career (active): **289**
- Program: **80**
- University: **20**
- IndianInstitution: **73,969**

## 12. Explicit confirmations

- **CAREER ENGINE UNCHANGED**
- **ASSESSMENT ENGINE UNCHANGED**
- **UNIVERSITY DATA PROTECTED**
- **INDIANINSTITUTION DATA PROTECTED**

## 13. Commit

`Phase 23.2: polytechnic pathway hardening and medical education intelligence v1`