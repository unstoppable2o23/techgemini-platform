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

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant;
let sAUser, sAProfile;
let sBUser, sBProfile;

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
});

after(async () => {
  await prisma.studentShortlist.deleteMany({
    where: { studentId: { in: [sAUser.id, sBUser.id] } },
  });
  await prisma.testAssignment.deleteMany({ where: { studentId: sAUser.id } });
  await prisma.studentProfile.deleteMany({ where: { id: { in: [sAProfile.id, sBProfile.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [sAUser.id, sBUser.id] } } });
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
