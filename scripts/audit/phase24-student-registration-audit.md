# Phase 24 — Student Registration Form V2 & Career Matching Data Integrity

Phase: 24 of the platform evolution. Shipped before it: Phase 23.3 (`33801f5`, 611/611 tests, engine frozen).

## Goal

Make the registration and career-preferences onboarding paths (a) server-authoritative on
validation, (b) store canonical, well-typed profile values, and (c) never perturb the frozen
Career Matching Engine, its assessment banks, or the protected `University` /
`IndianInstitution` datasets. Matching behavior for pre-Phase-24 accounts must be byte-identical.

## What changed

### New shared modules (`src/lib/onboarding/`)
- `vocabulary.ts` — single source of truth for canonical stages
  (`CANONICAL_STAGES`, now including `Diploma (Polytechnic)` and `Working Professional`, plus
  `Year X Undergraduate` / `Year X Postgraduate` / `Doctoral` / `Other`), canonical
  highest-education list, alias maps (stages + subjects), program/branch/role option lists,
  `PROGRAM_YEAR_OPTIONS`, and `gradeValueToPercent` (cgpa ×10, gpa ×25, percentage as-is).
- `normalize.ts` — `normalizeStage` / `isCanonicalStage` / `normalizeSubjectName` /
  `normalizeSubjectList` / `normalizeAverageGrade`, re-exports `classifyStudyLevel`.
- `validation.ts` — zod schemas `registerSchema`, `careerPrefsShapeSchema` (`.passthrough()` so
  unknown keys like the draft `mode` survive) and the two app-facing helpers.

### Database (additive only)
- `prisma/schema.prisma`: `StudentProfile` gained `currentProgram String?` and
  `currentProgramYear String?`. Applied with `prisma db push` (no data loss). These two fields
  are presentation/metadata only — the career engine never consumes them (verified below).

### Server
- `src/app/api/auth/register/route.ts` — hand-rolled checks replaced by `validateRegisterPayload`
  (format, email, password ≥8, DOB not in the future, mobile shape, honeypot). Stage tokens are
  normalized on entry (`10th`→`Class 10`, `Polytechnic`→`Diploma (Polytechnic)`, …). `studyLevel`
  stays `null` unless explicitly sent, exactly matching legacy registrations — this keeps a school
  student's engine classification at `SCHOOL` (a mirrored `study_level` would have flipped it to
  `POST_SCHOOL`).
- `src/app/api/student/career-preferences/route.ts` — POST payload validated by
  `careerPrefsShapeSchema` before `saveCareerPreferences`; GET now exposes
  `currentProgram`/`currentProgramYear` for edit/draft resume.
- `src/app/auth/register/page.tsx` — canonical `STAGE_OPTIONS` (from `CANONICAL_STAGES`, no
  "Other" on registration), optional program/role input + current-year select.

### Career preferences (wizard + dashboard)
- `src/components/career-preferences/student-onboarding-flow.tsx` — canonical stage options from
  vocabulary; structured grade input (percentage / CGPA-10 / GPA-4) normalized server-side into a
  0–100 `averageGrade`; new "Program / branch / current role" + "Current year" fields
  (`ProgramContextFields` adapts to Diploma / Undergraduate / Postgraduate / Doctoral / Working /
  Other personas); "Save draft" button (draft mode) next to Back; Review step shows the new rows
  plus the Part 18 disclaimer ("Your answers help personalize career and education
  recommendations. They do not guarantee a particular career outcome.").
- `src/lib/student/profile.ts` — `saveCareerPreferences` now supports `mode: "draft" | "finalize"`
  (default `finalize`, so existing behavior/tests are unchanged). Finalize keeps every existing
  gate; draft skips the career/abroad/country gates, tolerates an incomplete English result, and
  does not set `careerPrefsFilled`. Incoming stages/subjects are normalized; aliases accepted and
  stored canonically; unknown text is preserved and still rejected where the canonical lists
  apply. `currentProgram`/`currentProgramYear` persist untouched.
- `src/components/career-preferences/career-prefs-constants.ts` — `STUDY_LEVEL_OPTIONS` is now
  `CANONICAL_STAGES` from the vocabulary module (options stay the same on screen).
- `src/app/(student)/career-preferences/page.tsx` — dashboard gate select + `initial` carry the
  new fields.

## Normalization rules

| Input | Canonical | Notes |
|---|---|---|
| `10th` / `SSC` / `standard 10` | `Class 10` | case-insensitive |
| `12th` / `HSC` / `+2` / `intermediate` | `Class 12` | |
| `polytechnic` / `diploma in engineering` | `Diploma (Polytechnic)` | new option; roadmap stays conservative `UNKNOWN` (same as legacy Polytechnic) |
| `working` / `working professional` | `Working Professional` | new option => roadmap `CAREER_SWITCHER` |
| `Ph.D` / `doctorate` | `Doctoral` | |
| `Maths` / `math` | `Mathematics` | subject aliases |
| `CS` | `Computer Science` | |
| CGPA `8.5` | `averageGrade: 85` | ×10 |
| GPA `3.2` | `averageGrade: 80` | ×25 |

- Any token without a known alias (e.g. `Pursuing UG`, `Completed UG`, `B.Tech`, `IGCSE Year 11`)
  is **stored verbatim** — legacy DB values are never rewritten and legacy classification paths
  keep their current stage output. Degree-holder students are guided into structured program
  fields on the new wizard instead of relying on free text.
- `currentProgram` is intentional metadata (e.g. `B.Tech Computer Science`) that must **never** be
  confused with the canonical stage; only the canonical stage is ever stored in `studyLevel` /
  `gradeLevel`.

## Engine / matching integrity

- `mapStudentProfileToSignals` reads exactly its pre-Phase-24 fields (gradeLevel, studyLevel,
  exams, state, preferredCareer, highestEducation, averageGrade, targetCountry,
  careerPlanNotes, tuitionBudget, subjects*, activityInterests). `currentProgram` produces no
  signal (regression test `P1` asserts no `current_program` or program-text appears in
  `studentCareerSignal`).
- Golden stage-equivalence tests (`G1`–`G7`) assert legacy vs canonical tokens yield identical
  `detectEducationStage` output for the engine (`score.ts`) and roadmap
  (`education-stage.ts`):
  - `grade_level:10th` ≡ `grade_level:Class 10` → `SCHOOL`
  - `12th` ≡ `Class 12` → `SCHOOL`; `Polytechnic` ≡ `Diploma (Polytechnic)` → `POST_SCHOOL`
  - `B.Tech` ≡ `Year 1 Undergraduate` → `POST_SCHOOL`; `Working Professional` → `POST_SCHOOL` (engine) / `CAREER_SWITCHER` (roadmap)
- Roadmap fix discovered by `G7`: `GRADE_10_RE` used `sse?`, which matched any double-`s` and
  misclassified "Working Professional" (the `ss` in "professional") as `SCHOOL_CLASS10`.
  Tightened to `ss[ce]` so SSC/SSE school certificates still match but career-switcher text does
  not. This is roadmap-only (not part of the frozen engine) and only affects the new
  `Working Professional` canonical value; no legacy data existed under that exact string.
- Freeze harness (`phase16b-golden-harness.mjs`) output is byte-identical to
  `phase18-1-engine-freeze-baseline.json` (ignoring `generatedAt`).
- Protected datasets unchanged: `University` 20, `IndianInstitution` 73,969, `career` 289,
  `subject` 59.

## Draft mode semantics

`mode: "draft"` accepts partial data (no career, no abroad countries, no English score) and keeps
`careerPrefsFilled=false`; the dashboard gate still shows the career wizard so the student can
finalize. `mode: "finalize"` (default) retains the complete prior validation surface, so
`careerPrefsFilled=true` implies a career (matching guarantees hold).

## Verification

- Tests: **636/636 pass** (611 pre-existing + 25 new in
  `tests/phase24-student-registration-v2.test.mjs`).
- `npm run typecheck` clean; `npm run build` success.
- Freeze byte-identical; dataset counts intact.

## Commit

`Phase 24: student registration V2 and career matching data integrity`