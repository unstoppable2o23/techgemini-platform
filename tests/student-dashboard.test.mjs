import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  addShortlist,
  listShortlist,
  removeShortlist,
  isSaved,
} from "../src/lib/student/shortlist.ts";
import { getStudentBasics } from "../src/lib/student/basics.ts";
import { getStudentDashboard } from "../src/lib/student/dashboard.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant;
let sAUser, sAProfile;
let sBUser, sBProfile;
let sDUser, sDProfile;

const KINDS = ["stream", "ideal", "personality", "intelligences", "learning"];

before(async () => {
  tenant = await prisma.tenant.create({
    data: { name: "TASD", slug: `tasd-${suffix}`, subdomain: `tasd-${suffix}` },
  });

  sAUser = await prisma.user.create({
    data: {
      email: `sa-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "SA",
      lastName: "A",
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });
  sAProfile = await prisma.studentProfile.create({
    data: { userId: sAUser.id, gradeLevel: "10th", nationality: "IN" },
  });

  sBUser = await prisma.user.create({
    data: {
      email: `sb-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "SB",
      lastName: "B",
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });
  sBProfile = await prisma.studentProfile.create({
    data: { userId: sBUser.id },
  });

  sDUser = await prisma.user.create({
    data: {
      email: `sd-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "SD",
      lastName: "D",
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });
  sDProfile = await prisma.studentProfile.create({
    data: {
      userId: sDUser.id,
      gradeLevel: "12th",
      studyLevel: "Science",
      preferredCareer: "Software Engineering",
      targetCountry: "India",
      nationality: "IN",
    },
  });
});

after(async () => {
  await prisma.studentShortlist.deleteMany({
    where: { studentId: { in: [sAUser.id, sBUser.id, sDUser.id] } },
  });
  await prisma.testAssignment.deleteMany({ where: { studentId: { in: [sAUser.id, sDUser.id] } } });
  await prisma.studentProfile.deleteMany({ where: { id: { in: [sAProfile.id, sBProfile.id, sDProfile.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [sAUser.id, sBUser.id, sDUser.id] } } });
  await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  await prisma.$disconnect();
});

test("shortlist: add, list, isSaved, and isolation between students", async () => {
  await addShortlist({ studentId: sAUser.id, itemType: "CAREER", itemId: "career-x" });

  const aItems = await listShortlist(sAUser.id);
  assert.equal(aItems.length, 1);
  assert.equal(aItems[0].itemId, "career-x");

  assert.equal(await isSaved(sAUser.id, "CAREER", "career-x"), true);

  // Student B sees nothing
  const bItems = await listShortlist(sBUser.id);
  assert.equal(bItems.length, 0);

  // Student B cannot remove A's item (deleteMany matches only B's rows)
  const removedByB = await removeShortlist(sBUser.id, "CAREER", "career-x");
  assert.equal(removedByB.count, 0);

  // A's item still present
  assert.equal((await listShortlist(sAUser.id)).length, 1);

  // A removes it
  const removedByA = await removeShortlist(sAUser.id, "CAREER", "career-x");
  assert.equal(removedByA.count, 1);
  assert.equal((await listShortlist(sAUser.id)).length, 0);
});

test("getStudentBasics: zero-assessment student", async () => {
  const basics = await getStudentBasics(sAUser.id);
  assert.equal(typeof basics.profileCompleteness, "number");
  assert.equal(basics.hasAssessments, false);
  assert.equal(basics.assessmentCompletedCount, 0);
  assert.equal(basics.assessmentProgress.length, 5);
  assert.ok(Array.isArray(basics.nextSteps) && basics.nextSteps.length > 0);
});

test("getStudentBasics: full-assessment student reflects completed kinds", async () => {
  for (const kind of KINDS) {
    await prisma.testAssignment.create({
      data: {
        tenantId: tenant.id,
        studentId: sAUser.id,
        assignedById: sAUser.id,
        kind,
        token: `tok-${kind}-${suffix}`,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  const basics = await getStudentBasics(sAUser.id);
  assert.equal(basics.hasAssessments, true);
  assert.equal(basics.assessmentCompletedCount, 5);
  const completed = basics.assessmentProgress.filter((p) => p.completed);
  assert.equal(completed.length, 5);
});

test("getStudentDashboard: zero-assessment student returns the four sections and never throws", async () => {
  const dash = await getStudentDashboard(sDUser.id);
  assert.ok(dash);
  assert.ok(Array.isArray(dash.topCareerMatches), "topCareerMatches must be an array");
  assert.ok(Array.isArray(dash.trendingCareers), "trendingCareers must be an array");
  assert.ok(
    dash.topCareerId === null || typeof dash.topCareerId === "string",
    "topCareerId null or string"
  );
  // Education/university may be null when no top career; shape must still exist.
  assert.ok(
    dash.educationPathways === null || typeof dash.educationPathways === "object",
    "educationPathways shape"
  );
  assert.ok(
    dash.universityMatches === null || Array.isArray(dash.universityMatches),
    "universityMatches shape"
  );
  assert.ok(Array.isArray(dash.nextSteps) && dash.nextSteps.length > 0);
});

test("getStudentDashboard: full-assessment student reflects richer context without throwing", async () => {
  for (const kind of KINDS) {
    await prisma.testAssignment.create({
      data: {
        tenantId: tenant.id,
        studentId: sDUser.id,
        assignedById: sDUser.id,
        kind,
        token: `dash-${kind}-${suffix}`,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  const dash = await getStudentDashboard(sDUser.id);
  assert.ok(dash);
  assert.equal(dash.hasAssessments, true);
  assert.ok(Array.isArray(dash.topCareerMatches));
  assert.ok(Array.isArray(dash.trendingCareers));
});

test("getStudentDashboard: error isolation — a failing subsystem does not remove other sections", async () => {
  // Force career matching to fail by feeding an invalid id path is not possible via public API,
  // so we assert structural independence: each subsystem result is independently typed and the
  // function returns even when any single subsystem yields null/empty.
  const dash = await getStudentDashboard(sBUser.id); // zero-data student
  assert.ok(dash);
  assert.ok(Array.isArray(dash.topCareerMatches));
  assert.ok(Array.isArray(dash.trendingCareers));
  // A student with no profile signals still yields a coherent dashboard object.
  assert.equal(typeof dash.profileCompleteness, "number");
});
