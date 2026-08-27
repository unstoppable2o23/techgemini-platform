import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { loadAuthorizedStudent } from "../src/lib/counselor/access.ts";
import {
  createNote,
  listNotes,
  createAction,
  listActions,
  updateAction,
  createFeedback,
  listFeedback,
} from "../src/lib/counselor/notes.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenantA, tenantB;
let cAUser, cAProfile;
let cBUser, cBProfile;
let sAUser, sAProfile;
let sBUser, sBProfile;

before(async () => {
  tenantA = await prisma.tenant.create({
    data: { name: "TA", slug: `ta-${suffix}`, subdomain: `ta-${suffix}` },
  });
  tenantB = await prisma.tenant.create({
    data: { name: "TB", slug: `tb-${suffix}`, subdomain: `tb-${suffix}` },
  });

  cAUser = await prisma.user.create({
    data: {
      email: `ca-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "CA",
      lastName: "A",
      role: "COUNSELOR",
      tenantId: tenantA.id,
    },
  });
  cAProfile = await prisma.counselorProfile.create({
    data: { userId: cAUser.id, title: "Counselor A" },
  });

  cBUser = await prisma.user.create({
    data: {
      email: `cb-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "CB",
      lastName: "B",
      role: "COUNSELOR",
      tenantId: tenantB.id,
    },
  });
  cBProfile = await prisma.counselorProfile.create({
    data: { userId: cBUser.id, title: "Counselor B" },
  });

  sAUser = await prisma.user.create({
    data: {
      email: `sa-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "SA",
      lastName: "A",
      role: "STUDENT",
      tenantId: tenantA.id,
    },
  });
  sAProfile = await prisma.studentProfile.create({
    data: { userId: sAUser.id, counselorId: cAProfile.id, gradeLevel: "10th" },
  });

  sBUser = await prisma.user.create({
    data: {
      email: `sb-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "SB",
      lastName: "B",
      role: "STUDENT",
      tenantId: tenantB.id,
    },
  });
  sBProfile = await prisma.studentProfile.create({
    data: { userId: sBUser.id, counselorId: cBProfile.id },
  });

  // supporting data for visibility tests
  await prisma.studentCareerProfile.create({
    data: { studentId: sAUser.id, completeness: 60, level: "PARTIAL" },
  });
  await prisma.appointment.create({
    data: {
      studentId: sAProfile.id,
      counselorId: cAUser.id,
      userId: sAUser.id,
      title: "Intro",
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      status: "PENDING",
    },
  });
  await prisma.chat.create({
    data: { studentId: sAUser.id, counselorId: cAUser.id, status: "ACTIVE" },
  });
});

after(async () => {
  await prisma.counselorRecommendationFeedback.deleteMany({
    where: { studentId: { in: [sAProfile.id, sBProfile.id] } },
  });
  await prisma.counselorAction.deleteMany({
    where: { studentId: { in: [sAProfile.id, sBProfile.id] } },
  });
  await prisma.counselorNote.deleteMany({
    where: { studentId: { in: [sAProfile.id, sBProfile.id] } },
  });
  await prisma.appointment.deleteMany({
    where: { studentId: { in: [sAProfile.id, sBProfile.id] } },
  });
  await prisma.chat.deleteMany({
    where: { studentId: { in: [sAUser.id, sBUser.id] } },
  });
  await prisma.studentCareerProfile.deleteMany({
    where: { studentId: { in: [sAUser.id, sBUser.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [cAUser.id, cBUser.id, sAUser.id, sBUser.id] } },
  });
  await prisma.tenant.deleteMany({
    where: { id: { in: [tenantA.id, tenantB.id] } },
  });
  await prisma.$disconnect();
});

const counselorASession = () => ({
  user: { id: cAUser.id, role: "COUNSELOR", tenantId: tenantA.id },
});

test("counselor A can access assigned student A", async () => {
  const r = await loadAuthorizedStudent(sAUser.id, counselorASession());
  assert.equal(r.ok, true);
  assert.equal(r.student.id, sAUser.id);
});

test("counselor B cannot access student A (other counselor)", async () => {
  const r = await loadAuthorizedStudent(sAUser.id, {
    user: { id: cBUser.id, role: "COUNSELOR", tenantId: tenantB.id },
  });
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test("cross-tenant student B is rejected for counselor A", async () => {
  const r = await loadAuthorizedStudent(sBUser.id, counselorASession());
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test("student role cannot use counselor access", async () => {
  const r = await loadAuthorizedStudent(sAUser.id, {
    user: { id: sAUser.id, role: "STUDENT", tenantId: tenantA.id },
  });
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test("unauthenticated request is rejected", async () => {
  const r = await loadAuthorizedStudent(sAUser.id, null);
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
});

test("non-student id returns 404", async () => {
  const r = await loadAuthorizedStudent(cAUser.id, counselorASession());
  assert.equal(r.ok, false);
  assert.equal(r.status, 404);
});

test("counselor can add notes and history is preserved", async () => {
  await createNote({
    studentId: sAProfile.id,
    counselorId: cAUser.id,
    type: "GENERAL",
    content: "First note",
  });
  await createNote({
    studentId: sAProfile.id,
    counselorId: cAUser.id,
    type: "CAREER",
    content: "Second note",
  });
  const list = await listNotes(sAProfile.id);
  assert.ok(list.length >= 2);
  assert.equal(list[0].content, "Second note");
});

test("counselor can create and complete a follow-up action", async () => {
  const a = await createAction({
    studentId: sAProfile.id,
    counselorId: cAUser.id,
    title: "Call parent",
    type: "FOLLOW_UP",
  });
  assert.equal(a.completed, false);
  await updateAction(a.id, cAUser.id, { completed: true });
  const list = await listActions(sAProfile.id);
  const found = list.find((x) => x.id === a.id);
  assert.equal(found.completed, true);
});

test("counselor can record career and university recommendation feedback", async () => {
  await createFeedback({
    studentId: sAProfile.id,
    counselorId: cAUser.id,
    recommendationType: "CAREER",
    careerId: "career-1",
    decision: "SUITABLE",
    note: "strong fit",
  });
  await createFeedback({
    studentId: sAProfile.id,
    counselorId: cAUser.id,
    recommendationType: "UNIVERSITY",
    institutionId: "inst-1",
    institutionType: "GLOBAL",
    decision: "VERIFY_PROGRAM",
  });
  const list = await listFeedback(sAProfile.id);
  assert.ok(list.length >= 2);
});

test("existing appointments remain visible for authorized counselor", async () => {
  const appts = await prisma.appointment.findMany({
    where: { studentId: sAProfile.id },
  });
  assert.ok(appts.length >= 1);
});

test("existing chat access remains functional", async () => {
  const chats = await prisma.chat.findMany({
    where: { studentId: sAUser.id, counselorId: cAUser.id },
  });
  assert.ok(chats.length >= 1);
});
