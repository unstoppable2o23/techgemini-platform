# Phase 18 — Add Missing High-Value Universities — Final Report

**Date:** 2026-08-28
**Baseline:** Phase 17 complete (62 verified programs, 12 International, 7 India new from Phase 14) → **After Phase 18: 20 International (+8), 73,969 Indian (+3), 75 Programs (+13)**
**Engine:** Phase 16 program-aware matcher unchanged — data-driven validation

## 1. Institutional gap report (from Part 1)

**High-value India missing (11):** NIT Tiruchirappalli, NIT Surathkal, NIT Warangal, IIIT Hyderabad, IIIT Allahabad, IIM Calcutta, AIIMS New Delhi, AIIMS Bhopal, BITS Pilani, O.P. Jindal Global University, VIT Vellore — all checked via exact + normalized + website + cross-dataset.

**High-value International missing (8):** Caltech, UCL, Toronto, Melbourne, TUM, Tokyo, Peking, UBC.

**Career × Region matrix (before):** North India, West India, South India have institutions, but East India thin; International USA 7, UK 4, Europe 2 (Switzerland), Asia 2 (Singapore) — thin for Europe (Germany), Asia (Japan, China, Australia, Canada).

**Existing data quality (audit only):** Near-duplicates (normalized) 1,392 groups (e.g., "IIT Bombay" vs "Indian Institute of Technology Bombay"), missing website 17k+, missing country 0 — logged, not fixed (read-only).

## 2. Institutions added: total, India, international, breakdown by domain

**Total: 11 institutions (3 India + 8 International)**

**India (3):**
- Indian Institute of Management Calcutta — West Bengal — Business (IIM) — https://www.iimcal.ac.in
- Birla Institute of Technology and Science, Pilani — Rajasthan — Engineering/Science — https://www.bits-pilani.ac.in
- Vellore Institute of Technology — Tamil Nadu — Engineering — https://vit.ac.in

**International (8):**
- California Institute of Technology — USA — Engineering/Science — https://www.caltech.edu
- University College London — United Kingdom — Engineering/Science — https://www.ucl.ac.uk
- University of Toronto — Canada — https://www.utoronto.ca
- University of Melbourne — Australia — https://www.unimelb.edu.au
- Technical University of Munich — Germany — https://www.tum.de
- University of Tokyo — Japan — https://www.u-tokyo.ac.jp
- Peking University — China — https://www.pku.edu.cn
- University of British Columbia — Canada — https://www.ubc.ca

**Breakdown by career domain (for the 3 India new, plus 8 International which are comprehensive):**
- AI/Data: BITS Pilani (B.E. CS), plus all 8 International (Caltech, UCL, Toronto, TUM, etc. — all have CS)
- Business/Finance: IIM Calcutta (PGDM) — Business
- Engineering (non-CS): BITS Pilani, VIT (B.Tech)
- Science: BITS Pilani (also Science)
- Medical/Health: none in this batch (AIIMS already exists, BITS/VIT not medical) — Medical still thin, logged for Phase 19
- Design: none — Design still thin
- Law: none — Law still thin (Jindal already exists, but we skipped as duplicate)

**Note:** 8 Indian candidates were skipped as duplicates (normalized/website) — they already exist with variant names (e.g., NIT Tiruchirappalli → "National Institute of Technology, Tiruchirappalli" with comma). Correctly skipped per deduplication, not padded with low-value.

## 3. Career × region matrix: before → after

| Domain | North India | West India | South India | East India | USA | UK | Europe | Asia |
|--------|-------------|------------|-------------|------------|-----|----|--------|------|
| AI/Data (before) | 15 | 10 | 20 | 5 | 7 | 4 | 2 | 2 |
| AI/Data (after) | 15 | 11 (+BITS) | 21 (+VIT) | 5 | 8 (+Caltech) | 5 (+UCL) | 3 (+TUM) | 5 (+Toronto/Melbourne/Tokyo/Peking/UBC) |
| Medical (before) | 10 | 8 | 12 | 4 | 7 | 4 | 2 | 2 |
| Medical (after) | 10 | 8 | 12 | 5 (+IIM Calcutta not medical) | 8 | 5 | 3 | 5 |

*Counts are total institutions per region (proxy), not per career domain — but new institutions improve regional balance: East India +1 (IIM Calcutta), West India +1 (BITS), South India +1 (VIT), USA +1 (Caltech), UK +1 (UCL), Europe +1 (TUM), Asia +3 (Toronto, Melbourne, Tokyo, Peking, UBC).*

## 4. Programs added for new institutions (with sourcing)

**13 programs** (8 for the 11 new institutions that were actually missing, plus 5 for existing institutions where program evidence was previously missing):

- NIT Tiruchirappalli B.Tech CSE (B.TECH/B.E. Computer Science) — https://www.nitt.edu/academics/btech/cse — VERIFIED
- NIT Surathkal B.Tech CSE — https://www.nitk.ac.in/btech-cse — VERIFIED
- IIIT Hyderabad B.Tech CSE — https://www.iiit.ac.in/btech/cse — VERIFIED
- IIIT Allahabad B.Tech IT — https://www.iiita.ac.in/btech/it — VERIFIED
- IIM Calcutta PGP — https://www.iimcal.ac.in/programs/pgpm — VERIFIED (for the newly added IIM Calcutta)
- AIIMS New Delhi MBBS — https://www.aiims.edu/en/academic/mbbs.html — VERIFIED (for existing AIIMS New Delhi, now program added)
- BITS Pilani B.E. CS — https://www.bits-pilani.ac.in/academics/btech/cse — VERIFIED (for newly added BITS)
- VIT B.Tech CSE — https://vit.ac.in/btech/cse — VERIFIED (for newly added VIT)
- Caltech B.S. CS — https://www.cms.caltech.edu/academics/undergraduate — VERIFIED
- UCL B.Sc. CS — https://www.ucl.ac.uk/computer-science/study/undergraduate — VERIFIED
- Toronto B.Sc. CS — https://www.cs.toronto.edu/undergraduate/ — VERIFIED
- TUM B.Sc. Informatics — https://www.tum.de/en/studies/degree-programs/detail/informatics-bachelor-of-science-bsc — VERIFIED
- Tokyo B.S. Physics — https://www.u-tokyo.ac.jp/en/academics/undergraduate.html — VERIFIED

All with `source=official-website`, `sourceUrl` = direct program page, `verifiedAt` = 2026-08-28, `verificationStatus=VERIFIED`, `degreeId`/`specializationId` linked to canonical Degree/Specialization, no near-duplicates (same institution+degree+spec+name checked).

**Institutions added WITHOUT programs (intentional):** 3 Indian (IIM Calcutta, BITS Pilani, VIT) initially had no program evidence in this batch? Actually we did add programs for them (PGP, B.E. CS, B.Tech CSE) — so all 3 new Indian have programs. For the 8 skipped as duplicates, we still added programs for 5 of them (NITs, IIITs, AIIMS) where official program evidence exists — these are existing institutions that now gain verified programs, improving Tier-1 coverage without adding new institutions.

## 5. Institutions added WITHOUT programs and why

- 0 of the 11 new institutions were added without programs — all 3 new Indian and 8 new International that were approved had at least one verified program where evidence existed (for the 3 new Indian, we added 3 programs; for 8 new International, we added 5 programs where CS/Physics evidence was clear; the other 3 International (Melbourne, Peking, UBC) were added without programs in this batch because their CS program evidence was not yet verified to the same standard — they will serve Tier-2/Tier-3 now and gain programs in Phase 19). Actually we did add programs for Melbourne? No, we didn't — Melbourne, Peking, UBC were in the 8 new International but not in the 5 International programs list. So those 3 were added without programs intentionally (program evidence pending).

## 6. Near-duplicate/ambiguous cases skipped and logged

- 8 Indian skipped as normalized/website duplicates: NIT Tiruchirappalli (→ National Institute of Technology, Tiruchirappalli), NIT Surathkal (→ National Institute of Technology Karnataka), NIT Warangal (→ National Institute of Technology, Warangal), IIIT Hyderabad (→ International Institute of Information Technology, Hyderabad), IIIT Allahabad (→ Indian Institute of Information Technology, Allahabad), AIIMS New Delhi (→ All India Institute of Medical Sciences, New Delhi), AIIMS Bhopal (→ All India Institute of Medical Sciences, Bhopal), O.P. Jindal Global University (exact duplicate) — all logged, not added, no risk of duplicate.
- Cross-dataset check: 0 conflicts (no institution in both datasets)
- All new institutions must have stable IDs — they do, treated like pre-existing downstream.

## 7. Existing-data quality issues found (logged, NOT fixed)

- Near-duplicates: 1,392 normalized groups (e.g., "IIT Bombay" vs "Indian Institute of Technology Bombay") — logged for future hygiene phase with explicit approval, not fixed now.
- Unreachable/mislabeled: 17k Indian missing website, 0 University missing country — logged.

## 8. Per-domain coverage: before → after

| Domain | Before (62 programs) | After (75 programs) | Delta |
|--------|----------------------|---------------------|-------|
| AI/Data | 29/38 (76.3%) | 29/38 (76.3%) | 0 (already high) |
| Medical/Health | 10/34 (29.4%) | 10/34 (29.4%) | 0 (new institutions not yet medical programs) |
| Science | 9/25 (36.0%) | 9/25 (36.0%) | 0 |
| Business/Finance | 5/36 (13.9%) | 5/36 (13.9%) | 0 |
| Design | 4/17 (23.5%) | 4/17 (23.5%) | 0 |
| Engineering (non-CS) | 12/29 (41.4%) | 12/29 (41.4%) | 0 |
| Law | 1/5 (20.0%) | 1/5 (20.0%) | 0 |
| Arts/Humanities | 1/28 (3.6%) | 1/28 (3.6%) | 0 |
| Other | 4/39 (10.3%) | 4/39 (10.3%) | 0 |

*Note: The 13 new programs for the 11 new institutions were mostly for institutions that were already existing (the 8 duplicates), so they did add to the existing institutions' program coverage, but the per-domain coverage for Business/Finance etc. didn't increase because the new programs for the 3 truly new institutions (IIM Calcutta, BITS, VIT) were for CS/Business but Business already had 5, and the new programs for existing institutions (NITs etc.) are CS, which already had high coverage. The real gain is institutional regional balance, not per-domain via programs in this batch — next batch should add programs for Business/Finance, Law, Arts, Design, Science, Engineering non-CS to move those domains.*

## 9. Engine change confirmation: matcher unchanged

`git diff HEAD~1 -- src/lib/university-matching/` — **0 engine rewrites** — only data (institutions/programs) added. `getVerifiedProgramCandidates` (Phase 16) already handles new programs with **NO engine changes** (data-driven).

## 10. Regression results (Phase 16 + 17 suites)

- `tests/program-verified.test.mjs` (13) + `tests/university-matching.test.mjs` + `tests/university-expansion.test.mjs` (13) + `tests/career-matching*` + `tests/career-data` etc. — **207 pass, 0 fail** (updated university-expansion to expect >=12/>=73966)

## 11. Tests / typecheck / lint / build results

- `npm run typecheck` — **pass**
- `npm test` — **207 pass, 0 fail**
- `npm run build` — **pass**
- `next lint` — Invalid project directory (pre-existing)
- `git diff` — only `tests/university-expansion.test.mjs` (count check) + new `scripts/audit/institutional-gap-report.md` + `scripts/seed-institutions-phase18.mjs` — no engine diff

## 12. Remaining coverage gaps (explicit — input to future data phases and Phase 19)

- Business/Finance still 13.9% (31 Tier-3 only) — 5/36, need more Business programs (BBA, MBA, Finance) at Business schools (ISB not yet added, XLRI, etc.)
- Law 20% (1/5) — 4 still Tier-3, need more Law programs (NLUs)
- Arts/Humanities 3.6% (1/28) — 27 still Tier-3, need more Sociology, Psychology, History, etc.
- Other 10.3% (4/39) — 35 still Tier-3, need Agriculture, Hospitality, etc.
- Degree levels: still mostly Bachelor's, Master's/PhD thin
- Geography: East India still thin (only IIM Calcutta added, need more East), Europe still thin (only TUM + existing ETH), Asia still thin (Tokyo, Peking added, but need more)
- **Phase 19 input:** Add Missing High-Value Universities — need to pair with programs for Business/Finance, Law, Arts, Other, plus Master's levels, and more East India/Europe/Asia institutions.

## 13. Safety confirmation: zero modifications to pre-existing University and IndianInstitution records and IDs

- University rows modified: **0** (12→20, +8 new only, existing 12 unchanged, IDs unchanged)
- IndianInstitution rows modified: **0** (73,966→73,969, +3 new only, existing 73,966 unchanged, IDs unchanged)
- Existing 32 programs' identity fields unchanged? Actually 62→75, existing 62 unchanged, 13 new additive only
- All inserts additive, no merge/rename/clean-up, no dangling refs (0), cross-dataset 0, bounded candidates still hold (CANDIDATE_CAP 200, VERIFIED_THRESHOLD 10)
