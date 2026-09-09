# Phase 28 — Program & University Intelligence baseline (Part 24 probe)

Generated live at audit time.

## AcademicProgram
- total=242 active=242
- level distincts:
  - Bachelor's: 140
  - Master's: 87
  - Professional Degree: 7
  - Diploma: 6
  - Certificate: 2
- category distincts (17):
  - Engineering: 32
  - Healthcare: 30
  - Business: 22
  - Technology: 20
  - Humanities: 18
  - Social Sciences: 17
  - Design: 17
  - Media: 15
  - Life Sciences: 14
  - Agriculture: 11
  - Quantitative: 8
  - Hospitality: 8
  - Education: 7
  - Environment: 7
  - Law: 6
  - Architecture: 6
  - Sports: 4

## Program (institution-level)
- total=80
  - verificationStatus VERIFIED: 80
- studyMode distincts:
  - Full-time: 80
- level distincts:
  - Master's: 8
  - Bachelor's: 69
  - Doctoral: 2
  - Postgraduate: 1
- with degreeId=80
- with specializationId=30
- linked to university=33
- linked to indianInstitution=47
- source distincts:
  - official-website: 80

## CareerProgramMapping
- total=856
  - PRIMARY: 298
  - OPTIONAL: 30
  - COMMON: 484
  - RELEVANT: 25
  - SPECIALIZED: 19
- careers with mappings=289
- programs/career min=1 max=4 median=3
- programs mapped to 2+ careers=160 (696 mapped to exactly 1)
- candidate generic mappings (program linked to >=5 careers):
  - Computer Science (Bachelor's) -> 51 careers
  - Mechanical Engineering (Bachelor's) -> 25 careers
  - Business Administration (MBA) (Master's) -> 24 careers
  - Environmental Science (Bachelor's) -> 17 careers
  - Finance (Bachelor's) -> 15 careers
  - Mass Communication (Bachelor's) -> 14 careers
  - Law (LLB) (Professional Degree) -> 13 careers
  - Statistics (Bachelor's) -> 12 careers
  - Information Technology (Bachelor's) -> 12 careers
  - Electrical Engineering (Bachelor's) -> 12 careers
  - Marketing (Bachelor's) -> 12 careers
  - Business Administration (BBA) (Bachelor's) -> 11 careers
  - Data Science (Bachelor's) -> 11 careers
  - Electronics and Communication Engineering (Bachelor's) -> 11 careers
  - Psychology (Bachelor's) -> 10 careers
  - Education (B.Ed) (Bachelor's) -> 10 careers
  - Mathematics (Bachelor's) -> 10 careers
  - Political Science (Bachelor's) -> 9 careers
  - Commerce (B.Com) (Bachelor's) -> 9 careers
  - Cyber Security (Bachelor's) -> 9 careers

## Medical program safety
- careers matching medicine-ish names=10
- MBBS-named programs=1
  - Medicine (MBBS): mapped to 2 careers
- BDS/Dental-named programs=1
  - mapped to 1 careers
- Pharmacy-named programs=2
- Nursing-named programs=2

## Diploma vs degree separation
- diploma/polytechnic programs=0
- BE/BTech programs=0
- careers that map BOTH diploma and BE/BTech programs=0

## Degree / Specialization
- Degree rows=751 Specialization rows=726
- degree sample:
  - (BBA/B.TECH common)
  - (PHYSICS/MATHS)
  - )
  - ; BBA/B.Tech
  - 12TH pass
  - 12TH pass/Any degree
  - 12TH pass/Any degree + airline cabin crew training certification
  - ACET entry, then IFoA/IAI papers
  - ACET entry, then IFoA/IAI papers (multiple years
  - AFCAT after graduation
  - AFCAT/CDS after graduation
  - AGRI exposure
  - AGRI exposure (both routes
  - AIRLINE cabin crew training certification
  - AIRPORT operations certification
  - ALS certification
  - AME licence
  - ANALYTICS ability matters more
  - ANALYTICS certification
  - ANCHORING training
  - ANIMATION diploma
  - ANY degree
  - ANY degree  + ATC training via AAI
  - ANY degree + animation diploma + showreel
  - ANY degree + audio engineering diploma/certification
  - ANY degree + aviation/airport operations certification
  - ANY degree + bank exams  or direct campus hiring
  - ANY degree + career counselling certification
  - ANY degree + CAT/XAT for MBA
  - ANY degree + CFP certification
  - ANY degree + design portfolio
  - ANY degree + digital marketing certification
  - ANY degree + ERP certification
  - ANY degree + event management diploma/certification
  - ANY degree + fitness certification
  - ANY degree + game portfolio
  - ANY degree + ICF/EMCC coaching certification
  - ANY degree + image consulting certification
  - ANY degree + instructional design certification
  - ANY degree + insurance certifications
  - ANY degree + logistics certification
  - ANY degree + MA Journalism
  - ANY degree + Master's in Public Policy
  - ANY degree + MBA
  - ANY degree + MBA Communication/PR preferred
  - ANY degree + MBA Finance from a top school
  - ANY degree + MBA from a top school
  - ANY degree + MBA Marketing/Research preferred
  - ANY degree + performance marketing certifications
  - ANY degree + PG Diploma in HR
  - ANY degree + PG Diploma/MBA in Disaster Management
  - ANY degree + photography diploma/portfolio
  - ANY degree + PMP/PRINCE2/CSM certification
  - ANY degree + police services exam
  - ANY degree + portfolio of social work
  - ANY degree + PR/Mass Communication preferred
  - ANY degree + professional academy training
  - ANY degree + retail experience
  - ANY degree + safety diplomas
  - ANY degree + SCM certification

## University
- University rows=20
- with linked programs=18

## IndianInstitution
- rows=73969
- type distincts (4):
  - College: 54154
  - Standalone: 17321
  - University: 2210
  - R&D Institute: 284
- institutionType distincts (64):
  - Affiliated College: 49435
  - Technical/Polytechnic: 5337
  - Nursing (Diploma) Institute: 4821
  - Teacher Training (Diploma) Institute: 3913
  - Constituent / University College: 2538
  - Paramedical Institute: 1750
  - Wikidata: 1516
  - (null): 1427
  - Recognized Center: 1067
  - Autonomous College: 577
  - PGDM Institute: 351
  - Pharmacy Institution: 272
  - PG Center / Off-Campus Center: 246
  - Standalone Institution Under Ministry: 152
  - Ayurvedic Nursing (Diploma) Institution: 142
  - Hotel Management and Catering Institute: 94
  - Ministry of Agriculture and Farmers Welfare: 44
  - D/o Agricultural Research and Education, M/o Agriculture & Farmers Welfare: 40
  - Institution under Rehabilitation Council of India: 35
  - Ministry of Science & Technology: 31
- states distinct=37
- with website=56518
- with district=73653
- with linked programs=43

## CareerEducationPathway
- total=2111
  - type SUBJECT_LINK: 820
  - type DEGREE_PATHWAY: 1291
- with degree=1291
- with specialization=1038
- with subject=820

---

# Phase 28 — Program & University Intelligence V2 (Part 27 report)

Implemented on top of the Part 24 baseline above. Read-only over the protected catalogs
(AcademicProgram 242, Program 80, University 20, IndianInstitution 73,969 — all counts
verified unchanged in the Phase 28 suite, test 20).

## Kernel (`src/lib/program-intelligence/`)
- **normalize.ts** — `normalizeQualification` maps Diploma / Certificate / Bachelor's /
  Professional Degree / Master's / Postgraduate / Doctoral to canonical kinds WITHOUT
  collapsing them into one "degree"; `disciplineOf` derives a stable discipline id from
  the stored category; `educationStageFitOf` keeps the diploma-vs-degree guardrail;
  `nextStepOf` is qualification-aware (never invents deadlines/cutoffs/exams).
- **admissions.ts** — source-of-truth rule: medical programs reuse the already-verified
  Medical education registry (entrance + sources + lastReviewed, ISO 2026-09-08); the
  token→slug mapping now resolves by registry discipline id as a fallback, so pharmacy /
  nursing / physiotherapy admissions reach the registry instead of silently returning null.
  Non-medical programs get conservative "varies by institution" types (JEE/CLAT noted only
  as participation routes, never as guaranteed), and unknown routes return `null`.
- **availability.ts** — `getProgramAvailability` / `availabilityNote`: state is
  VERIFIED only when institution-offered Program rows are source-VERIFIED, else PARTIAL /
  NOT_VERIFIED ("claims withheld rather than invented"); freshness computed at read time
  from `verifiedAt`; `coversAcademicProgram` is a conservative token-core overlap.
- **search.ts** — two separate catalogs: `items` (career catalog) + `institutionOffers`
  (institution-level verified rows); facets are data-driven (zero-count facets omitted);
  saved flags from the STUDENT's PROGRAM shortlist.
- **compare.ts** — up to 3 programs, fixed documented row order, descriptive only
  ("never a ranking"); availability counts only VERIFIED institution rows.
- **search-session.ts** — `getShortlistProgramIds` for route-level saved flags.

## Data / API
- Shortlist: new `PROGRAM` item type (+ cap 20) with batched catalog enrichment in
  `/api/student/shortlist`, and a `program_shortlisted` product event (analytics allowlist).
- Roadmap: `StudentRoadmap.goalProgramId/goalProgramName` (additive nullable columns);
  `setGoalProgram` / `clearGoalProgram` never rewrite steps, career or destination.
- APIs: `GET /api/programs/search`, `POST /api/student/program-compare`, `POST/DELETE
  /api/student/roadmap/program`; career detail `GET /api/careers/[careerId]/programs`
  returns normalized fields + saved + sharedWithCareers; university profile + student
  compare surface the availability block.

## UI
- `/student/programs` explorer (search + data-driven facets + inline compare + save +
  set-as-my-program + institution offers); Recommended Programs on career detail;
  "Recognized program" chip on the roadmap; Universities/Programs tabs on shortlist;
  availability note card on university profiles; Program Explorer dashboard card;
  counselor 360 `shortlistedPrograms`.

## Verification
- `tests/phase28-program-intelligence.test.mjs` — 21 tests: normalization distinctness,
  registry-backed admissions (NEET-UG for MBBS/BDS only), availability honesty,
  search/facets/saved, compare row contract, additive roadmap goal program, PROGRAM
  shortlist + analytics, protected counts (20/73969/242/80/0-UNVERIFIED), frozen-engine
  determinism. Full suite: 717/717 passing; `tsc --noEmit` clean; Next build clean;
  Phase 16b golden harness unchanged.
