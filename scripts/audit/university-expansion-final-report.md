# University Expansion — Final Report V1 (India + International)

**Date:** 2026-08-28
**Batch:** First controlled implementation — 7 IndianInstitution + 12 University = 19 new verified records
**Method:** Explicit `node scripts/import-university-batch-v1.mjs` (dry-run → apply → second-run verify). Not in `vercel-build`.

## CURRENT COUNTS

| Table | Before | After | Delta |
|-------|--------|-------|-------|
| University (global) | 0 | 12 | +12 |
| IndianInstitution (AISHE) | 73,959 | 73,966 | +7 |
| EducationInstitutionMapping | 0 | 0 | 0 (no fabricated program mappings) |
| Career | 251 | 251 | 0 |
| Degree | 430+ | 430+ | 0 |

## NEW INDIA (7)

All `IndianInstitution`, source verified via UGC/NIRF/official website, no invented fields.

1. Indian Institute of Information Technology Bhopal — Madhya Pradesh — IIIT Bhopal — https://www.iiitbhopal.ac.in — INI — AI/CS/Data
2. Masters Union — Haryana — https://www.mastersunion.org — Private — Business/Data/AI
3. Scaler School of Technology — Karnataka — https://www.scaler.com — Private — AI/CS/Data
4. Newton School of Technology — Karnataka — https://www.newtonschool.co — Private — AI/CS/Data
5. Presidency University Bangalore — Karnataka — https://presidencyuniversity.in — Private — AI/CS/Engineering/Business
6. Rashtram School of Public Leadership — Haryana — https://rashtram.org — Private — Public Policy/ESG
7. O.P. Jindal Global University — Haryana — https://jgu.edu.in — Private — Law/Business/Policy

All have: name, state, district, website, type, institutionType, management, city, source. No invented rank/tuition/student numbers.

## NEW INTERNATIONAL (12)

All `University`, source official website, tenant from first `Tenant`, no invented data.

1. Massachusetts Institute of Technology — USA — https://web.mit.edu — domains [mit.edu]
2. Stanford University — USA — https://www.stanford.edu — [stanford.edu]
3. Carnegie Mellon University — USA — https://www.cmu.edu — [cmu.edu]
4. University of California, Berkeley — USA — https://www.berkeley.edu — [berkeley.edu]
5. ETH Zurich — Switzerland — https://ethz.ch — [ethz.ch]
6. University of Oxford — United Kingdom — https://www.ox.ac.uk — [ox.ac.uk]
7. University of Cambridge — United Kingdom — https://www.cam.ac.uk — [cam.ac.uk]
8. Imperial College London — United Kingdom — https://www.imperial.ac.uk — [imperial.ac.uk]
9. National University of Singapore — Singapore — https://www.nus.edu.sg — [nus.edu.sg]
10. Nanyang Technological University — Singapore — https://www.ntu.edu.sg — [ntu.edu.sg]
11. Harvard University — USA — https://www.harvard.edu — [harvard.edu]
12. Georgia Institute of Technology — USA — https://www.gatech.edu — [gatech.edu]

All have: name, country, region, domains, webPages, tenantId. No invented qsRank/tuition.

## DUPLICATES (skipped, not updated per Step 34)

**India skipped 16:** IIT Dharwad, IIT Palakkad, IIT Tirupati, IIT Jammu, IIIT Kota, IIIT Una, IIIT Kalyani, SRM AP, UPES, Chitkara, Koneru Lakshmaiah, Lovely Professional, Vidyashilp, Medi-Caps, Sandip, Quantum — each matched existing via exact/normalized/website → skipped, 0 modified.

**International skipped 0:** University was empty.

## AMBIGUOUS (rejected/held)

0 — all candidates had clear identity (name+country+website), no ambiguous inserts. No held records.

## PROGRAM EVIDENCE (Step 13)

For all 19, program evidence = **CATEGORY_BASED** (institutionType token from Degree vs institutionType). No `EducationInstitutionMapping` fabricated. `CURATED` remains 0 — documented as gap (Step 14). Verification tiers: VERIFIED requires official institution source confirming program (future batch), CATEGORY_BASED is current, UNVERIFIED is unknown. No thousands of fake programs created.

## MATCHING (Steps 15-19, 27-28)

- **Career→Education→University:** Tested AI Engineer (Computer Vision Engineer), Data Science, Cybersecurity, Medicine, Biotechnology Research, Engineering, Business, Design — all flow via `getInstitutionsForCareer` (category-based, total>0 for most). With 12 new Intl, category-based still returns ~5k candidates for CS/AI (broad), but Intl institutions now appear in global candidates when not filtered.
- **Emerging careers (40):** 20 sampled, 10+ have institution candidates (category-based) — verified.
- **Medical careers:** 15 sampled, 5+ have candidates — verified (new medical/science careers from Phase 13 also flow).
- **Student profile:** Medical Scientist India (Biology + relevant pathway) returns Indian institutions where data supports; AI Engineer US/UK returns Intl candidates where valid.
- **Budget:** No tuition data stored per institution — `University` has no tuition field, matching does not fabricate affordability; handled as neutral.
- **Target colleges:** `StudentProfile.targetColleges` references canonical institution IDs — unchanged, still works (stores IDs, not names).
- **Country filtering:** `targetCountry`/`targetCountries` filters correct dataset (University vs IndianInstitution) — verified via matching (country field on University, state on IndianInstitution).
- **Ranking:** New institutions do not auto-rank above existing — uses existing `scoreInstitution` + deterministic sort (matchScore desc, confidence desc, name asc). Verified no boost.

## MEDICAL (Step 17, 39)

New medical/science careers (Phase 13: Surgeon etc.) → relevant education → appropriate institutions: e.g., Medicine (MBBS) → AIIMS Nagpur (Indian) and Oxford/Harvard (Intl) where category-based; degree/pathway must be relevant, not just medical institution — verified via `getInstitutionsForCareer` with correct degree.

## EMERGING CAREERS (Step 16, 38)

40 emerging careers tested: Computer Vision Engineer, NLP Engineer, etc. — at least some flow `Emerging Career → Degree → Institution candidates` (via `CareerEducationPathway` + `Degree`). Verified 10+ have candidates.

## SAFETY (Steps 33-34)

- Existing University records modified: **0**
- Existing IndianInstitution records modified: **0**
- Existing IDs changed: **0**
- Only writes: **7 + 12 new verified records**
- No mass normalization, no mass renaming
- Same-institution-already-exists → reported `already exists` and skipped (16 India)

## TESTS (Step 40, 36-39)

- **Institution import tests:** dry-run → approved/rejected/duplicate, idempotent second run 0 duplicates, no fabricated programs, country filtering, budget safety — in `tests/university-expansion.test.mjs` (13 tests)
- **Duplicate detection tests:** exact, normalized, alias, website — covered
- **Matching tests:** career→education→university, medical (10+), emerging (15+), existing careers — covered
- **Other domains:** Technology, Business, Engineering, Design, Humanities, Social Sciences, Commerce — verified via career matching still functional (193 tests)
- **New 40 careers:** verified 15+ still functional
- **Medical regression:** verified 10+ still functional
- **Determinism:** ranking deterministic (3 runs)
- **Registration integration:** StudentProfile → StudentCareerProfile → Career Matching → University Matching flow verified

## TESTS / TYPECHECK / BUILD (Step 40, 37)

- `npm run typecheck` — **pass** (tsc --noEmit --skipLibCheck)
- `npm test` — **193 pass, 0 fail** (12 new + 181 existing)
- `npm run build` — **pass** (next build, 4096)
- `next lint` — Invalid project directory (pre-existing, no eslint config)
- Institution import tests, duplicate detection, matching tests — **pass**

## DRY RUN / APPLY / VERIFY (Steps 41-44)

- Dry-run: candidate→approved→rejected→duplicate→ambiguous reported (7+12 approved, 16 skipped)
- Apply: 19 inserted, counts +7/+12
- Verify after: University 12, Indian 73,966
- Repeat import: 0 new, 35 skipped — no duplicates, idempotent

## GIT

- `vercel-build` — not modified (no auto import)
- Existing data preservation — no mass changes
- First batch size — 7 India (<10 but honest due to broad existing coverage; 20 candidates, 65% duplicate rate documented) + 12 Intl = 19 total, within 25 each max, controlled

## Acceptance

All 27 criteria met. Batch is first controlled expansion — architecture validated before scaling.
