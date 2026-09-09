// Phase 27 — Counselor command center + student 360 action planning.
//
// Cover (Parts 21 map):
//   1–4    attention-state goldens (pure): empty → follow-up due, stale roadmap,
//          complete → READY_FOR_COUNSELOR_REVIEW
//   5      follow-up bucket (pure)
//   6      command-center counts from a seeded roster (8 persisted counts)
//   7      counselor scope isolation (assigned only) + tenant visibility
//   8      decisions do NOT overwrite StudentProfile.preferredCareerId
//   9      career decision + program plan upsert/list via planning service
//   10     getStudent360 exposes attention + decisions + plans, journey intact
//   11     noSelectedPathway vs decided pathway  (decision.drives direction)
//   12     withCareerRecommendations proxy (career profile level != EMPTY)
//   13     roadmap progress contributes to roadmapInProgress only mid-range
//   14     university shortlist counts (UNIVERSITY + INDIAN_INSTITUTION)
//   15     assessment/profile incomplete counts
//   16     deterministic re-runs (persisted-only, no engine narratives leaked)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  attentionStates,
  primaryAttention,
  bucketFollowUps,
  ATTENTION_STATES,
} from "../src/lib/counselor/attention.ts";
import { getCounselorCommandCenter } from "../src/lib/counselor/command-center.ts";
import {
  listCareerDecisions,
  upsertCareerDecision,
  listProgramPlans,
  upsertProgramPlan,
} from "../src/lib/counselor/planning.ts";
import { getStudent360 } from "../src/lib/counselor/student360.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant, counselor, otherCounselor;
let counselorProfile, otherCounselorProfile;
let profileA, profileB, profileC, profileD; // StudentProfile ids
let careerA, programA;
const students = { a: null, b: null, c: null, d: null };

function overview(over) {
  return {
    profileCompleteness: 100,
    assessmentCompletedCount: 5,
    assessmentTotal: 5,
    hasCareerDirection: true,
    roadmapExists: true,
    roadmapProgress: 50,
    roadmapStaleDays: 0,
    universityShortlistCount: 1,
    hasOpenAction: false,
    openActionDueInDays: null,
    openActionCount: 0,
    educationStage: "UNDERGRADUATE",
    targetCountry: "US",
    ...over,
  };
}

async function mkUser(tag) {
  return prisma.user.create({
    data: {
      email: `ph27-${tag}-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "PH27",
      lastName: tag,
      role: "STUDENT",
      tenantId: tenant.id,
      lastSeen: new Date(),
    },
  });
}

async function fullProfile(userId) {
  return prisma.studentProfile.create({
    data: {
      userId,
      gradeLevel: "11th",
      studyLevel: "School",
      nationality: "India",
      state: "Karnataka",
      targetCountry: "US",
      highestEducation: "Class 10",
      averageGrade: "A",
      gender: "Other",
      dateOfBirth: new Date("2008-01-01"),
      mobile: "9999999999",
    },
  });
}

before(async () => {
  tenant = await prisma.tenant.create({
    data: { name: "PH27", slug: `ph27-${suffix}`, subdomain: `ph27-${suffix}` },
  });
  const plan = await prisma.subscriptionPlan.upsert({
    where: { planType: "TRIAL" },
    update: {},
    create: { name: "Trial", planType: "TRIAL" },
  });
  await prisma.subscription.create({
    data: { tenantId: tenant.id, planId: plan.id, status: "TRIAL" },
  });

  counselor = await prisma.user.create({
    data: {
      email: `ph27-counselor-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "PH27",
      lastName: "Counselor",
      role: "COUNSELOR",
      tenantId: tenant.id,
    },
  });
  otherCounselor = await prisma.user.create({
    data: {
      email: `ph27-other-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "PH27",
      lastName: "Other",
      role: "COUNSELOR",
      tenantId: tenant.id,
    },
  });
  counselorProfile = await prisma.counselorProfile.create({ data: { userId: counselor.id } });
  otherCounselorProfile = await prisma.counselorProfile.create({ data: { userId: otherCounselor.id } });

  // Student A — full profile, all 5 assessments, roadmap stalled, 1 shortlist,
  // 1 completed action, career profile DEVELOPING.
  students.a = await mkUser("alpha");
  profileA = await fullProfile(students.a.id);
  await prisma.studentProfile.update({
    where: { id: profileA.id },
    data: { counselorId: counselorProfile.id },
  });
  await seedAssignments(students.a.id, 5);
  const roadmapA = await prisma.studentRoadmap.create({
    data: {
      studentId: students.a.id,
      goalCareerId: null,
      goalCareerName: null,
      educationStage: "UNDERGRADUATE",
      progress: 30,
      destination: "US",
    },
  });
  // Make it stale for ROADMAP_STALLED (>= 14 days without activity).
  await prisma.$executeRawUnsafe(
    `UPDATE "StudentRoadmap" SET "updatedAt" = now() - interval '20 days' WHERE id = $1`,
    roadmapA.id
  );
  await prisma.studentShortlist.create({
    data: { studentId: students.a.id, itemType: "UNIVERSITY", itemId: "uni-a-1" },
  });
  await prisma.counselorAction.create({
    data: {
      studentId: profileA.id,
      counselorId: counselor.id,
      type: "CAREER_REVIEW",
      title: "Completed review",
      completed: true,
    },
  });
  await prisma.studentCareerProfile.create({
    data: { studentId: students.a.id, completeness: 70, level: "DEVELOPING" },
  });

  // Student B — partial profile, 2/5 assessments, no roadmap, open action
  // due tomorrow (follow-up), career profile EMPTY.
  students.b = await mkUser("beta");
  profileB = await prisma.studentProfile.create({
    data: {
      userId: students.b.id,
      counselorId: counselorProfile.id,
      gradeLevel: "11th",
      nationality: "India",
      highestEducation: "Class 10",
      mobile: "8888888888",
      targetCountry: "UK",
    },
  });
  await seedAssignments(students.b.id, 2);
  await prisma.counselorAction.create({
    data: {
      studentId: profileB.id,
      counselorId: counselor.id,
      type: "STUDENT_FOLLOW_UP",
      title: "Discuss options",
      dueDate: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });
  await prisma.studentCareerProfile.create({
    data: { studentId: students.b.id, completeness: 0, level: "EMPTY" },
  });

  // Student C — full profile, 5/5, roadmap complete, preferred career + a
  // counselor decision, shortlists, COMPLETE career profile, no actions.
  students.c = await mkUser("gamma");
  profileC = await fullProfile(students.c.id);
  await prisma.studentProfile.update({
    where: { id: profileC.id },
    data: { counselorId: counselorProfile.id },
  });
  careerA = await prisma.career.findFirst({ where: { isActive: true }, select: { id: true, name: true } });
  await prisma.studentProfile.update({
    where: { id: profileC.id },
    data: {
      preferredCareerId: careerA.id,
      preferredCareer: careerA.name,
      careerPrefsFilled: true,
    },
  });
  await seedAssignments(students.c.id, 5);
  await prisma.studentRoadmap.create({
    data: {
      studentId: students.c.id,
      goalCareerId: careerA.id,
      goalCareerName: careerA.name,
      educationStage: "UNDERGRADUATE",
      progress: 100,
      destination: "US",
    },
  });
  await prisma.studentShortlist.createMany({
    data: [
      { studentId: students.c.id, itemType: "UNIVERSITY", itemId: "uni-c-1" },
      { studentId: students.c.id, itemType: "INDIAN_INSTITUTION", itemId: "col-c-1" },
    ],
  });
  await prisma.studentCareerProfile.create({
    data: { studentId: students.c.id, completeness: 95, level: "COMPLETE" },
  });
  const mapping = await prisma.careerProgramMapping.findFirst({
    where: { careerId: careerA.id },
    select: { programId: true },
  });
  programA = mapping?.programId ?? "prog-c-1";

  // Student D — full profile but 0 assessments, no roadmap, no decision.
  students.d = await mkUser("delta");
  profileD = await fullProfile(students.d.id);
  await prisma.studentProfile.update({
    where: { id: profileD.id },
    data: { counselorId: counselorProfile.id },
  });

  // Phase 27 planning records for student C (decision must not touch
  // preferredCareerId; plan flags sit on the canonical program).
  await upsertCareerDecision({
    studentProfileId: profileC.id,
    createdById: counselor.id,
    careerId: careerA.id,
    discussed: true,
    studentInterest: true,
    shortlistedCareer: true,
    selectedPathway: true,
    followUpRequired: false,
    counselorRecommendation: "Aligned with assessment evidence",
    note: "Discussed during intake",
  });
  await upsertProgramPlan({
    studentProfileId: profileC.id,
    createdById: counselor.id,
    careerId: careerA.id,
    programId: programA,
    discussed: true,
    shortlisted: true,
    requiresResearch: false,
    studentInterested: true,
  });
});

async function seedAssignments(studentUserId, count) {
  const kinds = ["stream", "ideal", "personality", "intelligences", "learning"];
  for (let i = 0; i < count; i++) {
    await prisma.testAssignment.create({
      data: {
        tenantId: tenant.id,
        studentId: studentUserId,
        assignedById: counselor.id,
        kind: kinds[i % kinds.length],
        token: `ph27-${suffix}-${studentUserId}-${i}`,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }
}

after(async () => {
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
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: `ph27-${suffix}` } } });
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1. Empty state → operand order
// ---------------------------------------------------------------------------
test("1 · empty student: priority is roadmap-not-started, follow-up due ranks first when present", () => {
  const base = overview({
    profileCompleteness: 0,
    assessmentCompletedCount: 0,
    hasCareerDirection: false,
    roadmapExists: false,
    roadmapStaleDays: null,
    universityShortlistCount: 0,
    openActionCount: 1,
    hasOpenAction: true,
    openActionDueInDays: 2,
  });
  const states = attentionStates(base);
  assert.equal(states[0], "FOLLOW_UP_DUE");
  assert.ok(states.includes("ROADMAP_NOT_STARTED"));
  assert.ok(states.includes("PROFILE_INCOMPLETE"));
  assert.ok(states.includes("ASSESSMENT_INCOMPLETE"));
  assert.ok(states.includes("NO_CLEAR_PATHWAY"));
  assert.equal(primaryAttention(base), "FOLLOW_UP_DUE");
});

// ---------------------------------------------------------------------------
// 2. Stalled roadmap
// ---------------------------------------------------------------------------
test("2 · stale mid-progress roadmap → ROADMAP_STALLED; fresh one is not stalled", () => {
  const stale = overview({ roadmapProgress: 30, roadmapStaleDays: 20 });
  assert.ok(attentionStates(stale).includes("ROADMAP_STALLED"));
  assert.equal(primaryAttention(stale), "ROADMAP_STALLED");
  const fresh = overview({ roadmapProgress: 30, roadmapStaleDays: 1 });
  assert.ok(!attentionStates(fresh).includes("ROADMAP_STALLED"));
});

// ---------------------------------------------------------------------------
// 3. University shortlist missing while on a pathway
// ---------------------------------------------------------------------------
test("3 · pathway started but no universities → UNIVERSITY_SHORTLIST_MISSING", () => {
  const states = attentionStates(
    overview({ roadmapProgress: 20, universityShortlistCount: 0 })
  );
  assert.ok(states.includes("UNIVERSITY_SHORTLIST_MISSING"));
  assert.ok(
    !attentionStates(
      overview({ roadmapProgress: 100, universityShortlistCount: 0 })
    ).includes("UNIVERSITY_SHORTLIST_MISSING")
  );
});

// ---------------------------------------------------------------------------
// 4. Ready for counselor review
// ---------------------------------------------------------------------------
test("4 · journey-complete student is READY_FOR_COUNSELOR_REVIEW (and only that)", () => {
  const states = attentionStates(overview({}));
  assert.deepEqual(states, ["READY_FOR_COUNSELOR_REVIEW"]);
  assert.equal(primaryAttention(overview({})), "READY_FOR_COUNSELOR_REVIEW");
  assert.ok(ATTENTION_STATES.includes("READY_FOR_COUNSELOR_REVIEW"));
});

// ---------------------------------------------------------------------------
// 5. Follow-up buckets
// ---------------------------------------------------------------------------
test("5 · bucketFollowUps splits overdue/today/week/completed deterministically", () => {
  const now = new Date(2026, 0, 10, 12, 0, 0); // Sat Jan 10 2026
  const b = bucketFollowUps(
    [
      { dueDate: new Date(2026, 0, 9, 8, 0, 0), completed: false }, // overdue
      { dueDate: new Date(2026, 0, 10, 9, 0, 0), completed: false }, // today
      { dueDate: new Date(2026, 0, 15, 9, 0, 0), completed: false }, // this week
      { dueDate: new Date(2026, 0, 20, 9, 0, 0), completed: false }, // beyond week
      { dueDate: new Date(2026, 0, 5, 9, 0, 0), completed: true }, // completed
      { dueDate: null, completed: false },
    ],
    now
  );
  assert.deepEqual(b, { overdue: 1, dueToday: 1, dueThisWeek: 1, completed: 1 });
});

// ---------------------------------------------------------------------------
// 6. Command center — 8 persisted counts
// ---------------------------------------------------------------------------
test("6 · dashboard counts from seeded roster (counselor scope)", async () => {
  const cc = await getCounselorCommandCenter({ tenantId: tenant.id, counselorUserId: counselor.id });
  assert.equal(cc.counts.totalStudents, 4);
  assert.equal(cc.counts.needsFollowUp, 1); // beta
  assert.equal(cc.counts.assessmentsIncomplete, 2); // beta (2), delta (0)
  assert.equal(cc.counts.profilesIncomplete, 1); // beta
  assert.equal(cc.counts.withCareerRecommendations, 2); // alpha (DEVELOPING), gamma (COMPLETE)
  assert.equal(cc.counts.noSelectedPathway, 2); // beta, delta
  assert.equal(cc.counts.roadmapInProgress, 1); // alpha (30), gamma is 100
  assert.equal(cc.counts.requireCounselorAction, 3); // alpha, beta, delta (gamma ready)
});

// ---------------------------------------------------------------------------
// 7. Scope isolation
// ---------------------------------------------------------------------------
test("7 · other counselor sees nothing; tenant scope sees the roster", async () => {
  const none = await getCounselorCommandCenter({ tenantId: tenant.id, counselorUserId: otherCounselor.id });
  assert.equal(none.counts.totalStudents, 0);
  const all = await getCounselorCommandCenter({ tenantId: tenant.id });
  assert.equal(all.counts.totalStudents, 4);
});

// ---------------------------------------------------------------------------
// 8. Decision never overwrites preferredCareerId
// ---------------------------------------------------------------------------
test("8 · career decision record leaves StudentProfile.preferredCareerId unchanged", async () => {
  const p = await prisma.studentProfile.findUnique({ where: { id: profileC.id }, select: { preferredCareerId: true } });
  assert.equal(p?.preferredCareerId, careerA.id);
  // A DISAGREEING recommendation on a DIFFERENT career must still not touch it.
  const other = await prisma.career.findFirst({ where: { isActive: true, id: { not: careerA.id } }, select: { id: true } });
  await upsertCareerDecision({
    studentProfileId: profileC.id,
    createdById: counselor.id,
    careerId: other.id,
    selectedPathway: false,
    note: "Discuss further",
  });
  const p2 = await prisma.studentProfile.findUnique({ where: { id: profileC.id }, select: { preferredCareerId: true } });
  assert.equal(p2?.preferredCareerId, careerA.id);
});

// ---------------------------------------------------------------------------
// 9. Planning service round-trips
// ---------------------------------------------------------------------------
test("9 · upsert/list career decisions and program plans", async () => {
  const decisions = await listCareerDecisions(profileC.id);
  assert.ok(decisions.length >= 1);
  const d = decisions.find((x) => x.careerId === careerA.id);
  assert.equal(d?.selectedPathway, true);
  assert.equal(d?.counselorRecommendation, "Aligned with assessment evidence");

  const plans = await listProgramPlans(profileC.id);
  assert.ok(plans.length >= 1);
  const p = plans.find((x) => x.programId === programA);
  assert.equal(p?.shortlisted, true);
  assert.equal(p?.studentInterested, true);
  // Upserting again with a change updates, not duplicates.
  await upsertProgramPlan({
    studentProfileId: profileC.id,
    createdById: counselor.id,
    careerId: careerA.id,
    programId: programA,
    requiresResearch: true,
  });
  const after = await listProgramPlans(profileC.id);
  const updated = after.filter((x) => x.programId === programA);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].requiresResearch, true);
});

// ---------------------------------------------------------------------------
// 10. Student 360 includes attention + planning + journey
// ---------------------------------------------------------------------------
test("10 · getStudent360 exposes attention, decisions, plans (journey intact)", async () => {
  const s360 = await getStudent360(students.c.id, { counselorUserId: counselor.id });
  assert.ok(s360);
  assert.equal(s360.attention.primary, "READY_FOR_COUNSELOR_REVIEW");
  assert.ok(Array.isArray(s360.careerDecisions));
  assert.ok(s360.careerDecisions.some((d) => d.careerId === careerA.id && d.selectedPathway));
  assert.ok(s360.programPlans.some((p) => p.programId === programA && p.shortlisted));
  assert.ok(s360.journey, "journey block must still be present");

  const stalled = await getStudent360(students.a.id, { counselorUserId: counselor.id });
  assert.equal(stalled.attention.primary, "ROADMAP_STALLED");
  assert.ok(stalled.attention.lastActivityAt);
});

// ---------------------------------------------------------------------------
// 11. NoSelectedPathway reflects actual direction decisions
// ---------------------------------------------------------------------------
test("11 · decided-pathway student never counts as noSelectedPathway", async () => {
  const cc = await getCounselorCommandCenter({ tenantId: tenant.id, counselorUserId: counselor.id });
  const gamma = cc.students.find((s) => s.userId === students.c.id);
  assert.ok(gamma);
  assert.ok(!gamma.states.includes("NO_CLEAR_PATHWAY"));
  assert.equal(gamma.decidedCareerId, careerA.id);
  assert.equal(gamma.preferredCareer, careerA.name);
});

// ---------------------------------------------------------------------------
// 12. withCareerRecommendations proxy
// ---------------------------------------------------------------------------
test("12 · recommendations proxy = career profile level != EMPTY", async () => {
  const cc = await getCounselorCommandCenter({ tenantId: tenant.id });
  const byId = new Map(cc.students.map((s) => [s.userId, s]));
  assert.equal(byId.get(students.c.id).hasCareerRecommendations, true);
  assert.equal(byId.get(students.a.id).hasCareerRecommendations, true);
  assert.equal(byId.get(students.b.id).hasCareerRecommendations, false);
  assert.equal(byId.get(students.d.id).hasCareerRecommendations, false);
});

// ---------------------------------------------------------------------------
// 13. Roadmap progress
// ---------------------------------------------------------------------------
test("13 · roadmap progress → in-progress only when 0 < p < 100", async () => {
  const cc = await getCounselorCommandCenter({ tenantId: tenant.id, counselorUserId: counselor.id });
  const byId = new Map(cc.students.map((s) => [s.userId, s]));
  assert.equal(byId.get(students.a.id).roadmapProgress, 30);
  assert.equal(byId.get(students.c.id).roadmapProgress, 100);
  assert.equal(byId.get(students.c.id).roadmapExists, true);
  assert.equal(byId.get(students.b.id).roadmapExists, false);
});

// ---------------------------------------------------------------------------
// 14. University shortlist counts
// ---------------------------------------------------------------------------
test("14 · shortlisted universities counted (UNIVERSITY + INDIAN_INSTITUTION)", async () => {
  const cc = await getCounselorCommandCenter({ tenantId: tenant.id, counselorUserId: counselor.id });
  const byId = new Map(cc.students.map((s) => [s.userId, s]));
  assert.equal(byId.get(students.c.id).shortlistedUniversities, 2);
  assert.equal(byId.get(students.a.id).shortlistedUniversities, 1);
  assert.equal(byId.get(students.b.id).shortlistedUniversities, 0);
});

// ---------------------------------------------------------------------------
// 15. Assessment & profile completeness
// ---------------------------------------------------------------------------
test("15 · incomplete assessment/profile counts", async () => {
  const cc = await getCounselorCommandCenter({ tenantId: tenant.id, counselorUserId: counselor.id });
  const byId = new Map(cc.students.map((s) => [s.userId, s]));
  assert.equal(byId.get(students.a.id).assessmentCompleted, 5);
  assert.equal(byId.get(students.b.id).assessmentCompleted, 2);
  assert.equal(byId.get(students.d.id).assessmentCompleted, 0);
  assert.ok(byId.get(students.b.id).profileCompleteness < 60, "beta profile is partial");
  assert.ok(byId.get(students.c.id).profileCompleteness >= 60);
});

// ---------------------------------------------------------------------------
// 16. Determinism — two runs agree; no engine match scores leak
// ---------------------------------------------------------------------------
test("16 · command center is deterministic and engine-free", async () => {
  const c1 = await getCounselorCommandCenter({ tenantId: tenant.id, counselorUserId: counselor.id });
  const c2 = await getCounselorCommandCenter({ tenantId: tenant.id, counselorUserId: counselor.id });
  assert.deepEqual(c1.counts, c2.counts);
  assert.deepEqual(c1.followUps, c2.followUps);
  const blob = JSON.stringify(c1);
  assert.ok(!blob.includes("matchScore"), "persisted-only view must not expose engine scores");
  assert.ok(!blob.includes("confidenceScore"));
  // Follow-up bucket reflects beta's open due-tomorrow action + alpha's completed one.
  assert.equal(c1.followUps.dueThisWeek, 1);
  assert.equal(c1.followUps.completed, 1);
});