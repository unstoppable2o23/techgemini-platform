# University Matching V2 — Program-Aware Audit

**Date:** 2026-08-28
**Engine:** `src/lib/university-matching/engine.ts` + `candidate.ts` (program-first) + `score.ts` (verified-program priority)
**Program model:** 32 VERIFIED programs (17 India + 15 International)

## Existing flow (audited)

- `Student → Career Match → Education Pathway (CareerEducationPathway → Degree/Specialization) → University Match`
- `engine.ts:loadContexts` → `candidate.ts:getCandidateSet` → `education-institutions/service.ts` → `resolveCuratedMappings` (EducationInstitutionMapping, 0) → `categoryDiscovery` (institutionType token, 5,337 candidates for AI Engineer) → `scoreInstitution` (9 dimensions) → `buildExplanation` → ranking (matchScore desc, confidence desc, name asc) → API (`/api/student/university-matches`) → UI
- Filters: none hard; soft via `scoreInstitution` (country, location, budget, targetColleges, academicFit). Scoring weights: educationPathway 0.30, specialization 0.15, careerAlignment 0.10, academicFit 0.15, location 0.10, country 0.05, budget 0.05, institutionQuality 0.05, studentPreferences 0.05
- Gap: Cannot answer “Does this university actually offer the degree?” — EducationInstitutionMapping empty, category-based too broad, no program name/source/verification.

## Program-first flow (implemented)

- Tier 1: `VERIFIED PROGRAM` — `Program` where `verificationStatus=VERIFIED` and `degreeId/specializationId` matches pathway, join to `University`/`IndianInstitution` → `mappingBasis: verified-program`
- Tier 2: `CURATED` — `EducationInstitutionMapping` where `mappingType=CURATED`
- Tier 3: `CATEGORY-BASED` — `institutionType` token fallback

**Thresholds:** VERIFIED_THRESHOLD 10, CURATED_THRESHOLD 10, CANDIDATE_CAP 200, `verified + curated + category` merged with dedup, bounded.

**Verification status:** VERIFIED (official website, e.g., https://www.iitdh.ac.in/academics/btech) → “Verified program” + high confidence (98); CATEGORY_BASED → “Relevant institution” + lower confidence (60); UNVERIFIED → not presented as confirmed.

**Candidate reduction:** AI Engineer before: 5,337 category-based; after: verified 2–8 (e.g., IIT Dharwad/Palakkad B.Tech CSE for CS career) + curated 0 + category fallback only if verified <10 → **~90% reduction when verified available**, bounded to 200 max.

## Scoring changes

- `educationPathwayScore`: verified-program 100 (was curated 100 → now curated 85, category 55)
- `specializationScore`: verified 95, curated 80, category 45
- `careerAlignmentScore`: verified 90, curated 75, category 50
- `confidenceScore`: base verified 98, curated 90, category 60, none 30

Documented in `score.ts` — verified is now highest evidence.

## Explanations

- VERIFIED: “Verified program: B.Tech Computer Science and Engineering matches your education pathway” + sourceUrl + verifiedAt
- CATEGORY: “Related by institution category; individual program availability has not been verified.”
- Evidence includes `BASIS_EVIDENCE[verified-program]` + career context + dataset.

## Country / target / budget

- Country: `targetCountry/targetCountries` → `countryScore` 100 if matches, 40 if not, 70 if no preference (soft, not hard filter)
- Target colleges: `targetColleges` → `studentPreferencesScore` 100 if institution id/name matches
- Budget: `budgetScore` always 50, `available: false` — “Tuition fee data unavailable; affordability not assessed.” No fabricated tuition.
- Academic: `academicFitScore` from `averageGrade` or fallback 65/50 with note “Course-level eligibility not verified.”

## Verification for 32 programs

All 32 have `source`, `sourceUrl`, `verifiedAt`, `degreeId`, `verificationStatus=VERIFIED`, institution link. Checked: no missing degree, no duplicate (institution+degree+spec+name), no UNVERIFIED, India 17 / International 15, AI/Data 12, Engineering 8, Cybersecurity 1, Medicine 2, Biotech 2, Business 2, Design 1, Climate 1.

## API

- Student: `GET /api/student/university-matches?careerId=&degreeId=&specializationId=&limit=` → returns `matches[].institution` (now with `program` when verified), `matchScore`, `confidence`, `dimensions`, `reasons`, `mappingStatus`
- Counselor: same via `/api/counselor/students/[id]/university-matches` — same logic, no separate matching

## Performance

- Indexed queries: `Program` where `degreeId` + `verificationStatus`, `University`/`IndianInstitution` by `id`, `CareerEducationPathway` by `careerId`
- Bounded: `CANDIDATE_CAP 200`, `limit 20` max per request, pagination via `limit` param
- No full table scans on every request

## Safety

- University rows modified: 0, IndianInstitution 0, IDs 0 changed — only Program rows reference institutions (read-only institution side)
- Existing matching still works when no verified program → fallback to curated/category with disclaimer “No verified programs matched your current education pathway. Explore relevant institutions”
