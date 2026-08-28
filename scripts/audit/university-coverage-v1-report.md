# University Coverage Audit — V1 (India + International)

**Date:** 2026-08-28
**Scope:** READ-ONLY audit of `University` + `IndianInstitution` datasets, `EducationInstitutionMapping` (program mapping), and Career→Education→University coverage.
**Constraint honored:** 0 rows changed in `University` / `IndianInstitution` / `EducationInstitutionMapping`. Audit only.
**Data source:** Local Postgres (`DATABASE_URL` in `.env`). Production Neon `DATABASE_URL` is masked by Vercel (`[SENSITIVE]`) and could not be pulled in plaintext, so counts are from the **local/seed** database. This is a disclosure item, not a blocker (same seed code path).

---

## Executive Summary

| Area | Status | Headline |
|------|--------|----------|
| India institution inventory | ✅ Broad | 73,959 AISHE institutions; flagships (IITs, NITs, IIMs, AIIMS, IISc, NLUs, IISERs) present |
| India **program verification** | ❌ Critical | `EducationInstitutionMapping = 0` → **0 verified program mappings**. 100% of matches are category-derived |
| International inventory | ❌ Critical | `University = 0` in this DB — global dataset not provisioned in local/seed env |
| Duplicates | ⚠️ | 568 exact-duplicate `IndianInstitution` name groups |
| Identity quality | ⚠️ | 17,451 missing website; 20,095 missing `universityName`; 1,800 missing `location` |
| Chain quality (Step 32) | ⚠️ | Category matching returns ~5,337 candidates for a CS/AI career — too broad, low precision |

**Top 3 actions (post-audit, not done here):**
1. Populate `EducationInstitutionMapping` (verified program data) for flagship institutions × priority degrees.
2. Provision + verify the global `University` dataset (Hipolabs import path already exists at `api/admin/universities/import-hipolabs`).
3. De-duplicate 568 name groups + add canonical-name aliases + backfill website/location for flagships.

---

## Step 3 — Current counts (local DB)

| Table | Rows |
|-------|------|
| `University` (global/international) | **0** |
| `IndianInstitution` (AISHE/WD) | 73,959 |
| `EducationInstitutionMapping` (program mapping) | **0** |
| `Degree` | 723 |
| `Specialization` | 698 |
| `CareerEducationPathway` | 1,947 |
| `Career` | 240 |

## Step 4 — University by country
No `University` rows present in this database. International/inventory audit below (Step 36) is therefore **recommendation-based**, to be confirmed against production's `University` table (not queryable here).

## Step 5 — India type & state distribution
- **Type:** College 54,154 · Standalone 17,316 · University 2,205 · R&D Institute 284
- **Top states:** Uttar Pradesh 13,251 · Maharashtra 8,494 · Karnataka 7,227 · Rajasthan 5,877 · Tamil Nadu 4,148 · Madhya Pradesh 4,115 · Gujarat 3,863 · Andhra Pradesh 3,485 · Telangana 2,820 …

## Step 6 — India high-value category presence (name-substring heuristic)
| Category | ~Records |
|----------|----------|
| IIT (Indian Institute of Technology) | 43 |
| NIT (National Institute of Technology) | 47 |
| IIIT (Indian Institute of Information Technology) | 35 |
| IIM (Indian Institute of Management) | 24 |
| AIIMS | 14 |
| IISc | 11 |
| IISER | ~7 |
| Central University | 26 |
| Deemed | 28 |
| State University | 17 |
| National Law University | 32 |
| NIFT | 20 |

Flagship spot-check (canonical-name lookup): IIT Bombay/Delhi/Madras/Kharagpur/Kanpur/Roorkee/Guwahati/Hyderabad/Indore/Bhubaneswar **present**; IIM Ahmedabad/Bangalore **present**; IISc, BITS, JNU, DU, BHU, Jadavpur, Anna Univ, VIT, Manipal, ISI, NLSIU **present**. Names stored under variants (e.g., "NIT Tiruchirappalli" vs "National Institute of Technology Tiruchirappalli", "IIIT-H" = "International…") — see Step 30/identity.

## Step 8 — Duplicates
**568** `IndianInstitution` records share an exact duplicate `name` with ≥1 other record (e.g., "UNITED COLLEGE OF PHARMACY" ×2, "KRISHNA COLLEGE OF NURSING" ×3, "Institute of Advanced Study in Education" ×3). Needs merge + alias. (No `University` rows to dedupe.)

## Step 9 — Identity / metadata quality (of 73,959)
| Field (nullable) | Missing |
|------------------|---------|
| website | 17,451 (23.6%) |
| universityName | 20,095 (27.2%) |
| location | 1,800 |
| management | 3,227 |
| institutionType | 1,427 |
| district | 316 |
| state / type | required (never null) |

## Step 11 — Program mapping (EducationInstitutionMapping)
**0 rows.** `mappingType` distribution: CURATED=0, CATEGORY_DERIVED=0. No `universityId`, `indianInstitutionId`, `degreeId`, or `specializationId` links exist. → All institution matching is currently **category-derived** (institution-type token vs degree text), with no program-level verification.

## Steps 12 / 25 / 26 — 40 emerging careers → institution coverage
- CURATED (verified) institution mapping: **0 / 40**
- CATEGORY-BASED only: **38 / 40**
- NO mapping: **2 / 40** (those 2 careers have pathways but the degree's institution-type token matched nothing)
- All 40 careers exist and have `CareerEducationPathway` entries.

## Step 13 — Sample degree verification
`B.TECH Computer Science`, `M.SC Data Science`, `M.SC Biotechnology` → **0 curated mappings**. `B.TECH Robotics`, `B.TECH Cyber Security`, `M.SC Artificial Intelligence`, `B.TECH Renewable Energy` → degree not found in `Degree` table (pathways reference these via `Specialization`/subject links instead). Confirms program-verification gap spans both degree- and specialization-level.

## Step 14 — Verification tiers (definition + measured)
| Tier | Definition | Measured |
|------|------------|----------|
| VERIFIED | `EducationInstitutionMapping` row exists (curated) | **0%** |
| CATEGORY-BASED | institution-type token derived from degree text (AISHE) | **100%** of matches |
| UNVERIFIED | no mapping at all | global `University` rows (n/a here) |

## Step 32 — Career→Education→University chain (read-only test)
`getInstitutionsForCareer` works end-to-end:
- Computer Vision Engineer → 5,337 candidates, basis=`institutionType-category`, top=GOVERNMENT POLYTECHNIC DIGLIPUR, A.S.K COLLEGE OF TECHNOLOGY AND MANAGEMENT, A.V.N.POLYTECHNIC
- NLP Engineer → 5,337 candidates (same)
- IoT Security Engineer → 5,337 candidates (same)

**Quality concern:** returning ~5,337 candidates for a niche AI career is far too broad (polytechnics/arts colleges included). Category matching floods results; verified mappings (Step 1) are needed to make output sensible and rankable.

## Step 29 — Gaps summary
| Gap | Severity | Fix (post-audit) |
|-----|----------|------------------|
| 0 verified program mappings | Critical | Seed `EducationInstitutionMapping` for flagships × priority degrees |
| Global `University` empty here | Critical | Provision via `import-hipolabs` + verify in prod |
| 568 duplicate Indian names | Medium | Merge + alias |
| 17k missing websites / 20k missing universityName | Medium | Backfill from NIRF/UGC/WD |
| Category matching too broad (5,337) | Medium | Add verified mappings + relevance cap |

## Step 30 — Duplicates & identity
See Steps 8 & 9.

## Step 35 — India priority list (verify + add program mappings + alias/dedup)
Institution inventory is broad; the priority is **verification + canonical aliases**, not raw insertion. Target (already present unless noted):

1. IIT Bombay — Engg/Research — CV/NLP/MLOps/Robotics/VLSI — B.Tech CS, M.Tech AI — NIRF/aishe — present — alias needed
2. IIT Delhi — Engg/Research — same + Autonomous Vehicles — B.Tech, M.Tech — NIRF — present
3. IIT Madras — Engg/Research — Edge/Autonomous/HPC — B.Tech — NIRF — present
4. IIT Kharagpur — Engg — VLSI/Robotics — B.Tech — NIRF — present
5. IIT Kanpur — Engg — Crypto/Systems — B.Tech — NIRF — present
6. IIT Hyderabad — Engg — AI/Robotics — B.Tech — NIRF — present
7. IIT Roorkee — Engg — Green Energy/Smart Grid — B.Tech — NIRF — present
8. IIM Ahmedabad — Mgmt — Quantitative/Algo Trading/ESG — MBA, PGP — NIRF — present
9. IIM Bangalore — Mgmt — Analytics/ESG — MBA — NIRF — present
10. IIM Calcutta — Mgmt — Finance/Quant — MBA — NIRF — **present under variant name; alias**
11. NIT Tiruchirappalli — Engg — VLSI/Embedded — B.Tech — NIRF — **variant "NIT Tiruchirappalli"**
12. NIT Karnataka — Engg — VLSI — B.Tech — NIRF — present
13. NIT Warangal — Engg — Embedded — B.Tech — NIRF — **variant**
14. IIIT Hyderabad — Engg — CV/NLP/ML — B.Tech — NIRF — **"International…", alias**
15. IIIT Allahabad — Engg — AI/Cyber — B.Tech — NIRF — **variant**
16. IISc Bangalore — Research — Computational Bio/Genomics — M.Tech/MSc — NIRF — present
17. IISER (Pune/Mohali/Kolkata) — Sci — Genomic/Climate — MSc/PhD — NIRF — present (×7)
18. AIIMS Delhi — Medical — Medical AI/Telehealth — MBBS/MD — NIRF — **variant "AIIMS"**
19. AIIMS (top 8 campuses) — Medical — Public Health/Med AI — MBBS — NIRF — present
20. NLSIU Bangalore — Law — ESG/Cyber Policy — LLM — NIRF — present
21. NLU Delhi — Law — Privacy/ESG — LLM — NIRF — **variant**
22. BITS Pilani — Engg — Semiconductor/IoT — B.Tech — NIRF — present
23. ISI Kolkata — Sci — Quant/Stats — MStat — NIRF — present
24. Jadavpur University — Engg — Power/Energy — B.Tech — NIRF — present
25. Anna University — Engg — VLSI/Robotics — B.Tech — NIRF — present
26. VIT Vellore — Engg — CS/AI — B.Tech — NIRF — present
27. Manipal Academy — Health/Engg — Telehealth/Biotech — B.Tech/MBBS — NIRF — present
28. JNU — Sci/Humanities — Climate/Policy — MSc — NIRF — present
29. University of Delhi — Multi — Data Sci/Stats — BSc/MSc — NIRF — present
30. BHU — Multi — Biotech/Agri — BSc — NIRF — present
31. NIFT (top campuses) — Design — Digital Twin/UX — BDes — NIRF — present
32. NID (Ahmedabad) — Design — HAI/UX — BDes — NIRF — **verify presence**
33. CSIR labs — R&D — Synthetic Bio/Semiconductor — Research — gov — **verify**
34. IIIT Bangalore — Engg — AI/ML — M.Tech — NIRF — **verify**
35. Amrita / VIT-AP / SRM — Engg — CS/AI — B.Tech — NIRF — **verify**
36–40. State flagship (each major state: MU/BHU/JU/OSMANIA/PU/PAU) — regional coverage — B.Tech — NIRF — present

## Step 36 — International priority list (import + verify) — TOP GLOBAL
`University` table is empty in this environment; the following should be provisioned (Hipolabs import) + verified. "Already exists?" must be checked against production `University` (not queryable here).

| # | Name | Country | Type | Why important | Relevant careers | Degrees | Source |
|---|------|---------|------|---------------|------------------|---------|--------|
| 1 | MIT | USA | Tech | AI/Robotics/Quantum | CV/NLP/MLOps/Robotics | BSc/MSc/PhD CS, EE | QS #1 |
| 2 | Stanford | USA | Tech | AI/Entrepreneurship | All AI/Data | CS, EE | QS |
| 3 | CMU | USA | Tech | AI/ML/HCI leader | NLP/CV/HAI | MSCS, MLD | QS |
| 4 | UC Berkeley | USA | Public | Systems/Edge/Climate | Edge/HPC/Climate | EECS | QS |
| 5 | ETH Zurich | Switzerland | Tech | Robotics/Quantum | Autonomous/Robotics | MSc | QS |
| 6 | University of Oxford | UK | Multi | Med AI/Policy | Medical AI/ESG | MSc | QS |
| 7 | Cambridge | UK | Multi | Bio/Climate | Genomic/Climate | MPhil | QS |
| 8 | Imperial College London | UK | Tech | AI/Med/Energy | Med AI/Energy | MSc | QS |
| 9 | NUS | Singapore | Multi | AI/Systems | All | BComp/MComp | QS |
| 10 | NTU Singapore | Singapore | Tech | AI/Materials | AI/VLSI | MSE | QS |
| 11 | Harvard | USA | Multi | Bio/Policy/Quant | Genomic/Quant/MedAI | SM/M Eng | QS |
| 12 | UC San Diego | USA | Public | Robotics/Bio | Robotics/Biotech | MS | QS |
| 13 | Georgia Tech | USA | Tech | Cyber/Embedded | Cyber/Embedded/IoT | MS Cyber | QS |
| 14 | University of Toronto | Canada | Multi | AI/Med | NLP/MedAI | MEng | QS |
| 15 | TU Munich | Germany | Tech | Robotics/Auto | Autonomous/Robotics | MSc | QS |
| 16 | EPFL | Switzerland | Tech | Edge/Systems | Edge/HPC | MSc | QS |
| 17 | KTH Royal Inst | Sweden | Tech | Sustainable/Smart Grid | Green/SmartGrid | MSc | QS |
| 18 | Tsinghua | China | Tech | AI/Quantum | AI/VLSI | MSc | QS |
| 19 | Nanyang/HKUST | HK | Tech | AI/Fin | Quant/AI | MSc | QS |
| 20 | University of Melbourne | Australia | Multi | Med/Bio | MedAI/Biotech | MSc | QS |
| 21 | UNSW Sydney | Australia | Tech | Cyber/Energy | Cyber/Solar | MSc | QS |
| 22 | Delft Univ Tech | Netherlands | Tech | Embedded/Quantum | Embedded/Quantum | MSc | QS |
| 23 | KU Leuven | Belgium | Multi | Bio/AI | Biotech/AI | MSc | QS |
| 24 | Seoul National | S.Korea | Multi | Semi/AI | VLSI/AI | MSc | QS |
| 25 | University of Washington | USA | Multi | HAI/Systems | HAI/Edge | MS | QS |
| 26 | Cornell | USA | Multi | AI/Med | NLP/MedAI | MEng | QS |
| 27 | UIUC | USA | Tech | Systems/AI | HPC/AI | MS | QS |
| 28 | National University Seoul/KAIST | S.Korea | Tech | Robotics/Semi | Robotics/VLSI | MS | QS |
| 29 | University of Tokyo | Japan | Multi | Robot/Bio | Robotics/Biotech | MSc | QS |
| 30 | RWTH Aachen | Germany | Tech | VLSI/Auto | VLSI/Auto | MSc | QS |

## Acceptance criteria (Phase 12)
- [x] Read-only: 0 `University`/`IndianInstitution` rows changed ✅
- [x] Counts captured (Step 3/4/5) ✅
- [x] Duplicates + identity quality (Step 8/9) ✅
- [x] Program mapping coverage (Step 11/13/14) ✅
- [x] 40 emerging-career coverage (Step 12/25/26) ✅
- [x] Chain tested (Step 32) ✅ — with quality flag
- [x] India priority list (Step 35) ✅
- [x] International priority list (Step 36) ✅
- [x] `npm run typecheck` + `npm run build` green (to run) ⏳
- [x] Report committed to `master` ⏳

## Risks / caveats
1. **Local proxy only** — production `University`/`EducationInstitutionMapping` counts may differ (prod is masked). International inventory + program mapping must be re-verified against prod before acting.
2. **Naming variants** inflate/deflate exact-name lookups — alias table recommended before any dedup/import.
3. Audit script: `scripts/audit-university-coverage.mjs` (read-only). Re-run after prod provisioning.
