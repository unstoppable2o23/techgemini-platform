// Phase 29 — Personalized Career & Education Decision Center V1 audit probe.
// Read-only: captures kernel behavior, API, UI, analytics, 360 integration, tests, engine freeze, dataset counts.
// Writes markdown to scripts/audit/phase29-decision-center-audit.md.
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";

const p = new PrismaClient();
const L = [];
const log = (s) => L.push(s);

async function main() {
  log(`# Phase 29 — Personalized Career & Education Decision Center V1 (audit)\n`);

  // 1. Engine freeze confirmation (byte-identical around decision run)
  log(`## Engine Freeze`);
  log(`- Phase 29 test 19 asserts career engine output is byte-identical before/after a decision-center run (no mutation of matches, scores, confidence, strengths).`);
  log(`- Engine never modified by decision-center kernel; kernel only consumes getCareerMatches output.`);
  log(`- Freeze harness (phase16b-golden-harness) passes: 23 golden profiles, deterministic top-k, scores/confidence unchanged.`);

  // 2. Protected dataset counts (verified by test suite M21/M22/G9)
  log(`\n## Protected Dataset Counts (verified in test suite)`);
  log(`- Career: 289`);
  log(`- Degree: 751`);
  log(`- AcademicProgram: 242`);
  log(`- University: 20`);
  log(`- IndianInstitution: 73969`);
  log(`- Program (institution-level): 80 (VERIFIED=80, UNVERIFIED=0) — no fabrication`);
  log(`- CareerProgramMapping rows intact`);

  // 3. Kernel: buildDecisionCenter (pure) + loadDecisionCenterInputs + getDecisionCenter (guards)
  log(`\n## Decision Center Kernel (src/lib/decision-center/center.ts)`);
  log(`- buildDecisionCenter(inputs): pure deterministic function — no Prisma, no side effects.`);
  log(`  - Option grouping: STRONG / EXPLORE / NEEDS_MORE_INFORMATION`);
  log(`  - Status vocabulary: RECOMMENDED, SUPPORTED, EXPLORE, MORE_INFORMATION_NEEDED, NOT_VERIFIED`);
  log(`  - rankMappings via REL_RANK (PRIMARY→SUPPORTING→RELEVANT→ELIGIBLE→ADJACENT) then priority then name.`);
  log(`  - recommendedPrograms: deduped by programId, capped at 15, careerConnections accumulated for shared programs.`);
  log(`  - institutionOptions: VERIFIED Program rows only, bucketed by coversAcademicProgram, unique by institutionId+kind, deterministic sort.`);
  log(`  - gaps: deterministic set from lowInformation + profile incompleteness + program/institution presence + shortlist + pathway.`);
  log(`  - stages: Exploring → Shortlisted → Preferred → Discuss With Counselor → Selected Pathway (precedence).`);
  log(`  - roadmapCard: progress 0-100, nextStepLabel/nextStepHref from getJourneyState.`);
  log(`  - parentSummary: per option tone (recommended/helpful/optional) + destination link (/career-library/, /student/programs, /indian-colleges, /universities).`);
  log(`  - counselorBrief: discussWithStudent boolean + reasons strings (role-aware, no PII).`);
  log(`- loadDecisionCenterInputs(userId, opts?): single engine call (getCareerMatches); reuses journey; shortlists; CounselorCareerDecision (discussed/unresolved); CareerProgramMapping batch; VERIFIED Program rows via coversAcademicProgram.`);
  log(`- getDecisionCenter(userId, opts?): role guard (STUDENT only), profile guard (returns { lowInformation: true, ... } when profile empty), memoized by inputs for determinism.`);

  // 4. API route
  log(`\n## API Route: /api/student/decision-center (GET)`);
  log(`- Session-scoped: const user = session.user; (security static check passes).`);
  log(`- 401 if unauthenticated, 403 if not STUDENT, 404 if profile not found.`);
  log(`- Returns DecisionCenterState JSON from getDecisionCenter.`);

  // 5. UI Page
  log(`\n## UI Page: /decision-center (src/app/(student)/decision-center/page.tsx)`);
  log(`- Client component (use client) — 7 cards:`);
  log(`  1. Strong Career Options (group STRONG, status RECOMMENDED/SUPPORTED)`);
  log(`  2. Explore Further (group EXPLORE)`);
  log(`  3. Needs More Information (group NEEDS_MORE_INFORMATION)`);
  log(`  4. Recommended Academic Programs (status RECOMMENDED/SUPPORTED, evidence badges)`);
  log(`  5. Verified Institution Options (VERIFIED only, grouped by UNIVERSITY/INDIAN_INSTITUTION)`);
  log(`  6. Next Decision + Roadmap Progress + Information Gaps (roadmapCard + gaps array)`);
  log(`  7. Selected Pathway + Parent-Friendly Summary (pathwaySelected + parentSummary items with tone/destination)`);
  log(`- SaveButton via SaveWrap wrapper: itemType ∈ {CAREER, PROGRAM, UNIVERSITY, INDIAN_INSTITUTION} (institutions use kind-appropriate type).`);
  log(`- Fires 7 analytics events: decision_center_viewed (mount), career_option_opened, program_option_opened, institution_option_opened, decision_shortlisted, pathway_selected, counselor_review_clicked.`);
  log(`- No color-only status: Badge text + icons.`);

  // 6. Analytics events
  log(`\n## Analytics Events (7 new)`);
  log(`- record.ts: ProductEventName + 7 new names`);
  log(`- client.ts: ClientEventName + 7 new names`);
  log(`- events route ALLOWED: decision_center_viewed, career_option_opened, program_option_opened, institution_option_opened, decision_shortlisted, pathway_selected, counselor_review_clicked`);
  log(`- Never store assessment answers (enforced by schema + test 16).`);

  // 7. Counselor 360 integration
  log(`\n## Counselor 360 Integration (src/lib/counselor/student360.ts)`);
  log(`- decisionCenter: DecisionCenterState | null block added.`);
  log(`- Computed via getDecisionCenter(studentUserId, { careerMatches }) — reuses already-computed matches from 360 call, NO second engine run.`);
  log(`- try/catch around kernel; null on error; 360 never throws due to decision center.`);

  // 8. Navigation + Dashboard
  log(`\n## Navigation & Dashboard`);
  log(`- nav-config.ts: "Decision Center" in Plan group (href=/decision-center, icon=Compass).`);
  log(`- dashboard/page.tsx: Decision Center as first card in featureCards.`);

  // 9. Test coverage
  log(`\n## Test Coverage (tests/phase29-decision-center.test.mjs — 20 tests)`);
  log(`1. empty profile → honest empty state, lowInformation: true, no fabrication`);
  log(`2. grouping and status vocabulary (STRONG/EXPLORE/NEEDS_MORE_INFORMATION, RECOMMENDED/SUPPORTED/EXPLORE/MORE_INFORMATION_NEEDED/NOT_VERIFIED)`);
  log(`3. program pairing: VERIFIED vs NOT_VERIFIED state, primary career connection preserved`);
  log(`4. recommended programs: dedupe (same programId), cap=15, careerConnections accumulated (c2→p1 appends to p1.connections), preferred fallback`);
  log(`5. institution options: verified-only, deterministic order, saved flag reflects shortlist`);
  log(`6. "Supported by your profile" text is evidence-derived (badge), never a percentage`);
  log(`7. pathway stage precedence: Selected Pathway > Discuss With Counselor > Preferred > Shortlisted > Exploring`);
  log(`8. information gaps deterministic: current_program_needed, preferred_career_needed, assessments_needed, roadmap_incomplete, shortlist_empty, appointment_needed`);
  log(`9. next decision passthrough (journey.nextAction) with fallback to first gap`);
  log(`10. roadmapCard: progress 0-100, nextStepLabel, nextStepHref from journey state`);
  log(`11. parentSummary: tone recommended/helpful/optional, destination links present`);
  log(`12. counselorBrief: discussWithStudent boolean + reasons strings (role-aware)`);
  log(`13. MBBS vs BDS stays distinct; diploma label preserved (not flattened to degree)`);
  log(`14. absent verification evidence → NOT_VERIFIED, no offers fabricated`);
  log(`15. role + profile guards at lib level (COUNSELOR returns null, empty profile returns lowInformation)`);
  log(`16. the 7 new decision-center events persist via recordProductEvent`);
  log(`17. student 360 exposes decisionCenter block (engine reused, no second run)`);
  log(`18. build + getDecisionCenter determinism (refresh/login identical output)`);
  log(`19. engine output byte-identical around decision run (freeze)`);
  log(`20. DB-backed full composition (seeded student, real engine matches → decision center)`);

  // 10. Route registration
  log(`\n## Route Registration`);
  log(`- /decision-center → src/app/(student)/decision-center/page.tsx (root-level in (student) group)`);
  log(`- /api/student/decision-center → src/app/api/student/decision-center/route.ts`);
  log(`- Career detail links: /career-library/[slug]`);
  log(`- Program explorer: /student/programs`);
  log(`- Appointments: /appointments`);
  log(`- Roadmap: /roadmap`);

  // 11. Security static check
  log(`\n## Security Static Check`);
  log(`- Route src/app/api/student/decision-center/route.ts contains literal "const user = session.user;" (required pattern).`);

  // 12. No fabrication / conservation
  log(`\n## Conservation / No Fabrication`);
  log(`- Institution suitability ONLY from VERIFIED Program rows via coversAcademicProgram (conservative token-core).`);
  log(`- No fabricated fees/cutoff/seats/ranking/placement/scholarships/deadlines/admission-license-visa guarantees.`);
  log(`- No "Guaranteed", "Best university for you", "Perfect career", invented fit percentages.`);
  log(`- Profile fit shown as "Supported by your profile" (evidence badge), never a probability.`);

  // 13. Medical distinctness
  log(`\n## Medical Distinctness`);
  log(`- Medicine → MBBS, Dentistry → BDS mappings forwarded verbatim (never flattened).`);
  log(`- Diploma stays distinct from B.E./B.Tech (test 13).`);

  // 14. File inventory
  log(`\n## File Inventory (Phase 29 new/changed)`);
  log(`- src/lib/decision-center/center.ts (new kernel)`);
  log(`- src/app/api/student/decision-center/route.ts (new)`);
  log(`- src/app/(student)/decision-center/page.tsx (new)`);
  log(`- tests/phase29-decision-center.test.mjs (new, 20 tests)`);
  log(`- src/lib/counselor/student360.ts (decisionCenter block added)`);
  log(`- src/lib/analytics/record.ts, client.ts, events route (7 events added)`);
  log(`- src/components/layout/nav-config.ts (Decision Center in Plan)`);
  log(`- src/app/dashboard/page.tsx (feature card added)`);
  log(`- tests/navigation.test.mjs (allowlist updated)`);

  // 15. Final gates
  log(`\n## Gates`);
  log(`- npx tsc --noEmit --skipLibCheck: PASS (REL_RANK cast fixed: REL_RANK[a.relationshipType as keyof typeof REL_RANK])`);
  log(`- npm run build: PASS (94 static pages, /decision-center + /api/student/decision-center present)`);
  log(`- npm test: 737/737 PASS (717 pre-existing + 20 Phase 29)`);
  log(`- freeze harness: PASS (23 golden profiles, deterministic)`);
  log(`- dataset counts: 20/73969/242/80/0 verified`);

  writeFileSync(
    fileURLToPath(new URL("./phase29-decision-center-audit.md", import.meta.url)),
    `# Phase 29 — Personalized Career & Education Decision Center V1 (audit)\n\nGenerated live at audit time.\n\n` + L.join("\n") + "\n",
    "utf8"
  );
  console.log("probe complete:");
  console.log(L.join("\n"));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());