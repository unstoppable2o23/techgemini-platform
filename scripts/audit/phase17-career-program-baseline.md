# Phase 17 — Career → Program Intelligence v1 · Baseline

**Purpose:** records the read-mostly baseline captured before Phase 17 changes — the ground
truth against which no-destructive-change is verified at the end of the phase.

## Career/program tables before
| Table | Before (baseline) | After (end of phase) | Unchanged |
|---|---|---|---|
| `AcademicProgram` | 0 (new table) | 242 | n/a (additive) |
| `CareerProgramMapping` | 0 (new table) | 856 | n/a (additive) |
| `Career` (active) | 289 | 289 | ✅ |
| `University` | 20 | 20 | ✅ |
| `IndianInstitution` | 73969 | 73969 | ✅ |
| `Program` | 75 | 75 | ✅ |
| `Degree` | 751 | 751 | ✅ |
| `Specialization` | 726 | 726 | ✅ |
| `Subject` | 59 | 59 | ✅ |
| `CareerEducationPathway` | 2111 | 2111 | ✅ |

## Method
- Baseline captured in `scripts/audit/phase17-db-baseline.json` at Phase 17 base commit `b0ad8e7`,
  before any Phase 17 implementation.
- Phase 17 is **additive only**: two new tables (`AcademicProgram`, `CareerProgramMapping`) and an
  enum (`CareerProgramRelationship`) were `prisma db push`‑ed (additive, no `--accept-data-loss`).
- No existing row in `University`, `IndianInstitution`, `Program`, `Degree`, `Specialization`,
  `Subject`, `Career`, or `CareerEducationPathway` was modified or deleted.

## Architecture summary
Phase 17 ships a **curated canonical programme catalogue** (`AcademicProgram`, 242 programmes)
as the §4 compatibility layer over the dirty `Degree` catalogue, and a
**Career → Programme relationship layer** (`CareerProgramMapping`, 856 rows) connecting every
active career to academically appropriate pathways. The institution-specific `Program` table is
left untouched and is **not** used by this recommendation layer.

## Relationship taxonomy / ranking
`PRIMARY → COMMON → SPECIALIZED → RELEVANT → OPTIONAL` (see `src/lib/career-program.ts`).
- No generic "any degree", "12th pass", or vague fallback mappings were authored.
- The 4 government / defence careers (`Airforce`, `Industrial Safety`, `Defence Services`,
  `Staff Selection Services`) carry contextual `COMMON`/`OPTIONAL` preparation only and are
  deliberately not given a false `PRIMARY` degree.