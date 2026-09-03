# Phase 21 — Personalized Student Study Roadmap + "Trending for You": Final Report

## Status
COMPLETE — Phase 21 ships two consumer layers layered on top of the **frozen**
career engine:
1) **Personal Student Study Roadmap V1** — answers "what should I do next to reach
   my target career", for both INDIA and ABROAD.
2) **Personalized Trending Careers ("Trending for You")** — a discovery layer that
   contextualizes trending careers to the student's education journey.

These are CONSUMERS. No changes were made to career matching weights/formula/
confidence/ranking, assessment scoring, CareerTrait logic, aliases, career
taxonomy, Program, University, or IndianInstitution data.

## DB counts (unchanged, verified)
| Entity | Count |
|---|---|
| Career (active) | **289** |
| Program | **75** |
| University | **20** |
| IndianInstitution | **73,969** |
| AcademicProgram | **242** |

No `prisma db push --accept-data-loss`, no reset.

## Roadmap architecture
- Domain libs: `src/lib/roadmap/{types,country-config,education-stage,rules,service}.ts`
- `buildRoadmap()`: stage-aware engine with India/Abroad branching, `StepBuilder`,
  `countryRequirementSteps()`, dedupe-by-title, `computeProgress` (completed
  actions only), `makeSnapshot`.
- `service.ts`: create-on-demand, regenerate (preserves COMPLETED + COUNSELOR
  steps), update status, add/remove counselor steps.
- API: `GET/POST /api/student/roadmap`, `PATCH /api/student/roadmap/steps/[id]`,
  `GET/POST/PATCH /api/counselor/students/[id]/roadmap`.
- Student UI: `(student)/roadmap/page.tsx` + `roadmap-client.tsx`.
- Counselor UI: `students/[id]/roadmap-tab.tsx` (new "Roadmap" tab in the 360).

## Countries supported
`INDIA`, `USA`, `UK`, `CANADA`, `AUSTRALIA`, `GERMANY`, `IRELAND`, `NEW_ZEALAND`.

## Education stages supported
`SCHOOL_CLASS10`, `SCHOOL_CLASS12`, `UNDERGRADUATE`, `POSTGRADUATE`,
`CAREER_SWITCHER`, `UNKNOWN`.

## Roadmap rules (honest by design)
- No impossible education sequencing.
- Exams only with evidence (`REQUIRED`/`RECOMMENDED`/`MAY_APPLY`/`CHECK`).
- No fabricated deadlines/costs/requirements.
- No guaranteed admission/scholarship/visa/employment.
- Honest "why" explanations; conservative wording.

## Trending logic
- Two views: **"Trending for You"** (sufficient info) vs **"Trending Careers"**
  (low-information, honest limitations).
- `TrendRelevanceScore` (0–100, **separate** from `matchScore`), built from
  education-stage, subjects, interests, career family, and destination.
- `MIN_RELEVANCE_SCORE = 30` floor excludes popular-but-unrelated careers.
- `buildTrendReason` ("why trending") + `buildRelevanceReason` ("why relevant").
- Discovery layer only: never "better matches", never auto-changes preferred
  career, links trending → roadmap.
- Trending data: 251 careers with `CareerTrend` rows (168 trending, 72 emerging,
  43 fast-growing, 251 future-facing; 81 careers marked emerging).

## Golden profile results
10 seeded profiles (class10_science, class12_commerce/humanities/biology,
engineering_ug, cs_ug, psychology, media, architecture, low-info) verified:
foryou view + relevance floor + reasons for informational profiles; honest
trending view for low-info; conservative non-guarantee roadmaps; no PG steps for
school students. All pass.

## Engine-freeze regression
Golden harness re-run vs `phase18-1-engine-freeze-baseline.json`: **23/23
profiles byte-identical**, 289 careers scored, dataset unchanged. CAREER ENGINE
UNCHANGED.

## Tests
- Phase 21 tests: **64** (`phase21-roadmap` 21, `phase21-golden-profiles` 24,
  `phase21-trending` 19) — **64 pass / 0 fail**.
- Full suite: **501 pass / 1 fail**. The single failure (`education-pathways`:
  "Corporate Law should have at least one subject-link pathway") is a
  **pre-existing** test/data mismatch: 11 specialized careers list recommended
  subjects (e.g., "Business Law", "Agronomy") that have no `Subject` record, so
  no SUBJECT_LINK can exist. This is unrelated to Phase 21 (no career/education
  data was touched) and is deliberately left alone to preserve the engine/data
  freeze.

## Build & type status
- `npx tsc --noEmit --skipLibCheck` — **clean**.
- `npm run build` — **succeeds**; `/roadmap` and the four roadmap/trending API
  routes are registered.

## Vercel status
Deployment pipeline remains SUCCESS (build passes with all Phase 21 routes).
(Prior Phase 20 Vercel: SUCCESS.)

## Security
- Student routes self-scope to `session.user.id`; the roadmap GET no longer reads
  a client-supplied `studentId` (verified by `security-release-check`).
- Counselor roadmap route is gated by `loadAuthorizedStudent` (authorized
  students only) with tenant isolation.
- Trending is STUDENT-only and returns only the signed-in student's data.

## Confirmations
- **CAREER ENGINE UNCHANGED** — roadmap/trending only consume `getCareerMatches`
  output; golden harness byte-identical.
- **ASSESSMENT ENGINE UNCHANGED** — no assessment logic touched.
- **UNIVERSITY UNCHANGED** — University data read-only (289/75/20/73969/242
  unchanged).
- **INDIANINSTITUTION UNCHANGED** — IndianInstitution data read-only.
- **PROGRAM UNCHANGED** — Program data read-only; roadmap uses existing
  `CareerProgramMapping`.

## Files added
- `src/lib/roadmap/{types,country-config,education-stage,rules,service}.ts`
- `src/lib/career-trends/personalization.ts`
- `src/app/api/student/trending/route.ts`
- `src/app/api/student/roadmap/{route,steps/[id]/route}.ts`
- `src/app/api/counselor/students/[id]/roadmap/route.ts`
- `src/app/(student)/roadmap/{page.tsx,roadmap-client.tsx}`
- `src/app/(counselor)/students/[id]/roadmap-tab.tsx`
- `tests/phase21-{roadmap,golden-profiles,trending}.test.mjs`
- Audit reports + `phase21-roadmap-audit.json`, `phase21-trending-audit.json`

## Files edited
- `prisma/schema.prisma` (roadmap models/enums only)
- `src/app/dashboard/page.tsx`, `src/app/dashboard/student-intelligence-hub.tsx`
- `src/lib/student/dashboard.ts`
- `src/app/(counselor)/students/[id]/student-360-client.tsx`
