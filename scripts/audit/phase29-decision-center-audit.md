# Phase 29 — Personalized Career & Education Decision Center V1 (audit)

Generated live at audit time.

# Phase 29 — Personalized Career & Education Decision Center V1 (audit)

## Engine Freeze
- Phase 29 test 19 asserts career engine output is byte-identical before/after a decision-center run (no mutation of matches, scores, confidence, strengths).
- Engine never modified by decision-center kernel; kernel only consumes getCareerMatches output.
- Freeze harness (phase16b-golden-harness) passes: 23 golden profiles, deterministic top-k, scores/confidence unchanged.

## Protected Dataset Counts (verified in test suite)
- Career: 289
- Degree: 751
- AcademicProgram: 242
- University: 20
- IndianInstitution: 73969
- Program (institution-level): 80 (VERIFIED=80, UNVERIFIED=0) — no fabrication
- CareerProgramMapping rows intact

## Decision Center Kernel (src/lib/decision-center/center.ts)
- buildDecisionCenter(inputs): pure deterministic function — no Prisma, no side effects.
  - Option grouping: STRONG / EXPLORE / NEEDS_MORE_INFORMATION
  - Status vocabulary: RECOMMENDED, SUPPORTED, EXPLORE, MORE_INFORMATION_NEEDED, NOT_VERIFIED
  - rankMappings via REL_RANK (PRIMARY→SUPPORTING→RELEVANT→ELIGIBLE→ADJACENT) then priority then name.
  - recommendedPrograms: deduped by programId, capped at 15, careerConnections accumulated for shared programs.
  - institutionOptions: VERIFIED Program rows only, bucketed by coversAcademicProgram, unique by institutionId+kind, deterministic sort.
  - gaps: deterministic set from lowInformation + profile incompleteness + program/institution presence + shortlist + pathway.
  - stages: Exploring → Shortlisted → Preferred → Discuss With Counselor → Selected Pathway (precedence).
  - roadmapCard: progress 0-100, nextStepLabel/nextStepHref from getJourneyState.
  - parentSummary: per option tone (recommended/helpful/optional) + destination link (/career-library/, /student/programs, /indian-colleges, /universities).
  - counselorBrief: discussWithStudent boolean + reasons strings (role-aware, no PII).
- loadDecisionCenterInputs(userId, opts?): single engine call (getCareerMatches); reuses journey; shortlists; CounselorCareerDecision (discussed/unresolved); CareerProgramMapping batch; VERIFIED Program rows via coversAcademicProgram.
- getDecisionCenter(userId, opts?): role guard (STUDENT only), profile guard (returns { lowInformation: true, ... } when profile empty), memoized by inputs for determinism.

## API Route: /api/student/decision-center (GET)
- Session-scoped: const user = session.user; (security static check passes).
- 401 if unauthenticated, 403 if not STUDENT, 404 if profile not found.
- Returns DecisionCenterState JSON from getDecisionCenter.

## UI Page: /decision-center (src/app/(student)/decision-center/page.tsx)
- Client component (use client) — 7 cards:
  1. Strong Career Options (group STRONG, status RECOMMENDED/SUPPORTED)
  2. Explore Further (group EXPLORE)
  3. Needs More Information (group NEEDS_MORE_INFORMATION)
  4. Recommended Academic Programs (status RECOMMENDED/SUPPORTED, evidence badges)
  5. Verified Institution Options (VERIFIED only, grouped by UNIVERSITY/INDIAN_INSTITUTION)
  6. Next Decision + Roadmap Progress + Information Gaps (roadmapCard + gaps array)
  7. Selected Pathway + Parent-Friendly Summary (pathwaySelected + parentSummary items with tone/destination)
- SaveButton via SaveWrap wrapper: itemType ∈ {CAREER, PROGRAM, UNIVERSITY, INDIAN_INSTITUTION} (institutions use kind-appropriate type).
- Fires 7 analytics events: decision_center_viewed (mount), career_option_opened, program_option_opened, institution_option_opened, decision_shortlisted, pathway_selected, counselor_review_clicked.
- No color-only status: Badge text + icons.

## Analytics Events (7 new)
- record.ts: ProductEventName + 7 new names
- client.ts: ClientEventName + 7 new names
- events route ALLOWED: decision_center_viewed, career_option_opened, program_option_opened, institution_option_opened, decision_shortlisted, pathway_selected, counselor_review_clicked
- Never store assessment answers (enforced by schema + test 16).

## Counselor 360 Integration (src/lib/counselor/student360.ts)
- decisionCenter: DecisionCenterState | null block added.
- Computed via getDecisionCenter(studentUserId, { careerMatches }) — reuses already-computed matches from 360 call, NO second engine run.
- try/catch around kernel; null on error; 360 never throws due to decision center.

## Navigation & Dashboard
- nav-config.ts: "Decision Center" in Plan group (href=/decision-center, icon=Compass).
- dashboard/page.tsx: Decision Center as first card in featureCards.

## Test Coverage (tests/phase29-decision-center.test.mjs — 20 tests)
1. empty profile → honest empty state, lowInformation: true, no fabrication
2. grouping and status vocabulary (STRONG/EXPLORE/NEEDS_MORE_INFORMATION, RECOMMENDED/SUPPORTED/EXPLORE/MORE_INFORMATION_NEEDED/NOT_VERIFIED)
3. program pairing: VERIFIED vs NOT_VERIFIED state, primary career connection preserved
4. recommended programs: dedupe (same programId), cap=15, careerConnections accumulated (c2→p1 appends to p1.connections), preferred fallback
5. institution options: verified-only, deterministic order, saved flag reflects shortlist
6. "Supported by your profile" text is evidence-derived (badge), never a percentage
7. pathway stage precedence: Selected Pathway > Discuss With Counselor > Preferred > Shortlisted > Exploring
8. information gaps deterministic: current_program_needed, preferred_career_needed, assessments_needed, roadmap_incomplete, shortlist_empty, appointment_needed
9. next decision passthrough (journey.nextAction) with fallback to first gap
10. roadmapCard: progress 0-100, nextStepLabel, nextStepHref from journey state
11. parentSummary: tone recommended/helpful/optional, destination links present
12. counselorBrief: discussWithStudent boolean + reasons strings (role-aware)
13. MBBS vs BDS stays distinct; diploma label preserved (not flattened to degree)
14. absent verification evidence → NOT_VERIFIED, no offers fabricated
15. role + profile guards at lib level (COUNSELOR returns null, empty profile returns lowInformation)
16. the 7 new decision-center events persist via recordProductEvent
17. student 360 exposes decisionCenter block (engine reused, no second run)
18. build + getDecisionCenter determinism (refresh/login identical output)
19. engine output byte-identical around decision run (freeze)
20. DB-backed full composition (seeded student, real engine matches → decision center)

## Route Registration
- /decision-center → src/app/(student)/decision-center/page.tsx (root-level in (student) group)
- /api/student/decision-center → src/app/api/student/decision-center/route.ts
- Career detail links: /career-library/[slug]
- Program explorer: /student/programs
- Appointments: /appointments
- Roadmap: /roadmap

## Security Static Check
- Route src/app/api/student/decision-center/route.ts contains literal "const user = session.user;" (required pattern).

## Conservation / No Fabrication
- Institution suitability ONLY from VERIFIED Program rows via coversAcademicProgram (conservative token-core).
- No fabricated fees/cutoff/seats/ranking/placement/scholarships/deadlines/admission-license-visa guarantees.
- No "Guaranteed", "Best university for you", "Perfect career", invented fit percentages.
- Profile fit shown as "Supported by your profile" (evidence badge), never a probability.

## Medical Distinctness
- Medicine → MBBS, Dentistry → BDS mappings forwarded verbatim (never flattened).
- Diploma stays distinct from B.E./B.Tech (test 13).

## File Inventory (Phase 29 new/changed)
- src/lib/decision-center/center.ts (new kernel)
- src/app/api/student/decision-center/route.ts (new)
- src/app/(student)/decision-center/page.tsx (new)
- tests/phase29-decision-center.test.mjs (new, 20 tests)
- src/lib/counselor/student360.ts (decisionCenter block added)
- src/lib/analytics/record.ts, client.ts, events route (7 events added)
- src/components/layout/nav-config.ts (Decision Center in Plan)
- src/app/dashboard/page.tsx (feature card added)
- tests/navigation.test.mjs (allowlist updated)

## Gates
- npx tsc --noEmit --skipLibCheck: PASS (REL_RANK cast fixed: REL_RANK[a.relationshipType as keyof typeof REL_RANK])
- npm run build: PASS (94 static pages, /decision-center + /api/student/decision-center present)
- npm test: 737/737 PASS (717 pre-existing + 20 Phase 29)
- freeze harness: PASS (23 golden profiles, deterministic)
- dataset counts: 20/73969/242/80/0 verified
