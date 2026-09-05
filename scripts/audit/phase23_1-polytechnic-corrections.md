# Phase 23.1 — Polytechnic / Diploma Corrections

**Date:** 2026-09-05

---

## 1. Corrections applied

### 1a. `src/lib/education-institutions/service.ts` — FIELD_RULES excludeIf guard
Added an `excludeIf: ["diploma"]` to the Technical (degree-family) rule. A degree name that contains the substring `diploma` is now **excluded** from the degree-granting `Technical` category, so:

- `Diploma in Mechanical Engineering` → `["Polytechnic"]` (previously `["Polytechnic","Technical"]`)
- `Diploma in Computer Engineering` → `["Polytechnic"]`
- `Diploma in Civil / Electrical / Electronics Engineering` → `["Polytechnic"]`
- `B.Tech Computer Science` → `["Technical"]` only (never Polytechnic)

This restores the honest, mission-compliant separation: **a diploma is a separate qualification, never presented as a B.E./B.Tech degree, and a degree is never presented as a diploma.**

### 1b. `tests/education-institution.test.mjs:18` — corrected wrong contract
The assertion `a.includes("Polytechnic")` for `B.TECH Computer Science` was withdrawn (a B.Tech is a degree). Replaced with:
- `assert.ok(a.includes("Technical"))`
- `assert.ok(!a.includes("Polytechnic"))`
- Two new tests asserting every Diploma-in-X-Engineering maps to `["Polytechnic"]` ONLY, and that diploma vs degree category sets are disjoint.

### 1c. `src/lib/roadmap/` — Class-10 dual-pathway support
- `types.ts`: added `diplomaIntent?: boolean` to `RoadmapInputs`.
- `service.ts`: added `diplomaIntentOverride?: boolean | null` to `RoadmapLoadInput`; derived `diplomaIntent` via `detectDiplomaIntent(profile)` when stage is `SCHOOL_CLASS10` (no new DB columns, no migration).
- `education-stage.ts`: new pure `detectDiplomaIntent()` (matches `/diploma|polytechnic|iit in .../` style hints from studyLevel/highestEducation/exams/preferredCareer). It never touches the frozen career engine.
- `rules.ts` `SCHOOL_CLASS10` branch now:
  - Always emits a neutral **"Choose your post–Class 10 pathway"** step presenting the academic (Class 11–12 → degree) and technical (Diploma/Polytechnic) routes as equally valid.
  - When `diplomaIntent`: emits the diploma sequence (Explore → Compare branches → Verify eligibility → Select institution/programme → Complete diploma) + India lateral-entry step ("subject to the applicable state and institution rules", "not automatic") OR an abroad "check whether your diploma is accepted" step, plus an academic-alternative step.
  - When NOT `diplomaIntent`: keeps the Class 11–12 academic route unchanged.

### 1d. `scripts/seed-education-orphans.mjs` — skip-logic fix
`if (have > 0) continue;` was replaced: careers already degree-mapped by the main seed still receive missing **SUBJECT_LINK** rows, while new DEGREE_PATHWAY creation is skipped for them (no duplication of the authoritative mapping).

### 1e. UI labeling
- `career-detail-client.tsx`: polytechnic institutions now render `institutionQualificationLabel(...)` = **"Diploma / Polytechnic — a diploma-level institution, not a B.E./B.Tech degree institution"** (only when the institution type contains "Polytechnic").
- `indian-colleges-client.tsx`: institution type cell prefers the human "Diploma / Polytechnic" label.
- Counselor 360: `student360.ts` now injects `postClass10Pathways` (both tracks) for Class-10 students, rendered in `student-360-client.tsx` with a neutral guidance note.

### 1f. New regression suite — `tests/polytechnic-diploma.test.mjs`
Covers mission items 1–2 (diploma never = B.Tech; degree never = Polytechnic), the Class-10 two-pathway roadmap, lateral-entry conditionality, abroad diploma acceptance, golden cases A–F, and catalog integrity (F: 0 Program rows at polytechnic institutions; E: no regulated diploma→medicine/law links).

---

## 2. Impure correspondence to mission requirements

| Mission § | Compliance |
|-----------|-----------|
| Diploma ≠ B.E./B.Tech | ✅ FIELD_RULES excludeIf + UI label + tests |
| Degree ≠ presented as diploma | ✅ B.Tech/B.E. map to Technical only |
| Class-10 academic vs technical as distinct neutral pathways | ✅ dual-pathway roadmap step + 360 counselor view |
| Lateral entry conditional | ✅ "subject to the applicable state and institution rules" / "not automatic" |
| Abroad diploma acceptance check | ✅ dedicated step |
| Medicine/Law no false diploma pathways | ✅ verified 0 in data (golden case E) |
| No fabrication of duration/eligibility | ✅ no new rows; conservative wording |

---

## 3. Pre-existing consecutive test contract corrected
`tests/education-pathways.test.mjs` was tightened to use the real Subject catalog (never fabricates) — resolving the pre-existing false-positive that blocked the suite.
