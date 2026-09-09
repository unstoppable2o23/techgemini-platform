# Phase 27 — Counselor Command Center + Student 360 Action Planning (v1)

## Scope
A deterministic counselor workspace: dashboard command center (8 persisted counts, attention-state distribution, follow-up buckets, students-by-priority), a Student 360 header with operational attention state, a career-decision workflow (advisor records), program-planning flags, status-grouped roadmap view with counselor notes, a printable PDF-ready 360 report, and server-side roster filters (attention / country / stage / roadmap). The frozen career engine is untouched — every count and state derives from persisted rows only.

## Design invariants
- **Operational, never evaluative.** Attention states describe the student's workflow stage (`FOLLOW_UP_DUE`, `ROADMAP_STALLED`, `PROFILE_INCOMPLETE`…), never student quality — no "weak/poor/unsuitable" wording anywhere. Language is locked in `ATTENTION_LABELS`.
- **Persisted-only, batched.** `getCounselorCommandCenter` reads a handful of queries: 1 users fetch (with profile subset + career profile + roadmap), 1 shortlist `groupBy`, 1 open-actions fetch, 1 all-actions fetch (for the follow-up bucket), 1 decisions fetch. The engine is never called per student, so a full roster scores deterministically with no N+1 matching runs.
- **Attention priority order (deterministic):** `FOLLOW_UP_DUE` (open action due ≤ 7 days) → `ROADMAP_STALLED` / `ROADMAP_NOT_STARTED` → `PROFILE_INCOMPLETE` (< 60) → `ASSESSMENT_INCOMPLETE` (5 kinds) → `NO_CLEAR_PATHWAY` → `UNIVERSITY_SHORTLIST_MISSING` → `READY_FOR_COUNSELOR_REVIEW`.
- **Advisor records are firewalled.** `CounselorCareerDecision` / `CounselorProgramPlan` are separate rows keyed on `studentId_careerId` / `studentId_careerId_programId` — they never replace `StudentProfile.preferredCareerId` (asserted in test 8) and are never fed to the scoring engine.
- **Roadmap status semantics:** "not started" applies only when no roadmap exists (or progress 0); a complete roadmap (progress 100) is never flagged as not-started and can reach `READY_FOR_COUNSELOR_REVIEW`; stale = a mid-progress roadmap with ≥ 14 days without activity.

## Architecture
- `src/lib/counselor/attention.ts` — NEW. Pure attention engine: `ATTENTION_STATES`, `ATTENTION_LABELS`, `ROADMAP_STALL_DAYS = 14`, `AttentionOverview`, `primaryAttention`, `attentionStates` (priority-ordered), `bucketFollowUps(actions, now)` (overdue / dueToday / dueThisWeek / completed).
- `src/lib/counselor/command-center.ts` — NEW. Batch loader `getCounselorCommandCenter({tenantId, counselorUserId?})` → `{counts (8 fields), followUps, attention[], students: StudentAttentionRow[]}`. COUNSELOR scope = assigned students only; SUPER_ADMIN/tenant scope = whole tenant. `hasCareerRecommendations` proxy = career profile present with `level != EMPTY`.
- `src/lib/counselor/planning.ts` — NEW. `listCareerDecisions` / `upsertCareerDecision` and `listProgramPlans` / `upsertProgramPlan` with **merge semantics** (only provided fields change — a partial upsert never wipes sibling flags).
- `src/lib/counselor/notes.ts` — ActionType extended (`ROADMAP_REVIEW`, `PARENT_MEETING`, `SUBJECT_SELECTION`, `ENTRANCE_EXAM`, `PROGRAM_REVIEW`, `STUDENT_FOLLOW_UP`); NoteType extended (`PARENT_MEETING`, `PROGRAM_REVIEW`).
- `src/lib/counselor/student360.ts` — payload extended: `attention {states, primary, lastActivityAt}`, `careerDecisions`, `programPlans`; single shared `AttentionOverview` feeds both states and primary.
- Prisma schema (additive, push-only): `CounselorCareerDecision` + `CounselorProgramPlan` (plain String ids, no FK relations — mirrors existing Advisor model pattern). `npx prisma db push` succeeded; Prisma Client regenerated. No `--accept-data-loss`.
- API (all behind `loadAuthorizedStudent` tenant isolation): `GET/POST career-decision`, `GET/POST program-plan`, `GET programs?careerId=` (merged `getCareerPrograms` + plan flags keyed `${careerId}:${programId}`).
- Dashboard — `counselor-command-center.tsx` (server component): 8 stat cards, follow-up bucket card, attention badges, students-by-priority table; wired into `dashboard/page.tsx` (COUNSELOR + SUPER_ADMIN branches), replaces legacy MyStudents/status stats; quick actions retained.
- Walk-in Student 360 — header buttons (Report / Book follow-up → `/calendar` / Open chat → `/messages`), SummaryBar attention stat, CareerTab "System recommendation + Record career decision", `ProgramPlanning` flag panel.
- Roadmap tab — status grouping (Completed / In Progress / Up Next / Not Started / Skipped) each step labelled with milestone + horizon + reason + counselor note.
- Report — `students/[id]/report/page.tsx` (server, `force-dynamic`) + `print-button.tsx` (`window.print`, `no-print`): stats, profile grid, top-3 career recommendations, decisions, program planning, action plan, notes, disclaimer.
- Student list — `students/page.tsx` server-side filters (`attention`, `country`, `stage`, `roadmap` params; roadmap = `none|started|in-progress|complete`) + client `setFilter` via `router.push`; Attention column added.

## Verification
- `npm run typecheck` — clean.
- `npm run build` — clean.
- `npm test` — **696/696 pass** (680 before Phase 27 + 16 new, all in `tests/phase27-counselor-command-center.test.mjs`):
  1. empty student: priority ordering (follow-up due ranks first, roadmap-not-started included)
  2. stale mid-progress roadmap → ROADMAP_STALLED; fresh one is not stalled
  3. pathway started but no universities → UNIVERSITY_SHORTLIST_MISSING (not on complete roadmap)
  4. journey-complete student is READY_FOR_COUNSELOR_REVIEW and only that
  5. `bucketFollowUps` splits overdue/today/week/completed deterministically
  6. all 8 dashboard counts from a seeded 4-student roster
  7. scope isolation (assigned-only counselor vs whole-tenant) 
  8. career decision records NEVER overwrite `StudentProfile.preferredCareerId`
  9. upsert/list round-trips for decisions + program plans
  10. `getStudent360` exposes attention/decisions/plans with journey intact
  11. decided-pathway student never counted as noSelectedPathway
  12. `withCareerRecommendations` proxy = career profile level != EMPTY
  13. roadmap progress → in-progress only when 0 < p < 100
  14. shortlist counts include UNIVERSITY + INDIAN_INSTITUTION
  15. incomplete assessment/profile counts
  16. deterministic re-runs, no engine narratives leak (no matchScore/confidenceScore)
- Freeze verification — `scripts/audit/phase16b-golden-harness.mjs` run twice under the test runner, normalized: **pass, IDENTICAL to phase18-1 engine-freeze baseline**; engine immutability guard (`tests/engine-freeze-immutability.test.mjs`) green in the full suite.
- Dataset counts unchanged: University 20, IndianInstitution 73,969.
- Bugs surfaced by the new tests and fixed during the phase: (a) a **complete** roadmap was mislabelled ROADMAP_NOT_STARTED because `roadmapStaleDays` falls to `null` at progress 100 — attention semantics now key off `roadmapExists`/progress; (b) partial upserts were wiping sibling boolean flags — now merge-only changes.
- Test fixtures carry a Trial subscription so the global "every active tenant has a subscription" invariant (b2b-tenancy §19) holds under concurrent suites; cleanup is prefix-based (`ph27-${suffix}@x.com`) so a mid-`before` failure can never strand an active tenant.

## Notes
- `npm run lint` is still broken (Next 16 removed `next lint`) — pre-existing, documented, not part of this phase.
- Frozen-engine guardrails observed: no scoring, weights, confidence, matching, or education-stage changes; protected datasets untouched; schema additive only; no `--accept-data-loss`.