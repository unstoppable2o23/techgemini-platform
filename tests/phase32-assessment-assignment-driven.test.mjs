/**
 * P1 · Assessments are counsellor-assignment-driven (not a fixed mandatory 5).
 *
 * Covers the pure summary/clarity semantics and the DB-backed loaders:
 *   - denominators come from ASSIGNED kinds, never a hardcoded 5
 *   - ASSIGNED / IN_PROGRESS / COMPLETED lifecycle
 *   - zero-assignment students are complete-by-default (never blocked/nagged)
 *   - decision center / command center derive totals from assigned suites
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

import {
  ASSESSMENT_KINDS,
  summarizeAssignments,
  summarizeAssignmentsByStudent,
  getAssessmentSummary,
} from "../src/lib/student/assessments.ts";
import { getStudentBasics } from "../src/lib/student/basics.ts";
import { getJourneyState, computeJourneyState } from "../src/lib/student/journey-state.ts";
import { getCounselorCommandCenter } from "../src/lib/counselor/command-center.ts";
import { getStudent360 } from "../src/lib/counselor/student360.ts";
import { calculateAssessmentCompleteness } from "../src/lib/career-profile/completeness.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant, student, counselor, studentProfile, counselorProfile;

// ---------------------------------------------------------------------------
// Pure semantics
// ---------------------------------------------------------------------------
test("1 · summarizeAssignments uses the ASSIGNED suite as denominator", () => {
  const s = summarizeAssignments([
    { kind: "stream", status: "COMPLETED" },
    { kind: "ideal", status: "IN_PROGRESS" },
    { kind: "personality", status: "ASSIGNED" },
  ]);
  assert.equal(s.assignedTotal, 3);
  assert.equal(s.completedCount, 1);
  assert.deepEqual(s.completedKinds, ["stream"]);
  assert.deepEqual(s.inProgressKinds, ["ideal"]);
  assert.deepEqual(s.notStartedKinds, ["personality"]);
  assert.equal(s.hasAssignments, true);
  assert.equal(s.assignedTotal, 3);
});

test("2 · empty suite (nothing assigned) is never incomplete", () => {
  const s = summarizeAssignments([]);
  assert.equal(s.assignedTotal, 0);
  assert.equal(s.completedCount, 0);
  assert.equal(s.hasAssignments, false);
});

test("3 · duplicate rows for a kind collapse to one assigned kind", () => {
  const s = summarizeAssignments([
    { kind: "stream", status: "COMPLETED" },
    { kind: "stream", status: "IN_PROGRESS" }, // retake
  ]);
  assert.equal(s.assignedTotal, 1);
  assert.equal(s.completedCount, 1);
  assert.deepEqual(s.inProgressKinds, []);
});

test("4 · summarizeAssignmentsByStudent groups rows per student", () => {
  const byStudent = summarizeAssignmentsByStudent([
    { studentId: "a", kind: "stream", status: "COMPLETED" },
    { studentId: "a", kind: "ideal", status: "ASSIGNED" },
    { studentId: "b", kind: "personality", status: "IN_PROGRESS" },
  ]);
  assert.equal(byStudent.size, 2);
  assert.equal(byStudent.get("a")?.assignedTotal, 2);
  assert.equal(byStudent.get("a")?.completedCount, 1);
  assert.equal(byStudent.get("b")?.assignedTotal, 1);
  assert.deepEqual(byStudent.get("b")?.inProgressKinds, ["personality"]);
  assert.equal(byStudent.has("missing"), false);
});

test("5 · calculateAssessmentCompleteness honors the assigned suite", () => {
  assert.equal(calculateAssessmentCompleteness(["stream"], ["stream", "ideal"]).score, 50);
  assert.equal(calculateAssessmentCompleteness(["stream"], ["stream"]).score, 100);
  assert.equal(calculateAssessmentCompleteness([]).score, 0); // nothing done of full catalogue
  const none = calculateAssessmentCompleteness([], []);
  assert.equal(none.score, 100); // empty assigned suite is fully complete
  assert.deepEqual(none.missing, []);
});

test("6 · journey assessments step: zero-assignment done, 1/2 partial", () => {
  const s = computeJourneyState({
    profileCompleteness: 60,
    assessmentCompletedCount: 0,
    assessmentTotal: 0,
    careerMatches: [],
  });
  const step = s.steps.find((x) => x.id === "assessments");
  assert.equal(step.status, "done");
  assert.equal(step.value, "No assessments assigned");
  assert.equal(step.progress, 100);

  const p = computeJourneyState({
    profileCompleteness: 60,
    assessmentCompletedCount: 1,
    assessmentTotal: 2,
    careerMatches: [],
  });
  const pStep = p.steps.find((x) => x.id === "assessments");
  assert.equal(pStep.value, "1/2 completed");
  assert.equal(pStep.progress, 50);
  assert.notEqual(pStep.status, "done");
});

// ---------------------------------------------------------------------------
// DB loaders
// ---------------------------------------------------------------------------
test("7 · getAssessmentSummary is empty-safe for unknown users", async () => {
  const summary = await getAssessmentSummary("__no_such_user__");
  assert.equal(summary.assignedTotal, 0);
});

test("8 · getStudentBasics reflects assigned-driven totals", async () => {
  const basics = await getStudentBasics(student.id);
  assert.equal(basics.assessmentCompletedCount, 1);
  assert.equal(basics.assessmentTotal, 3);
  assert.equal(basics.assessmentProgress.length, ASSESSMENT_KINDS.length);
  const stream = basics.assessmentProgress.find((x) => x.kind === "stream");
  const ideal = basics.assessmentProgress.find((x) => x.kind === "ideal");
  const learning = basics.assessmentProgress.find((x) => x.kind === "learning");
  assert.equal(stream?.status, "COMPLETED");
  assert.equal(ideal?.status, "IN_PROGRESS");
  assert.equal(learning?.status, "ASSIGNED");
});

test("9 · getJourneyState builds totals from assigned rows (null-safe default)", async () => {
  const journey = await getJourneyState(student.id);
  assert.ok(journey.assessmentTotal >= 3);
});

test("10 · command center row uses assigned denominators", async () => {
  const cc = await getCounselorCommandCenter({
    tenantId: tenant.id,
    counselorUserId: counselor.id,
  });
  const row = cc.students.find((s) => s.userId === student.id);
  assert.ok(row);
  assert.equal(row.assessmentCompleted, 1);
  assert.equal(row.assessmentTotal, 3);
  assert.ok(row.states.includes("ASSESSMENT_INCOMPLETE")); // 1 of 3 assigned left
});

test("11 · student360 uses assigned suite and exposes in-progress flags", async () => {
  const s360 = await getStudent360(student.id);
  assert.equal(s360.assessmentAssignedCount, 3);
  assert.equal(s360.assessmentTotal, 3);
  assert.equal(s360.assessmentCompletedCount, 1);
  assert.equal(s360.assessmentByKind.ideal.inProgress, true);
  assert.equal(s360.assessmentByKind.learning.completed, false);
  assert.equal(s360.assessmentByKind.learning.inProgress, false);
});

test("12 · zero-assignment student is NOT assessment-incomplete anywhere", async () => {
  await prisma.$transaction(async (tx) => {
    // second student, no assignments at all
    const u2 = await tx.user.create({
      data: {
        email: `ph32-none-${suffix}@x.com`,
        passwordHash: "x",
        firstName: "PH32",
        lastName: "None",
        role: "STUDENT",
        tenantId: tenant.id,
      },
    });
    await tx.studentProfile.create({
      data: {
        userId: u2.id,
        counselorId: counselorProfile.id,
        gradeLevel: "11th",
        nationality: "India",
        highestEducation: "Class 10",
        mobile: "7777777777",
      },
    });
    tests.noneStudentId = u2.id;
  });
  try {
    const basics = await getStudentBasics(tests.noneStudentId);
    assert.equal(basics.assessmentTotal, 0);
    assert.equal(basics.assessmentCompletedCount, 0);
    assert.ok(!basics.assessmentProgress.some((x) => x.assigned));

    const cc = await getCounselorCommandCenter({
      tenantId: tenant.id,
      counselorUserId: counselor.id,
    });
    const row = cc.students.find((s) => s.userId === tests.noneStudentId);
    assert.ok(row);
    assert.equal(row.assessmentTotal, 0);
    assert.equal(row.assessmentCompleted, 0);
    assert.ok(!row.states.includes("ASSESSMENT_INCOMPLETE"), "zero-assigned is never incomplete");
  } finally {
    await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({
        where: { id: tests.noneStudentId },
        select: { studentProfile: { select: { id: true } } },
      });
      if (u?.studentProfile) await tx.studentProfile.delete({ where: { id: u.studentProfile.id } });
      await tx.user.deleteMany({ where: { id: tests.noneStudentId } });
    });
  }
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------
after(async () => {
  const users = await prisma.user.findMany({
    where: { email: { contains: `-${suffix}@x.com` } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  if (userIds.length) {
    await prisma.testAssignment.deleteMany({ where: { studentId: { in: userIds } } });
    await prisma.studentShortlist.deleteMany({ where: { studentId: { in: userIds } } });
    await prisma.studentRoadmap.deleteMany({ where: { studentId: { in: userIds } } });
    const cpIds = (
      await prisma.studentCareerProfile.findMany({
        where: { studentId: { in: userIds } },
        select: { id: true },
      })
    ).map((p) => p.id);
    if (cpIds.length)
      await prisma.studentCareerSignal.deleteMany({ where: { profileId: { in: cpIds } } });
    await prisma.studentCareerProfile.deleteMany({ where: { studentId: { in: userIds } } });
    await prisma.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: `ph32-${suffix}` } } });
  await prisma.$disconnect();
});

const tests = { noneStudentId: null };

before(async () => {
  tenant = await prisma.tenant.create({
    data: { name: "PH32", slug: `ph32-${suffix}`, subdomain: `ph32-${suffix}` },
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
      email: `ph32-counselor-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "PH32",
      lastName: "Counselor",
      role: "COUNSELOR",
      tenantId: tenant.id,
    },
  });
  counselorProfile = await prisma.counselorProfile.create({ data: { userId: counselor.id } });

  student = await prisma.user.create({
    data: {
      email: `ph32-student-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "PH32",
      lastName: "Student",
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });
  studentProfile = await prisma.studentProfile.create({
    data: {
      userId: student.id,
      counselorId: counselorProfile.id,
      gradeLevel: "11th",
      nationality: "India",
      highestEducation: "Class 10",
      mobile: "6666666666",
    },
  });

  const kinds = ["stream", "ideal", "learning"];
  const statuses = ["COMPLETED", "IN_PROGRESS", "ASSIGNED"];
  for (let i = 0; i < kinds.length; i++) {
    await prisma.testAssignment.create({
      data: {
        tenantId: tenant.id,
        studentId: student.id,
        assignedById: counselor.id,
        kind: kinds[i],
        token: `ph32-${suffix}-${student.id}-${i}`,
        status: statuses[i],
        completedAt: statuses[i] === "COMPLETED" ? new Date() : null,
      },
    });
  }
});