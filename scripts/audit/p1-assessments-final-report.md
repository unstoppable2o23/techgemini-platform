# P1 — Final Report: Counsellor-Assigned Assessments (Assignment-Driven, Optional)

**Date:** 2026-09-10
**Branch:** master
**Commit:** `070215d` — Phase 32: counsellor-assigned assessments (assignment-driven, optional, IN_PROGRESS lifecycle)

**Status:** **PASS** — all P1 requirements met and verified (full suite 790/791; 1 pre-existing cross-file DB race, not related to this change).

## Objective

Assessments must be **counsellor-assignment-driven and optional**. The denominator for every completeness/count is the **assigned suite for that student** — never a fixed "5". A student with **zero assigned assessments** is complete-by-default: nothing is blocked, no `take_assessments` nag, no `ASSESSMENT_INCOMPLETE` attention state, and career-profile completeness grants the full 40% assessment credit. A new `IN_PROGRESS` lifecycle state covers saved-but-unsubmitted work.

## Status per requirement

| Requirement | Status |
|---|---|
| `TestAssignmentStatus` gains `IN_PROGRESS` (ASSIGNED / IN_PROGRESS / COMPLETED) | ✅ additive migration `20260910000000_assessment_in_progress_status` applied to dev DB; client regenerated to v5.22.0 |
| Single fresh state to binary map `kind → status`: isPending, isCompleted, inProgress | ✅ `src/lib/student/assessments.ts` — `summarizeAssignments` + `summarizeAssignmentsByStudent` (kind-deduped) |
| Fresh state to binary map for command-center `_count`, avoiding client-side N+1 | ✅ command center batch-fetches assignments once and groups per student |
| Complete driver mapping — denominators derived from the assigned suite | ✅ journey, basics, student360, counselor students route/page, decision-pack loader/actions, career-profile completeness |
| Profile-completeness partial/full/complete updating won't CASCADE INTO the frozen Engine | ✅ engine untouched; `generate.ts` only swaps denominators |
| Phase 27 command-center behavior: cohorts should now follow the assigned count (partial-complete-incomplete ratio, denominators) | ✅ counts, filters and rows use assigned totals; filters treat zero-assigned as complete |
| Student dashboard (student-intelligence-hub) assessment card driven by assigned suite with correct CD (none/zero/partial/full) | ✅ card shows `completed / assigned` and a "no assessments assigned" state |
| **Optional:** locked = false — nothing blocks when a student has no assigned assessments | ✅ journey assessments step `done` at 0/0 ("No assessments assigned"); attention never emits `ASSESSMENT_INCOMPLETE` (0 < 0 is false); `buildGaps`/actions guard `assessmentTotal > 0` |
| No student-facing UI should present "5 of 5" style fixed-suite language | ✅ assessments page, dashboard hub use assigned wording; list tables show real denominators |

## Approach / migration note

`npx prisma migrate dev` is **not usable** in this repo (shadow-DB replay fails on incomplete migration history — dev DB was built via `db push`, only the two `20260727` migrations are recorded). Additive change applied via:

```
prisma/migrations/20260910000000_assessment_in_progress_status/migration.sql   (idempotent ALTER TYPE … ADD VALUE)
npx prisma db execute --schema prisma/schema.prisma --file <sql>
npx prisma generate
```

## Verification

| Check | Result |
|---|---|
| Phase 32 test suite (assignment-driven registry) — 12 tests | ✅ 12/12 |
| Phase 27 command center suite (updated 6/15 semantics) | ✅ 16/16 |
| Full suite `npm test` | ✅ 790/791 — 1 pre-existing fail: phase31 §13 global `productEvent` row-count delta races with parallel test files; passes green in isolation |
| `npm run typecheck` | ✅ 0 errors |
| `npx next build` | ✅ Compiled successfully |
| Protected datasets | ✅ Career 289 · Degree 751 · University 20 · IndianInstitution 73969 · Program 80 · Subject 59 (frozen baselines exact) |
| Frozen engine byte-identical regressions (phase30 §19, phase31 §15, university-profile) | ✅ all pass |

## Data counts (protected, unchanged)

| Dataset | Count |
|---|---|
| Career | 289 |
| Degree | 751 |
| University | 20 |
| IndianInstitution | 73969 |
| Program | 80 |
| Subject | 59 |

## Notes

- `IN_PROGRESS` is set server-side on every non-completed progress save; `complete` route is unchanged (already sets COMPLETED).
- Back-compat preserved: pure `computeJourneyState` still defaults an unspecified total to the 5-kind catalogue; `journey-state` re-exports `ASSESSMENT_KINDS` for `decision-pack/loader`.
- Decision center / decision pack rows (`“X of Y assessments”` copy) now reflect assigned totals automatically (`center.header` ← `getJourneyState`).