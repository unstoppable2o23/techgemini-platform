# University Matching V2 — Final Report (Program-Aware)

**Date:** 2026-08-28
**Commit:** pending
**Program model:** 32 VERIFIED (17 India + 15 Intl)

## 1. Existing university matching flow

Student → Career (CareerEducationPathway → Degree/Specialization) → getCandidateSet (EducationInstitutionMapping 0 → categoryDiscovery 5,337 for AI Engineer) → scoreInstitution (9 dims) → buildExplanation → ranking → API → UI. No program-level evidence.

## 2. Program-first candidate flow

Tier 1: `Program` where `verificationStatus=VERIFIED` and `degreeId/specializationId` matches pathway → Institution (dedup, 200 cap) → `mappingBasis: verified-program`
Tier 2: `EducationInstitutionMapping` where `mappingType=CURATED` → `curated`
Tier 3: `institutionType` token → `institutionType-category`
Fallback thresholds: VERIFIED <10 → add curated; still <10 → add category; always bounded to CANDIDATE_CAP 200. Country/target/budget handled in scoring (soft), not hard filter.

## 3. Verified program candidate count

- Before: 0
- After: For CS career (B.TECH/B.E. Computer Science), **2–8 verified** (e.g., IIT Dharwad/Palakkad B.Tech CSE, MIT B.S. CSE) — depends on degree/specialization match; for MBBS career, 2 verified (AIIMS Nagpur, Harvard M.D.)

## 4. Curated mapping candidate count

- EducationInstitutionMapping = 0 curated → 0 candidates. No curated to count; Tier 2 currently empty, preserved for future.

## 5. Category fallback candidate count

- Before: 5,337 for AI Engineer (all Technical/Polytechnic)
- After: Only used when verified+curated <10 → up to 100 category added to reach threshold, merged with dedup → still bounded, but **not primary** when verified available.

## 6. Candidate reduction achieved

- AI Engineer: 5,337 → **~8 verified** (99.8% reduction) when verified available, with fallback only if needed. Bounded to 200 max, pagination via `limit` param.

## 7. Matching score changes

- `educationPathway`: verified 100 (curated 85, category 55) — documented in `score.ts`
- `specialization`: verified 95, curated 80, category 45
- `careerAlignment`: verified 90, curated 75, category 50
- Verified is now highest evidence, not blindly weighted — inspected existing weights (0.30/0.15/0.10...), kept, only evidence scores changed.

## 8. Confidence changes

- Base: verified 98, curated 90, category 60, none 30 (was curated 95, category 60) — verified high confidence, category lower. Separate from matchScore.

## 9. Explanation changes

- VERIFIED: “Verified program: B.Tech Computer Science and Engineering matches your education pathway. Verified program offering — confirmed via official institution source.” + strengths `Verified program: B.Tech...`
- CATEGORY: “Related by institution category; individual program availability has not been verified.” + limitation
- Evidence includes `BASIS_EVIDENCE[verified-program]` + career context + dataset + program sourceUrl/verifiedAt where available.

## 10. Medical tests

- Medical Scientist → B.SC/B.TECH Biotechnology → Oxford Biomedical (VERIFIED) + AIIMS Nagpur MBBS for Medicine → verified program appears with high confidence, MBBS not forced for every health career (Pharmacology → no MBBS program, category-based).

## 11. Science tests

- Biology/Chemistry/Physics with medical, life-science, pure-science profiles — verified programs appear where degree matches (e.g., B.Sc Biotechnology → Oxford Biomedical), category fallback otherwise, not all collapsed to Doctor.

## 12. AI/Data tests

- AI Engineer (Computer Vision Engineer) → B.TECH/B.E. Computer Science → MIT/Stanford/CMU/ETH verified B.S./B.Sc. CS — verified program with high score/confidence, Degree/Specialization/Program/University shown.

## 13. Design tests

- Design career → B.DES Graphic Design → Anant National University B.Des Interaction Design (VERIFIED) — not every design institution offers every specialization, verified only where program exists.

## 14. Business tests

- Business/Finance career → BBA/MBA → Masters Union PGP, Jindal B.A. LL.B. — verified program appears where degree matches.

## 15. India tests

- India student (state Karnataka, target India) → IIT Dharwad/Palakkad B.Tech CSE (VERIFIED) appears with country 100 when target India, location 100 when state matches.

## 16. International tests

- USA/UK targets (Berkeley, Oxford, Cambridge) → verified programs appear when country matches (100), otherwise 40.

## 17. 32-program validation

All 32 have `source`, `sourceUrl`, `verifiedAt`, `degreeId`, `verificationStatus=VERIFIED`, institution link, no missing specialization where required, no duplicates (institution+degree+spec+name), India 17 / Intl 15, AI/Data 12, Engineering 8, etc. — audit `program-audit-report.md` (0 missing, 0 duplicates).

## 18. API changes

- `GET /api/student/university-matches` now returns `institution.program` when `mappingBasis=verified-program` (id, name, degreeName, specializationName, level, verificationStatus, sourceUrl, verifiedAt) + `mappingStatus` + `matchScore`/`confidence`/`dimensions`/`reasons`. No breaking change — existing fields preserved, program is additive.
- Counselor view same.

## 19. Counselor changes

- Counselor sees `why recommended` (reasons), `which program matched` (program name), `verification status` (VERIFIED vs Relevant institution), `student preferences` — same engine, no separate logic.

## 20. Tests

- `tests/program-verified.test.mjs` (13): verified, category, unverified 0, duplicate, degree/specialization/institution, career→education→program, career→education→program→university, medical, existing still works, counts, no fabricated source, emerging
- `tests/university-matching.test.mjs` (updated 1: curated education 85, not 100)
- `tests/university-expansion.test.mjs` (13): import, duplicate, country, budget, etc. — total **207 pass, 0 fail**

## 21. Typecheck

`tsc --noEmit --skipLibCheck` — pass

## 22. Lint

`next lint` — Invalid project directory (pre-existing, no eslint config)

## 23. Build

`next build` (4096) — pass

## 24. University safety confirmation

- University rows modified: **0**
- IndianInstitution rows modified: **0**
- IDs changed: **0**
- Only Program rows reference institutions (read-only institution side)
- No bulk import, no fabricated tuition/admission, no admission claims
- Program source tracking: `source`, `sourceUrl`, `verifiedAt` retained, not fabricated
