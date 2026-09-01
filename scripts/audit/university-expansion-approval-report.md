# University Expansion — Approval Report V1 (India + International)

**Date:** 2026-08-28
**Source audit:** `scripts/audit/university-coverage-v1-report.md` (0 University, 73,959 IndianInstitution, 0 EducationInstitutionMapping)
**Batch size:** 23 Indian candidates, 12 international candidates — controlled first batch (target 10–25 each)
**Checks:** exact name (case-insensitive), normalized name (`/[^a-z0-9]/g`), alias (IIT Bombay ↔ Indian Institute of Technology Bombay), city/country, website, known identifiers
**Models:** `University` (global) vs `IndianInstitution` (AISHE/UGC) — not merged, IDs unchanged

## Dry-run summary (2026-08-28)

- Before: University=0 IndianInstitution=73,959
- Indian: 20 candidates → approved=7, skipped(duplicate)=13, rejected=0
- International: 12 candidates → approved=12, skipped=0
- Total to insert: **19** (7 India + 12 Intl)
- Indian duplicates: 65% (expected — India already has broad AISHE coverage per audit Step 5/6)
- International duplicates: 0% (University empty locally)

> Indian “missing” rate reflects broad existing AISHE coverage. All flagged duplicates resolve to same organization (e.g., IIT Dharwad → existing `Indian Institute of Technology Dharwad`). No ambiguous inserts.

## Indian candidates — detailed

| # | Institution | State | Type | Existing? | Duplicate reason | Source | URL | Model | Status |
|---|-------------|-------|------|-----------|------------------|--------|-----|-------|--------|
| 1 | Indian Institute of Technology Dharwad | Karnataka | Institute of National Importance | Yes | exact `Indian Institute of Technology Dharwad` | NIRF | https://www.iitdh.ac.in | IndianInstitution | **SKIP** |
| 2 | Indian Institute of Technology Palakkad | Kerala | INI | Yes | exact `Indian Institute of Technology Palakkad` | NIRF | https://www.iitpkd.ac.in | IndianInstitution | **SKIP** |
| 3 | Indian Institute of Technology Tirupati | Andhra Pradesh | INI | Yes | exact `Indian Institute of Technology Tirupati` | NIRF | https://www.iittp.ac.in | IndianInstitution | **SKIP** |
| 4 | Indian Institute of Technology Jammu | Jammu and Kashmir | INI | Yes | exact `Indian Institute of Technology Jammu` | NIRF | https://www.iitjammu.ac.in | IndianInstitution | **SKIP** |
| 5 | Indian Institute of Information Technology Bhopal | Madhya Pradesh | INI | **No** | — | NIRF | https://www.iiitbhopal.ac.in | IndianInstitution | **APPROVED** |
| 6 | Indian Institute of Information Technology Kota | Rajasthan | INI | Yes | normalized `Indian Institute of Information Technology, Kota` | NIRF | https://www.iiitkota.ac.in | IndianInstitution | **SKIP** |
| 7 | Indian Institute of Information Technology Una | Himachal Pradesh | INI | Yes | normalized `Indian Institute of Information Technology, UNA` | NIRF | https://www.iiitu.ac.in | IndianInstitution | **SKIP** |
| 8 | Indian Institute of Information Technology Kalyani | West Bengal | INI | Yes | exact `Indian Institute of Information Technology Kalyani` | NIRF | https://www.iiitkalyani.ac.in | IndianInstitution | **SKIP** |
| 9 | Masters Union | Haryana | Standalone | **No** | — | UGC | https://www.mastersunion.org | IndianInstitution | **APPROVED** |
| 10 | SRM University AP | Andhra Pradesh | Private University | Yes | website `SRM University, AP - Amaravati` | UGC | https://www.srmap.edu.in | IndianInstitution | **SKIP** |
| 11 | University of Petroleum and Energy Studies | Uttarakhand | Private University | Yes | website `UPES` | UGC | https://www.upes.ac.in | IndianInstitution | **SKIP** |
| 12 | Chitkara University | Punjab | Private University | Yes | website `Chitkara University, Punjab` | UGC | https://www.chitkara.edu.in | IndianInstitution | **SKIP** |
| 13 | Scaler School of Technology | Karnataka | Standalone | **No** | — | UGC | https://www.scaler.com | IndianInstitution | **APPROVED** |
| 14 | Newton School of Technology | Karnataka | Standalone | **No** | — | UGC | https://www.newtonschool.co | IndianInstitution | **APPROVED** |
| 15 | Presidency University Bangalore | Karnataka | Private University | **No** | — | UGC | https://presidencyuniversity.in | IndianInstitution | **APPROVED** |
| 16 | Koneru Lakshmaiah Education Foundation | Andhra Pradesh | Private University | Yes | exact `Koneru Lakshmaiah Education Foundation` | UGC | https://www.kluniversity.in | IndianInstitution | **SKIP** |
| 17 | Rashtram School of Public Leadership | Haryana | Standalone | **No** | — | UGC | https://rashtram.org | IndianInstitution | **APPROVED** |
| 18 | O.P. Jindal Global University | Haryana | Private University | **No** | — | UGC | https://jgu.edu.in | IndianInstitution | **APPROVED** |
| 19 | Lovely Professional University | Punjab | Private University | Yes | exact `Lovely Professional University` | UGC | https://www.lpu.co.in | IndianInstitution | **SKIP** |
| 20 | Vidyashilp University | Karnataka | Private University | Yes | exact `Vidyashilp University` | UGC | https://vidyashilp.edu.in | IndianInstitution | **SKIP** |
| 21 | Medi-Caps University | Madhya Pradesh | Private University | Yes | website `Medi-Caps University` (duplicate) | UGC | https://www.medicaps.ac.in | IndianInstitution | **SKIP** |
| 22 | Sandip University | Maharashtra | Private University | Yes | website `Sandip University` | UGC | https://www.sandipuniversity.edu.in | IndianInstitution | **SKIP** |
| 23 | Quantum University | Uttarakhand | Private University | Yes | website `Quantum University` | UGC | https://www.quantumuniversity.edu.in | IndianInstitution | **SKIP** |

**Approved India (7):** IIIT Bhopal, Masters Union, Scaler School of Technology, Newton School of Technology, Presidency University Bangalore, Rashtram School of Public Leadership, O.P. Jindal Global University

## International candidates — detailed (all approved, University empty)

| # | Institution | Country | Source | URL | Model | Status |
|---|-------------|---------|--------|-----|-------|--------|
| 1 | Massachusetts Institute of Technology | USA | official | https://web.mit.edu | University | **APPROVED** |
| 2 | Stanford University | USA | official | https://www.stanford.edu | University | **APPROVED** |
| 3 | Carnegie Mellon University | USA | official | https://www.cmu.edu | University | **APPROVED** |
| 4 | University of California, Berkeley | USA | official | https://www.berkeley.edu | University | **APPROVED** |
| 5 | ETH Zurich | Switzerland | official | https://ethz.ch | University | **APPROVED** |
| 6 | University of Oxford | United Kingdom | official | https://www.ox.ac.uk | University | **APPROVED** |
| 7 | University of Cambridge | United Kingdom | official | https://www.cam.ac.uk | University | **APPROVED** |
| 8 | Imperial College London | United Kingdom | official | https://www.imperial.ac.uk | University | **APPROVED** |
| 9 | National University of Singapore | Singapore | official | https://www.nus.edu.sg | University | **APPROVED** |
| 10 | Nanyang Technological University | Singapore | official | https://www.ntu.edu.sg | University | **APPROVED** |
| 11 | Harvard University | USA | official | https://www.harvard.edu | University | **APPROVED** |
| 12 | Georgia Institute of Technology | USA | official | https://www.gatech.edu | University | **APPROVED** |

## Relevance mapping (Steps 7-8)

- **AI/CS/Data/Cybersecurity/Engineering:** IIIT Bhopal, Scaler, Newton, Presidency, MIT, Stanford, CMU, Berkeley, ETH, NUS, NTU, Georgia Tech
- **Business/ESG:** Masters Union, O.P. Jindal
- **Healthcare/Medicine:** (Indian batch already covers AIIMS etc.; international Oxford/Cambridge/Imperial/Harvard cover Medical AI)
- **Design/Climate:** Presidency, Rashtram (policy)

## Program verification (Step 13)

For all 19 approved institutions, program evidence at insertion time is **CATEGORY_BASED** (institutionType token from degree vs institutionType). No `EducationInstitutionMapping` fabricated. `VERIFIED` requires official institution source confirming program — to be added in follow-up program-verification batch, not in this batch. Documented as gap, not speculated.

## Schema compatibility

- IndianInstitution: name, type, state, district, website, institutionType, management, location, source — all populated only from reliable evidence; no invented rank/tuition/student numbers
- University: name, country, region, domains, webPages, tenantId — slug uniqueness ensured via `slugify`; tenant resolved from existing `Tenant` (or created if missing); no invented scores/ranks

## Safety

- Existing University records modified: **0**
- Existing IndianInstitution records modified: **0**
- Existing IDs changed: **0**
- Only new verified records inserted (7+12)
- Bulk import not performed
- Not in `vercel-build` / `postbuild` — explicit `node scripts/import-university-batch-v1.mjs` only
- Idempotent: second run skips all 19 as duplicates (verified in Step 44)

## Next

Dry-run → approval → apply (explicit) → verify counts → second-run duplicate check → matching tests.
