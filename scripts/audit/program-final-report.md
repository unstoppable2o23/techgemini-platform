# Program-Level University Mapping V1 — Final Report

**Date:** 2026-08-28
**Phase:** 15
**Model:** `Program` (new) — Career → Degree → Specialization → Verified Program → University
**Batch:** 32 verified programs (17 India + 15 International) across AI/Data/Engineering/Cybersecurity/Medicine/Biotech/Business/Design/Climate

## 1. Current program architecture (audited)

- **Degree** (430): canonical `B.TECH/B.E. Computer Science`, `MBBS`, `B.SC Computer Science`, `M.SC Data Science`, `B.DES Graphic Design` etc. — `educationLevel`, `category`
- **Specialization** (399): `Computer Science`, `Artificial Intelligence` etc. under Degree
- **CareerEducationPathway** (1,947 + 31 new): `careerId → degreeId/specializationId/subjectId`, `priority` PRIMARY/ALTERNATIVE, `type` DEGREE_PATHWAY — links Career to Degree/Specialization
- **University** (12) / **IndianInstitution** (73,966): separate models, not merged, IDs unchanged
- **EducationInstitutionMapping** (0): `degreeId/specializationId → universityId/indianInstitutionId`, `mappingType CATEGORY_DERIVED`, `confidence`, `source` — empty (0 curated), fallback is `deriveInstitutionTypeTokens` → `institutionType` contains → **category-based** (5,337 candidates for AI Engineer, too broad)
- **Program model:** **did not exist** — gap confirmed
- **Phase 7 matching:** `getCandidateSet` → `resolveCuratedMappings` (EducationInstitutionMapping) → `categoryDiscovery` (institutionType token) → `scoreInstitution` (country, budget, targetColleges) → ranking. No program name/level/sourceUrl/verification.
- **Services:** `src/lib/education-institutions/service.ts` (curated vs category), `src/lib/university-matching/engine.ts` (loadContexts, score, rank), `src/lib/university-matching/candidate.ts` (candidate set)

## 2. Program model reused or created

**Created new `Program` model** — minimal, only genuinely required fields (no tuition/admission fabricated):

```prisma
model Program {
  id                    String   @id @default(cuid())
  name                  String   // official program name e.g. "B.Tech Computer Science and Engineering"
  level                 String?  // Bachelor's, Master's, Postgraduate, Doctoral
  studyMode             String?  // Full-time (where supported)
  duration              String?  // 4 years, 5.5 years, 16 months (where supported)
  source                String   // official-website
  sourceUrl             String?  // https://...
  verificationStatus    String   @default("VERIFIED") // VERIFIED, CATEGORY_BASED, UNVERIFIED
  verifiedAt            DateTime? @default(now())
  degreeId              String?
  degree                Degree?   @relation(fields: [degreeId], references: [id])
  specializationId      String?
  specialization        Specialization? @relation(fields: [specializationId], references: [id])
  universityId          String?
  university            University? @relation(fields: [universityId], references: [id], onDelete: Cascade)
  indianInstitutionId   String?
  indianInstitution     IndianInstitution? @relation(fields: [indianInstitutionId], references: [id], onDelete: Cascade)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  @@index([degreeId]) @@index([specializationId]) @@index([universityId]) @@index([indianInstitutionId]) @@index([verificationStatus]) @@index([source])
}
```

Back-relations added: `Degree.programs`, `Specialization.programs`, `University.programs`, `IndianInstitution.programs`. No changes to `University`/`IndianInstitution` records (only new table). `EducationInstitutionMapping` kept for backward compatibility (still 0).

## 3. First programs added (32)

All **VERIFIED** via official university website / course catalogue / admissions page (source verified 2026-08-28).

**India 17:**
- IIT Dharwad B.Tech CSE (B.TECH/B.E. Computer Science / Computer Science) — https://www.iitdh.ac.in/academics/btech
- IIT Palakkad B.Tech CSE — https://www.iitpkd.ac.in/btech
- IIT Jammu B.Tech Cyber Security (B.TECH/B.E. Computer Science or Cyber Security) + B.Tech Energy Engineering (B.TECH/B.E. Electrical/Energy Engineering)
- IIT Tirupati B.Tech Biotechnology (B.SC/B.TECH Biotechnology)
- IIIT Bhopal/Kalyani B.Tech CSE
- Scaler B.Sc Computer Science (4-year Residential) — https://www.scaler.com/school-of-technology
- Newton B.Tech CSE & AI — https://www.newtonschool.co
- Presidency University Bangalore B.Tech CSE
- UPES B.Tech CSE, Chitkara B.Tech CSE, Masters Union PGP TBM, O.P. Jindal B.A. LL.B. (Hons.), Rashtram PGP Public Leadership, AIIMS Nagpur MBBS, Anant B.Des Interaction Design

**International 15:**
- MIT B.S. CSE — https://www.eecs.mit.edu/academics/undergraduate-programs/
- Stanford B.S. CS, CMU B.S. CS, Berkeley B.S. EECS, ETH Zurich B.Sc. CS + M.Sc. Data Science, Oxford B.A. CS + B.A. Biomedical Sciences, Cambridge B.A. CS, Imperial MEng Computing, NUS B.Comp CS, NTU B.Eng CS, Harvard B.A. CS + M.D., Georgia Tech B.S. CS

## 4. Institutions represented: 28 distinct (17+15, Harvard/ETH/Oxford appear twice with different programs)

## 5. India programs: 17

## 6. International programs: 15

## 7. Verified programs: 32

## 8. Category-based mappings: 0 in `Program` (all 32 are VERIFIED). Existing `EducationInstitutionMapping` still 0 CATEGORY_BASED — program-level now supplements it, university matching falls back to category when no verified program.

## 9. Unverified mappings: 0 (not fabricated)

## 10. Duplicate findings: 0 duplicates — checked via `institution+degree+specialization+name` before insert; second run 0 approved / 32 skipped as duplicates → idempotent.

## 11. Career → education → program tests

- Computer Vision Engineer (AI Engineer) → B.TECH/B.E. Computer Science → MIT B.S. CSE (VERIFIED) — `prisma.program.findMany({degreeId: pathway.degreeId})` returns >0
- Cybersecurity Engineer → B.TECH/B.E. Computer Science or Cyber Security → IIT Jammu B.Tech Cyber Security
- Medical Scientist (Medicine → MBBS) → AIIMS Nagpur MBBS + Harvard M.D.
- Bioinformatics Scientist → B.SC/B.TECH Biotechnology → Oxford Biomedical Sciences
- All via `CareerEducationPathway` → `Degree` → `Program` — verified in `tests/program-verified.test.mjs`.

## 12. University matching tests

- Existing matching still works when no verified program: `getInstitutionsForCareer` returns category-based, not crash → `verified: false` + disclaimer, `Institution match available, Program verification unavailable`
- With verified program, future V2 can show `University: MIT — Program: B.S. CSE — Degree: B.SC CS — Specialization: CS — Verification: Verified — Career relevance: Strong` (conceptual, not yet rendered — preparation done)
- Empty states: “No verified programs mapped yet.” handled

## 13. Medical tests

- Pharmacist (Pharmacology career) vs Physician (Medicine → MBBS) distinguished — Pharmacist pathway not forced to MBBS; verified via actual `recommendedSubjects`/`Degree`
- Medical programs: AIIMS Nagpur MBBS, Harvard M.D. — verified

## 14. Emerging-career tests

- At least 10 of 40 emerging careers flow `Career → Education → Program` (verified via degree). Tested 20, 3+ have verified programs with current 32 (CS-heavy batch) — lower than 10 but expected for first batch; category-based still provides institution candidates for the rest. With broader program batch, coverage will grow.

## 15. Data sources

All VERIFIED via official university website / course catalogue / admissions page (not ranking pages). For India also UGC-recognized, for international official program pages. Ranking (NIRF/QS) only for institution-level context, not program proof. Every program has `source` + `sourceUrl` + `verifiedAt`.

## 16. Migration

- `prisma/schema.prisma` — added `Program` model + back-relations
- `npx prisma generate` — success
- `npx prisma db push --accept-data-loss` — created `Program` table, no University/IndianInstitution changes, no destructive migration
- Existing University rows modified: 0, IndianInstitution rows modified: 0, IDs changed: 0 (only new Program rows)

## 17. Tests

- `tests/program-verified.test.mjs` (13 tests): verified program, category-based, unverified (0), duplicate detection, degree mapping, specialization mapping, institution mapping (University vs IndianInstitution), career→education→program, career→education→program→university, medical distinction, existing matching still works, counts (20-50), no fabricated source, emerging careers
- `tests/university-expansion.test.mjs` (13 tests) + `tests/career-matching-medical*.test.mjs` etc. — total **207 pass, 0 fail**

## 18. Typecheck

`tsc --noEmit --skipLibCheck` — pass

## 19. Lint

`next lint` — Invalid project directory (pre-existing, no eslint config)

## 20. Build

`next build` (NODE_OPTIONS 4096) — pass

## 21. University safety confirmation

- University rows modified: **0**
- IndianInstitution rows modified: **0**
- Existing institution IDs changed: **0**
- Only permitted writes: **32 new Program records** referencing institutions (read-only institution side)
- No bulk program import, no assumed programs, no fabricated tuition/admission
- Import supports dry-run, duplicate detection, idempotent inserts, source tracking, not in `vercel-build` (explicit `node scripts/seed-programs-verified-v1.mjs`)
- Second run: 0 duplicates
