# Phase 23.1 — Polytechnic / Diploma Baseline Audit

**Date:** 2026-09-05  
**Pre-state snapshot (before corrections)**

---

## 1. Database counts (snapshot)

| Entity | Count | Notes |
|--------|-------|-------|
| University | 20 | Unchanged (not touched) |
| IndianInstitution | 73969 | Unchanged |
| Career | 289 | All active, unchanged |
| Degree | 751 | Unchanged (classification correction at token level, not row deletion) |
| CareerEducationPathway | 2111 | Unchanged (no new rows added) |
| Program | 75 | Unchanged |
| Polytechnic-type institutions (institutionType contains "Polytechnic") | 5337 | ALL share the single type value `Technical/Polytechnic` |
| Program rows at polytechnic institutions | **0** | No degree programs displayed at polytechnic institutions |
| Diploma-degree rows (name contains "Diploma") | 9 | All are PGDIPLOMA (postgraduate diplomas); NO technical Diploma-in-Engineering rows exist |
| Medicine / Law diploma pathways | **0** | Golden case E satisfied by pre-existing data |

---

## 2. Code-state snapshot (before corrections)

| File | Defect found |
|------|-------------|
| `src/lib/education-institutions/service.ts` — FIELD_RULES | Technical rule (tokens: `engineering, tech, b.tech, m.tech, be, b.e., civil, mechanical, electrical, electronics, computer`) had **no excludeIf guard**: a degree name like "Diploma in Mechanical Engineering" matched BOTH `diploma → Polytechnic` AND `engineering → Technical`, conflating the two tracks. |
| `src/lib/education-institutions/service.ts` — deriveInstitutionTypeTokens | Token `"tech"` substring matched `b.tech` as "tech" within "b.tech" (substring), causing B.Tech to also match the "tech" token of the Technical rule. This was correct per intent but interacted with the missing excludeIf to produce incorrect Polytechnic mapping for diplomas. |
| `tests/education-institution.test.mjs:18` | Assertion `a.includes("Polytechnic")` for `deriveInstitutionTypeTokens("B.TECH Computer Science")` was **wrong**: B.Tech is a degree, not a diploma; must NOT include "Polytechnic". |
| `src/lib/roadmap/rules.ts` — SCHOOL_CLASS10 branch | No post–Class 10 pathway-choice step; no diploma branch existed. All Class-10 roadmaps assumed the academic route (Class 11–12 → degree) only. |
| `src/lib/roadmap/types.ts` — RoadmapInputs | No `diplomaIntent` flag; no way to select the diploma pathway. |
| `src/lib/roadmap/service.ts` — RoadmapLoadInput | No `diplomaIntentOverride`. |
| `scripts/seed-education-orphans.mjs:41-42` | `if (have > 0) continue;` skipped subject-link creation for careers already mapped by the main seed (had DEGREE_PATHWAY but no SUBJECT_LINK). |
| UI: career-detail-client.tsx | No "Diploma / Polytechnic" label for polytechnic institutions; institutionType shown raw as "Technical/Polytechnic". |
| UI: indian-colleges-client.tsx | No humanized label for polytechnic institution type. |
| Counselor 360 (student-360-client.tsx / student360.ts) | No Class-10 post–Class-10 pathway distinction shown in education tab. |

---

## 3. Key data limitation documented

**All 5337 polytechnic-type institutions share the single AISHE type value `Technical/Polytechnic`** (containing both "Technical" and "Polytechnic" substrings). This means:

- Per-institution "diploma only" vs "degree-granting" separation is **not possible at query level** from the current dataset.
- The response handles this via neutral disclaimer + roadmap contracts + no Program rows at polytechnic institutions.

---

## 4. Affected counts

- Incorrect diploma→Technical mappings at token level: **5 token-exclusion corrections** (diploma degree names previously produced `["Polytechnic","Technical"]` → corrected to `["Polytechnic"]` only).
- No rows deleted; no DB mutations required.
- University count: 20 (unchanged).  
- IndianInstitution count: 73969 (unchanged).  
- Program count: 75 (unchanged).  
- Career count: 289 (unchanged).
