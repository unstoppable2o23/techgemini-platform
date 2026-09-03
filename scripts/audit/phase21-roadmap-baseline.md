# Phase 21 — Roadmap Baseline Audit

## Scope
Personalized Student Study Roadmap V1 is a **consumer** of the frozen career engine.
It reads `StudentProfile` (gradeLevel, studyLevel, highestEducation, subjects,
interests, preferredCareer, targetCountry, exams, tuitionBudget), `Career`
matching results (`getCareerMatches`), `Program`/`CareerProgramMapping`
(`getCareerPrograms`), and `University` matches (`getUniversityMatchesForStudent`).
It writes only `StudentRoadmap` / `RoadmapStep` / `RoadmapMilestone` rows for the
owning student. No career, assessment, Program, University, or IndianInstitution
data is modified.

## DB counts (unchanged from Phase 20 baseline)
| Entity | Count |
|---|---|
| Career (active) | 289 |
| Program | 75 |
| University | 20 |
| IndianInstitution | 73,969 |
| AcademicProgram | 242 |

All counts are identical to the Phase 20 baseline. No `prisma db push
--accept-data-loss` was run and no data was reset.

## Education stages supported
`SCHOOL_CLASS10`, `SCHOOL_CLASS12`, `UNDERGRADUATE`, `POSTGRADUATE`,
`CAREER_SWITCHER`, `UNKNOWN`.

## Destinations supported
`INDIA`, `USA`, `UK`, `CANADA`, `AUSTRALIA`, `GERMANY`, `IRELAND`,
`NEW_ZEALAND`.

## Roadmap architecture
- `src/lib/roadmap/types.ts` — all types, `MILESTONE_ORDER`, `recommendedSubjects`
  added to `RoadmapInputs`.
- `src/lib/roadmap/country-config.ts` — `COUNTRY_PATHWAYS` for 8 destinations,
  `resolveDestination()`, `requirementQuestions()`, `SUPPORTED_DESTINATIONS`,
  `destinationLabel`.
- `src/lib/roadmap/education-stage.ts` — `detectEducationStage()`.
- `src/lib/roadmap/rules.ts` — `buildRoadmap()` core engine: stage-aware switch,
  India/Abroad branching, `StepBuilder`, `countryRequirementSteps()`, dedupe by
  title, `computeProgress` (completed actions only), `makeSnapshot`.
- `src/lib/roadmap/service.ts` — `loadRoadmapInputs`, `generateRoadmap`,
  `getOrCreateRoadmap`, `createRoadmap` (two-phase create + createMany),
  `regenerateRoadmap` (preserves COMPLETED + COUNSELOR steps), `updateStepStatus`,
  `addCounselorStep`, `removeStep`.

## Step model
- Statuses: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`, `NOT_APPLICABLE`
- Priorities: `HIGH`, `MEDIUM`, `LOW`
- Horizons: `NOW`, `NEXT_3_MONTHS`, `NEXT_6_12_MONTHS`, `LONGER_TERM`
- Milestones: `FOUNDATION`, `EXPLORATION`, `EXAMS`, `APPLICATION`, `FINANCE`,
  `PREPARATION`, `ADMISSION`, `START`

## Conservation rules
- No impossible education sequencing (e.g., no PG for a Class 10 student).
- Exams appear only with evidence (`REQUIRED` / `RECOMMENDED` / `MAY_APPLY` /
  `CHECK` phrasing).
- No fabricated deadlines, costs, or requirements.
- No guaranteed admission / scholarship / visa / employment language.
- Honest, customer-friendly "why" explanations.
- Conservative wording throughout.

## Verification
- `npx tsc --noEmit --skipLibCheck` — clean.
- `npm run build` — succeeds; `/roadmap`,
  `/api/student/roadmap`, `/api/student/roadmap/steps/[id]`,
  `/api/counselor/students/[id]/roadmap` all registered.
- Roadmap tests: `tests/phase21-roadmap.test.mjs` — 21/21 pass.
- Golden roadmaps: seeded profiles in `tests/phase21-golden-profiles.test.mjs`.

## Engine freeze
Roadmap generates from the frozen `getCareerMatches` output and never alters it.
Re-run of the golden harness produces byte-identical results for all 23 baseline
profiles (see `phase18-1-engine-freeze-baseline.json` re-check).
