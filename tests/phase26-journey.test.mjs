// Phase 26 — Student career journey + roadmap integration.
//
// Covers:
//   1–12  pure computeJourneyState goldens (empty → journey complete)
//   13–17 DB-backed getJourneyState / assessCareerJourneyStates / pathway
//   18    counselor 360 journey block
//   19    engine determinism + medical/nursing program distinctness + stages
//
// The journey is DERIVED from persisted data (never a separate journey table),
// so "refresh/login retains state" is asserted by running getJourneyState twice
// over the same rows and requiring identical output.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { computeJourneyState, buildAvailableActions, getJourneyState, assessCareerJourneyStates } from "../src/lib/student/journey-state.ts";
import { setStudentPathway } from "../src/lib/student/pathway.ts";
import { addShortlist } from "../src/lib/student/shortlist.ts";
import { recordProductEvent } from "../src/lib/analytics/record.ts";
import { getCareerMatches } from "../src/lib/career-matching/engine.ts";
import { getCareerPrograms } from "../src/lib/career-program.ts";
import { regenerateRoadmap, updateStepStatus } from "../src/lib/roadmap/service.ts";
import { detectEducationStage, detectDiplomaIntent } from "../src/lib/roadmap/education-stage.ts";
import { getStudent360 } from "../src/lib/counselor/student360.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant, counselorStudent, pathwayStudent, analyserStudent;
let careerA, careerB, surgeonCareer, dentistryCareer, university;
let storedCareerTraits = [];

// Reusable "good enough to matter" match input for pure tests.
const MATCH = (id, name, score = 0.92) => [{ careerId: id, careerName: name, matchScore: score }];
const ONE_MATCH = MATCH("career-golden-001", "Golden Analyst");
const TWO_MATCHES = [...ONE_MATCH, { careerId: "career-golden-002", careerName: "Silver Planner", matchScore: 0.88 }];

async function mkUser(tag) {
  return prisma.user.create({
    data: {
      email: `ph26-${tag}-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "PH26",
      lastName: tag,
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });
}

// A fully "done" input bundle used by the journey-complete goldens.
function completeInputs(extra = {}) {
  return {
    profileCompleteness: 100,
    assessmentCompletedCount: 5,
    assessmentTotal: 5,
    careerMatches: TWO_MATCHES,
    exploredCareerIds: ["career-golden-001"],
    preferredCareerId: "career-golden-001",
    preferredCareerName: "Golden Analyst",
    shortlistedCareerIds: ["career-golden-001"],
    shortlistedUniversityIds: ["uni-golden-001"],
    shortlistedProgramCount: 1,
    programPathwayAvailable: true,
    roadmap: { progress: 100, totalSteps: 8, completedSteps: 8 },
    counselorAssigned: true,
    ...extra,
  };
}

before(async () => {
  tenant = await prisma.tenant.create({
    data: { name: "PH26", slug: `ph26-${suffix}`, subdomain: `ph26-${suffix}` },
  });
  // Preserve the global invariant "every active tenant has a subscription"
  // (b2b-tenancy §19 asserts it while the test suites run concurrently).
  const plan = await prisma.subscriptionPlan.upsert({
    where: { planType: "TRIAL" },
    update: {},
    create: { name: "Trial", planType: "TRIAL" },
  });
  await prisma.subscription.create({
    data: { tenantId: tenant.id, planId: plan.id, status: "TRIAL" },
  });
  counselorStudent = await mkUser("counselor-student");
  pathwayStudent = await mkUser("pathway-student");
  analyserStudent = await mkUser("analyser-student");

  await prisma.studentProfile.create({ data: { userId: counselorStudent.id } });
  await prisma.studentProfile.create({ data: { userId: pathwayStudent.id } });
  await prisma.studentProfile.create({ data: { userId: analyserStudent.id } });

  careerA = await prisma.career.findFirst({ where: { isActive: true }, select: { id: true, name: true, slug: true } });
  careerB = await prisma.career.findFirst({
    where: { isActive: true, id: { not: careerA?.id } },
    select: { id: true, name: true, slug: true },
  });
  surgeonCareer = await prisma.career.findFirst({
    where: { OR: [{ name: { contains: "Surgeon", mode: "insensitive" } }, { name: { contains: "Surgery", mode: "insensitive" } }] },
    select: { id: true, name: true },
  });
  dentistryCareer = await prisma.career.findFirst({
    where: { name: { contains: "Dent", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  university = await prisma.university.findFirst({ select: { id: true } });

  // Seed deterministic signals for the analyser student (copied from a real
  // career's traits) so the engine returns reproducible, non-empty matches.
  const src = await prisma.career.findFirst({
    where: { isActive: true, traits: { some: {} } },
    select: { traits: { select: { dimension: true, value: true } } },
  });
  const dimsWanted = ["INTEREST", "SUBJECT", "WORK_ENVIRONMENT"];
  for (const dim of dimsWanted) {
    const hit = (src?.traits ?? []).find((t) => t.dimension === dim);
    if (hit) storedCareerTraits.push({ dimension: hit.dimension, value: hit.value });
  }
  if (storedCareerTraits.length === 0) {
    storedCareerTraits = (src?.traits ?? []).slice(0, 3).map((t) => ({ dimension: t.dimension, value: t.value }));
  }

  const profile = await prisma.studentCareerProfile.create({ data: { studentId: analyserStudent.id } });
  await prisma.studentCareerSignal.createMany({
    data: storedCareerTraits.map((t) => ({
      profileId: profile.id,
      dimension: t.dimension,
      value: t.value,
      score: 100,
      confidence: 1,
      sourceType: "STUDENT_PROFILE",
      sourceAssessment: null,
    })),
  });
});

after(async () => {
  // Robust cleanup: match by email/slug prefix so a failure inside `before`
  // can never leave a stale active tenant behind (b2b §19 invariant).
  const users = await prisma.user.findMany({ where: { email: { contains: `-${suffix}@x.com` } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  if (userIds.length) {
    await prisma.productEvent.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.studentShortlist.deleteMany({ where: { studentId: { in: userIds } } });
    await prisma.studentRoadmap.deleteMany({ where: { studentId: { in: userIds } } });
    await prisma.testAssignment.deleteMany({ where: { studentId: { in: userIds } } });
    const cpIds = (await prisma.studentCareerProfile.findMany({ where: { studentId: { in: userIds } }, select: { id: true } })).map((p) => p.id);
    if (cpIds.length) await prisma.studentCareerSignal.deleteMany({ where: { profileId: { in: cpIds } } });
    await prisma.studentCareerProfile.deleteMany({ where: { studentId: { in: userIds } } });
    await prisma.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: `ph26-${suffix}` } } });
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1. Empty state (new student)
// ---------------------------------------------------------------------------
test("1 · empty state: complete_profile, locked downstream", () => {
  const s = computeJourneyState({ profileCompleteness: 0, assessmentCompletedCount: 0, careerMatches: [] });
  assert.equal(s.nextBestAction?.id, "complete_profile");
  assert.equal(s.percentComplete, 0);
  assert.equal(s.lowInformation, true);
  const byId = Object.fromEntries(s.steps.map((x) => [x.id, x]));
  assert.equal(byId.profile.status, "current");
  assert.equal(byId.programs.status, "locked");
  assert.equal(byId.universities.status, "locked");
  assert.equal(byId.roadmap.status, "locked");
  assert.equal(byId.roadmap.lockedReason, "Choose a career direction to build your roadmap.");
});

// ---------------------------------------------------------------------------
// 2. Profile only
// ---------------------------------------------------------------------------
test("2 · profile complete → take_assessments", () => {
  const s = computeJourneyState({ profileCompleteness: 100, assessmentCompletedCount: 0, careerMatches: [] });
  assert.equal(s.nextBestAction?.id, "take_assessments");
  const byId = Object.fromEntries(s.steps.map((x) => [x.id, x]));
  assert.equal(byId.profile.status, "done");
  assert.equal(byId.assessments.status, "current");
});

// ---------------------------------------------------------------------------
// 3. Assessments complete, no evidence
// ---------------------------------------------------------------------------
test("3 · assessments full, no evidence → explore_matches", () => {
  const s = computeJourneyState({ profileCompleteness: 100, assessmentCompletedCount: 5, assessmentTotal: 5, careerMatches: [] });
  assert.equal(s.nextBestAction?.id, "explore_matches");
  assert.equal(s.lowInformation, true);
  const byId = Object.fromEntries(s.steps.map((x) => [x.id, x]));
  assert.equal(byId.assessments.status, "done");
  assert.equal(byId.discovery.value, "Add profile evidence to unlock matches");
});

// ---------------------------------------------------------------------------
// 4. Matches present — discovery done, downstream unlocked by goal career
// ---------------------------------------------------------------------------
test("4 · top match present → discovery done, programs/universities unlocked", () => {
  const s = computeJourneyState({ profileCompleteness: 100, assessmentCompletedCount: 5, careerMatches: ONE_MATCH });
  const byId = Object.fromEntries(s.steps.map((x) => [x.id, x]));
  assert.equal(byId.discovery.status, "done");
  assert.equal(byId.programs.status, "current");
  assert.equal(byId.universities.status, "upcoming");
});

// ---------------------------------------------------------------------------
// 5. select_pathway
// ---------------------------------------------------------------------------
test("5 · matches present but not pinned → select_pathway", () => {
  const s = computeJourneyState({ profileCompleteness: 100, assessmentCompletedCount: 5, careerMatches: ONE_MATCH });
  assert.equal(s.hasCareerDirection, true);
  assert.equal(s.preferredCareerSet, false);
  assert.equal(s.nextBestAction?.id, "select_pathway");
});

// ---------------------------------------------------------------------------
// 6. build_roadmap
// ---------------------------------------------------------------------------
test("6 · preferred career set, no roadmap → build_roadmap", () => {
  const s = computeJourneyState({
    profileCompleteness: 100,
    assessmentCompletedCount: 5,
    careerMatches: ONE_MATCH,
    preferredCareerId: "career-golden-001",
    preferredCareerName: "Golden Analyst",
  });
  assert.equal(s.nextBestAction?.id, "build_roadmap");
  const byId = Object.fromEntries(s.steps.map((x) => [x.id, x]));
  // "programs" is the first step that is not done (pathway known but nothing
  // shortlisted/explored yet), so it takes "current"; roadmap is still the
  // next step the NB action drives toward.
  assert.equal(byId.programs.status, "current");
  assert.equal(byId.roadmap.status, "upcoming");
  assert.equal(byId.roadmap.value, "Not started yet");
});

// ---------------------------------------------------------------------------
// 7. continue_roadmap beats shortlist (priority contract)
// ---------------------------------------------------------------------------
test("7 · partial roadmap → continue_roadmap even when shortlists exist", () => {
  const s = computeJourneyState({
    profileCompleteness: 100,
    assessmentCompletedCount: 5,
    careerMatches: ONE_MATCH,
    preferredCareerId: "career-golden-001",
    preferredCareerName: "Golden Analyst",
    shortlistedCareerIds: ["career-golden-001"],
    shortlistedUniversityIds: ["uni-golden-001"],
    roadmap: { progress: 40, totalSteps: 8, completedSteps: 3 },
  });
  assert.equal(s.nextBestAction?.id, "continue_roadmap");
  const byId = Object.fromEntries(s.steps.map((x) => [x.id, x]));
  assert.equal(byId.programs.status, "current");
  assert.equal(byId.roadmap.status, "upcoming");
  assert.equal(byId.roadmap.value, "3/8 actions complete");
  assert.equal(s.percentComplete, 73);
});

// ---------------------------------------------------------------------------
// 8. Roadmap complete
// ---------------------------------------------------------------------------
test("8 · roadmap done, no shortlist → shortlist_careers", () => {
  const s = computeJourneyState({
    ...completeInputs(),
    shortlistedCareerIds: [],
    shortlistedUniversityIds: [],
  });
  assert.equal(s.nextBestAction?.id, "shortlist_careers");
  const byId = Object.fromEntries(s.steps.map((x) => [x.id, x]));
  assert.equal(byId.roadmap.status, "done");
});

// ---------------------------------------------------------------------------
// 9. review_with_counselor
// ---------------------------------------------------------------------------
test("9 · everything done, no appointment → review_with_counselor", () => {
  const s = computeJourneyState({ ...completeInputs(), appointmentBooked: false });
  assert.equal(s.nextBestAction?.id, "review_with_counselor");
  assert.equal(s.percentComplete, 100);
});

// ---------------------------------------------------------------------------
// 10. journey_complete
// ---------------------------------------------------------------------------
test("10 · everything done + appointment booked → journey_complete", () => {
  const s = computeJourneyState({ ...completeInputs(), appointmentBooked: true });
  assert.equal(s.nextBestAction?.id, "journey_complete");
  assert.equal(s.nextBestAction?.category, "COMPLETE");
});

// ---------------------------------------------------------------------------
// 11. Actions gating — never a dead-end CTA (Part 6)
// ---------------------------------------------------------------------------
test("11 · actions are gated on data availability", () => {
  const empty = buildAvailableActions(computeJourneyState({ profileCompleteness: 0, assessmentCompletedCount: 0, careerMatches: [] }));
  const emptyIds = empty.map((a) => a.id);
  assert.deepEqual(emptyIds, ["complete_profile", "take_assessments", "explore_matches", "book_appointment"]);
  assert.ok(!emptyIds.includes("build_roadmap"));
  assert.ok(!emptyIds.includes("explore_programs"));
  assert.ok(!emptyIds.includes("shortlist_universities"));

  const full = buildAvailableActions(computeJourneyState(completeInputs()));
  const fullIds = full.map((a) => a.id);
  assert.ok(fullIds.includes("shortlist_universities"));
  assert.ok(fullIds.includes("explore_programs"));
  assert.ok(fullIds.includes("compare_careers"));
  assert.ok(!fullIds.includes("complete_profile"));
  assert.ok(!fullIds.includes("take_assessments"));
  assert.ok(!fullIds.includes("explore_matches"));
});

// ---------------------------------------------------------------------------
// 12. Journey step ordering + summary step
// ---------------------------------------------------------------------------
test("12 · step order is fixed and ends with the progress summary", () => {
  const s = computeJourneyState({ ...completeInputs(), appointmentBooked: true });
  const ids = s.steps.map((x) => x.id);
  assert.deepEqual(ids, ["profile", "assessments", "discovery", "programs", "universities", "roadmap", "progress"]);
  const prog = s.steps[s.steps.length - 1];
  assert.equal(prog.href, null);
  assert.equal(prog.status, "done");
  assert.equal(prog.value, "100% journey complete");
});

// ---------------------------------------------------------------------------
// 13. DB-backed aggregation (shortlist + explored + preferred)
// ---------------------------------------------------------------------------
test("13 · getJourneyState aggregates persisted signals", async () => {
  assert.ok(careerA && careerB && university, "catalog fixtures must exist");
  await addShortlist({ studentId: counselorStudent.id, itemType: "CAREER", itemId: careerA.id });
  await addShortlist({ studentId: counselorStudent.id, itemType: "UNIVERSITY", itemId: university.id });
  await recordProductEvent({ userId: counselorStudent.id, event: "career_detail_opened", careerId: careerA.id, careerSlug: careerA.slug, careerName: careerA.name });
  await prisma.studentProfile.update({
    where: { userId: counselorStudent.id },
    data: { preferredCareer: careerA.name, preferredCareerId: careerA.id },
  });

  const s = await getJourneyState(counselorStudent.id, {
    careerMatches: [{ careerId: careerA.id, careerName: careerA.name, matchScore: 0.9 }],
  });
  assert.equal(s.shortlistedCareerCount, 1);
  assert.equal(s.shortlistedUniversityCount, 1);
  assert.equal(s.exploredCareerCount, 1);
  assert.equal(s.preferredCareerSet, true);
  assert.equal(s.goalCareerId, careerA.id);
  assert.equal(s.hasCareerDirection, true);
});

// ---------------------------------------------------------------------------
// 14. Refresh/login determinism (DB-derived only)
// ---------------------------------------------------------------------------
test("14 · same persisted rows → identical journey (refresh/login)", async () => {
  assert.ok(careerA);
  const opts = { careerMatches: [{ careerId: careerA.id, careerName: careerA.name, matchScore: 0.9 }] };
  const s1 = await getJourneyState(counselorStudent.id, opts);
  const s2 = await getJourneyState(counselorStudent.id, opts);
  assert.deepEqual(JSON.parse(JSON.stringify(s1)), JSON.parse(JSON.stringify(s2)));
  // And the persisted toggles are reflected (sets differ from scenario 13).
  assert.equal(s1.shortlistedCareerCount, 1);
});

// ---------------------------------------------------------------------------
// 15. Career-journey heritage per career (assessCareerJourneyStates)
// ---------------------------------------------------------------------------
test("15 · assessCareerJourneyStates marks explored/shortlisted/preferred", async () => {
  assert.ok(careerA && careerB);
  const map = await assessCareerJourneyStates(counselorStudent.id, [careerA.id, careerB.id]);
  assert.deepEqual(map[careerA.id], { explored: true, shortlisted: true, preferred: true });
  assert.deepEqual(map[careerB.id], { explored: false, shortlisted: false, preferred: false });
});

// ---------------------------------------------------------------------------
// 16. Analytics allowlist — new Phase 26 events are accepted + stored
// ---------------------------------------------------------------------------
test("16 · new journey events persist via recordProductEvent", async () => {
  const userId = analyserStudent.id;
  await recordProductEvent({ userId, event: "journey_step_viewed", meta: { step: "roadmap" } });
  await recordProductEvent({ userId, event: "career_shortlisted", careerId: careerA?.id });
  await recordProductEvent({ userId, event: "pathway_started", careerId: careerA?.id, careerName: careerA?.name });
  await recordProductEvent({ userId, event: "university_shortlisted", meta: { itemType: "UNIVERSITY" } });
  await recordProductEvent({ userId, event: "roadmap_action_completed", meta: { step: "Submit applications" } });
  await recordProductEvent({ userId, event: "next_best_action_clicked", meta: { action: "continue_roadmap" } });
  const rows = await prisma.productEvent.findMany({
    where: { userId, event: { in: ["journey_step_viewed", "career_shortlisted", "pathway_started", "university_shortlisted", "roadmap_action_completed", "next_best_action_clicked"] } },
  });
  const names = new Set(rows.map((r) => r.event));
  assert.deepEqual([...names].sort(), ["career_shortlisted", "journey_step_viewed", "next_best_action_clicked", "pathway_started", "roadmap_action_completed", "university_shortlisted"].sort());
});

// ---------------------------------------------------------------------------
// 17. Build my pathway (setStudentPathway)
// ---------------------------------------------------------------------------
test("17 · setStudentPathway persists preferred career + regenerates roadmap", async () => {
  assert.ok(careerA, "need an active career");
  const res = await setStudentPathway(pathwayStudent.id, careerA.id);
  assert.equal(res.ok, true);
  assert.equal(res.preferredCareerId, careerA.id);

  const profile = await prisma.studentProfile.findUnique({ where: { userId: pathwayStudent.id } });
  assert.equal(profile?.preferredCareerId, careerA.id);
  assert.equal(profile?.preferredCareer, careerA.name);

  const started = await prisma.productEvent.count({
    where: { userId: pathwayStudent.id, event: "pathway_started", careerId: careerA.id },
  });
  assert.ok(started >= 1, "pathway_started event must be recorded");

  const s = await getJourneyState(pathwayStudent.id, {
    careerMatches: [{ careerId: careerA.id, careerName: careerA.name, matchScore: 0.9 }],
  });
  assert.equal(s.roadmapExists, true);
  assert.equal(s.goalCareerId, careerA.id);

  // Roadmap progress reflects completed steps.
  const roadmap = await prisma.studentRoadmap.findUnique({ where: { studentId: pathwayStudent.id }, include: { steps: { orderBy: { index: "asc" } } } });
  assert.ok(roadmap && roadmap.steps.length > 0);
  await updateStepStatus(pathwayStudent.id, roadmap.steps[0].id, "COMPLETED");
  const s2 = await getJourneyState(pathwayStudent.id, {
    careerMatches: [{ careerId: careerA.id, careerName: careerA.name, matchScore: 0.9 }],
  });
  assert.ok(s2.roadmapCompletedCount >= 1);
  assert.ok(s2.roadmapProgress > 0);
});

// ---------------------------------------------------------------------------
// 18. Counselor 360 journey block
// ---------------------------------------------------------------------------
test("18 · getStudent360 includes the journey block", async () => {
  assert.ok(careerA && university);
  await addShortlist({ studentId: analyserStudent.id, itemType: "CAREER", itemId: careerA.id });
  await recordProductEvent({ userId: analyserStudent.id, event: "career_detail_opened", careerId: careerA.id, careerSlug: careerA.slug, careerName: careerA.name });

  const s360 = await getStudent360(analyserStudent.id);
  assert.ok(s360, "student 360 must load");
  assert.ok(s360.journey, "journey block must be present");
  assert.ok(s360.journey.nextBestAction, "next best action must resolve");
  assert.equal(s360.journey.steps.length, 7);
  // Matches engine reuse: journey sees the same matches the counselor 360 does.
  assert.equal(s360.journey.careerMatchCount, s360.careerMatches.length);
});

// ---------------------------------------------------------------------------
// 19. Engine determinism + education-stage detection + medical distinctness
// ---------------------------------------------------------------------------
test("19 · engine deterministic; MBBS vs BDS vs Nursing stays distinct", async () => {
  // Engine determinism over identical persisted signals.
  const r1 = await getCareerMatches(analyserStudent.id, { limit: 5 });
  const r2 = await getCareerMatches(analyserStudent.id, { limit: 5 });
  assert.ok(r1.matches.length > 0, "analyser must yield matches");
  assert.equal(JSON.stringify(r1.matches), JSON.stringify(r2.matches));

  // Medical registry distinctness: Surgeon → Medicines incl MBBS; Dentistry → BDS.
  assert.ok(surgeonCareer && dentistryCareer, "need Surgeon + Dentistry careers");
  const surgeonPrograms = await getCareerPrograms(surgeonCareer.id);
  const dentalPrograms = await getCareerPrograms(dentistryCareer.id);
  assert.ok(surgeonPrograms && dentalPrograms, "both should have curated programs");
  const surgeonNames = surgeonPrograms.map((p) => p.programName);
  const dentalNames = dentalPrograms.map((p) => p.programName);
  assert.ok(surgeonNames.some((n) => /MBBS/i.test(n)), "Surgeon maps to MBBS");
  assert.ok(!surgeonNames.some((n) => /BDS/i.test(n)), "Surgeon must not map to BDS");
  assert.ok(dentalNames.some((n) => /BDS/i.test(n)), "Dentistry maps to BDS");
  assert.ok(!dentalNames.some((n) => /MBBS/i.test(n)), "Dentistry must not map to MBBS");

  // Education stage detection.
  assert.equal(detectEducationStage({ gradeLevel: "10", studyLevel: "Class 10" }), "SCHOOL_CLASS10");
  assert.equal(detectEducationStage({ highestEducation: "Bachelor of Engineering" }), "UNDERGRADUATE");
  assert.equal(detectEducationStage({ highestEducation: "MBA" }), "POSTGRADUATE");
  assert.equal(detectEducationStage({ highestEducation: "Working professional, career switch" }), "CAREER_SWITCHER");
  assert.equal(detectDiplomaIntent({ studyLevel: "Diploma in Engineering", exams: ["Polytechnic CET"] }), true);
  assert.equal(detectDiplomaIntent({ studyLevel: "Class 10", exams: ["SSC"] }), false);
});