# Institution Source Report — Expansion Batch V1

**Date:** 2026-08-28
**Batch:** 7 IndianInstitution + 12 University = 19 new verified records
**Method:** Explicit `node scripts/import-university-batch-v1.mjs` (dry-run → apply → second-run verify)

## New India (IndianInstitution, source verified)

| Institution | Model | Source | Source URL | Verified | Duplicate check | Program evidence |
|-------------|-------|--------|------------|----------|-----------------|------------------|
| Indian Institute of Information Technology Bhopal | IndianInstitution | NIRF 2024 / iitbhopal.ac.in | https://www.iiitbhopal.ac.in | 2026-08-28 | exact+normalized+website — MISSING → approved | CATEGORY_BASED (institutionType token) |
| Masters Union | IndianInstitution | UGC / mastersunion.org | https://www.mastersunion.org | 2026-08-28 | exact+normalized+website — MISSING → approved | CATEGORY_BASED |
| Scaler School of Technology | IndianInstitution | UGC / scaler.com | https://www.scaler.com | 2026-08-28 | exact+normalized+website — MISSING → approved | CATEGORY_BASED |
| Newton School of Technology | IndianInstitution | UGC / newtonschool.co | https://www.newtonschool.co | 2026-08-28 | exact+normalized+website — MISSING → approved | CATEGORY_BASED |
| Presidency University Bangalore | IndianInstitution | UGC / presidencyuniversity.in | https://presidencyuniversity.in | 2026-08-28 | exact+normalized+website — MISSING → approved | CATEGORY_BASED |
| Rashtram School of Public Leadership | IndianInstitution | UGC / rashtram.org | https://rashtram.org | 2026-08-28 | exact+normalized+website — MISSING → approved | CATEGORY_BASED |
| O.P. Jindal Global University | IndianInstitution | UGC / jgu.edu.in | https://jgu.edu.in | 2026-08-28 | exact+normalized+website — MISSING → approved | CATEGORY_BASED |

**Rejected/skipped India (16):** IIT Dharwad, IIT Palakkad, IIT Tirupati, IIT Jammu, IIIT Kota, IIIT Una, IIIT Kalyani, SRM AP, UPES, Chitkara, Koneru Lakshmaiah, Lovely Professional, Vidyashilp, Medi-Caps, Sandip, Quantum — all matched existing record via exact/normalized/website → skipped (no update per Step 34).

## New International (University, source verified)

| Institution | Model | Source | Source URL | Verified | Duplicate check | Program evidence |
|-------------|-------|--------|------------|----------|-----------------|------------------|
| Massachusetts Institute of Technology | University | official | https://web.mit.edu | 2026-08-28 | tenant+exact+normalized+website — MISSING → approved | CATEGORY_BASED |
| Stanford University | University | official | https://www.stanford.edu | 2026-08-28 | MISSING → approved | CATEGORY_BASED |
| Carnegie Mellon University | University | official | https://www.cmu.edu | 2026-08-28 | MISSING → approved | CATEGORY_BASED |
| University of California, Berkeley | University | official | https://www.berkeley.edu | 2026-08-28 | MISSING → approved | CATEGORY_BASED |
| ETH Zurich | University | official | https://ethz.ch | 2026-08-28 | MISSING → approved | CATEGORY_BASED |
| University of Oxford | University | official | https://www.ox.ac.uk | 2026-08-28 | MISSING → approved | CATEGORY_BASED |
| University of Cambridge | University | official | https://www.cam.ac.uk | 2026-08-28 | MISSING → approved | CATEGORY_BASED |
| Imperial College London | University | official | https://www.imperial.ac.uk | 2026-08-28 | MISSING → approved | CATEGORY_BASED |
| National University of Singapore | University | official | https://www.nus.edu.sg | 2026-08-28 | MISSING → approved | CATEGORY_BASED |
| Nanyang Technological University | University | official | https://www.ntu.edu.sg | 2026-08-28 | MISSING → approved | CATEGORY_BASED |
| Harvard University | University | official | https://www.harvard.edu | 2026-08-28 | MISSING → approved | CATEGORY_BASED |
| Georgia Institute of Technology | University | official | https://www.gatech.edu | 2026-08-28 | MISSING → approved | CATEGORY_BASED |

**Rejected/skipped Intl (0):** None — University was empty locally.

## Verification

- **Identity:** stable canonical name → slug via `slugify`; website/domains stored
- **Slug uniqueness:** enforced via DB `@@unique` + `slugify` with dedup check
- **Fields populated only from reliable evidence:** name, country/state, district, website, type, institutionType, management, city, source, domains/webPages, tenantId — no invented rank/tuition/student numbers
- **Program evidence:** CATEGORY_BASED for all 19 (no `EducationInstitutionMapping` fabricated). VERIFIED requires official institution source confirming program — to be added in follow-up batch, documented as gap per Step 14.
- **Second-run:** 0 approved, 35 skipped — idempotent, no duplicates
- **Existing records modified:** 0 / 0 / 0 (University / IndianInstitution / IDs)
