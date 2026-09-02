# Phase 17 — Career → Program Coverage

**Purpose:** verifies every active career has at least one academically-appropriate programme
mapping, that all references resolve, and that each mapping is a valid relationship entry.

## Coverage summary
- **Active careers:** 289
- **Careers with ≥1 active mapping:** 289 (100%)
- **Careers with no active mapping:** **0**
- **Total `CareerProgramMapping` rows:** 856 (≈2.96 per career)

## Relationship distribution
| Relationship | Mappings | Share | Avg strength |
|---|---|---|---|
| PRIMARY | 298 | 34.8% | 1.00 |
| COMMON | 484 | 56.5% | 0.80 |
| SPECIALIZED | 19 | 2.2% | 0.70 |
| RELEVANT | 25 | 2.9% | 0.60 |
| OPTIONAL | 30 | 3.5% | 0.40 |

PRIMARY > COMMON > SPECIALIZED / RELEVANT / OPTIONAL is honoured by the deterministic ranker
(`REL_RANK` in `src/lib/career-program.ts`): PRIMARY always outranks COMMON, which outranks the
rest, and comparison then falls to ascending `priority`, then ascending programme name.

## Referential integrity
- Every `CareerProgramMapping.programId` resolves to an `AcademicProgram` (no dangling references).
- Every `CareerProgramMapping.careerId` resolves to an active `Career`.
- No duplicate `(careerId, programId)` pairs (`@@unique` constraint); validation run reports
  `unknownSlugs = 0`, duplicate mappings = 0.

## Careers intentionally without a PRIMARY degree (contextual preparation)
These 4 careers carry `COMMON`/`OPTIONAL` (or contextual) mappings but no false `PRIMARY`:
- `Airforce`, `Industrial Safety`, `Defence Services`, `Staff Selection Services`

These represent exam/aptitude-driven or contextual roles rather than a single degree pathway, so
a solitary "primary degree" would be misleading. All still have ≥1 valid, resolvable mapping.

## School-stage on-ramps
Every career has at least one **undergraduate** (Bachelor's / Professional / Diploma) programme,
so a school-stage learner is never handed a postgraduate programme as the exclusive immediate next
step. Seven postgraduate-led professions (e.g. `Public Health`, `Hospital Administration`,
`Museum Studies and Curatorship`, `Archival Studies`, `Education Administration`, `Corporate
Training`, `Higher Education and Academia`) additionally carry an explicit undergraduate on-ramp
(e.g. `Life Sciences`, `Business Administration (BBA)`, `History`, `Education (B.Ed)`).

## Golden careers (curated spot-check)
`Software Engineering`, `Data Science`, `Medicine`, `Civil Engineering`, `Agriculture`,
`History/Humanities`, `Journalism/Media`, `Law`, `Psychology`, `Architecture`,
`Environmental/Sustainability`, `Business/Finance`, `Education`, `Design` — each has appropriate
PRIMARY/COMMON/SPECIALIZED mapping (see test `tests/career-program-mapping.test.mjs`).

## No unrelated mappings
Because every mapping was hand-curated to a category-appropriate programme and validated against
the catalogue, no obviously-unrelated mapping was introduced (e.g. no `Nursing` → `Mining
Engineering`). This is exercised by the targeted relationship tests.