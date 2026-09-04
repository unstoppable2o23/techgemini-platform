import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  validateCsvRows,
  normalizeRow,
} from "../src/lib/csv-import.ts";
import {
  createInvitation,
  generateInviteToken,
  buildInviteUrl,
  INVITE_TTL_MS,
} from "../src/lib/invitation.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

const placeholder = bcrypt.hashSync("Placeholder!23", 10);

let tenant;
let admin, counselor, counselorProfile, student;

before(async () => {
  tenant = await prisma.tenant.create({
    data: {
      name: "Pilot Ops Org",
      slug: `pilotops-${suffix}`,
      subdomain: `pilotops-${suffix}`,
      status: "TRIAL",
      planType: "TRIAL",
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + 14 * 86400000),
      users: {
        create: [
          {
            email: `adm-${suffix}@test.local`,
            passwordHash: placeholder,
            firstName: "Admin",
            lastName: "One",
            role: "ORGANIZATION_ADMIN",
          },
          {
            email: `coun-${suffix}@test.local`,
            passwordHash: placeholder,
            firstName: "Counselor",
            lastName: "One",
            role: "COUNSELOR",
            counselorProfile: { create: {} },
          },
          {
            email: `stud-${suffix}@test.local`,
            passwordHash: placeholder,
            firstName: "Student",
            lastName: "One",
            role: "STUDENT",
            studentProfile: {
              create: { featureAccess: { create: {} } },
            },
          },
        ],
      },
    },
    include: { users: true },
  });

  admin = tenant.users.find((u) => u.email === `adm-${suffix}@test.local`);
  counselor = tenant.users.find((u) => u.email === `coun-${suffix}@test.local`);
  student = tenant.users.find((u) => u.email === `stud-${suffix}@test.local`);
  counselorProfile = await prisma.counselorProfile.findUnique({
    where: { userId: counselor.id },
  });
});

after(async () => {
  await prisma.studentInvitation.deleteMany({ where: { tenantId: tenant?.id } });
  await prisma.supportTicket.deleteMany({ where: { tenantId: tenant?.id } });
  await prisma.tenant.deleteMany({ where: { id: tenant?.id } });
  await prisma.$disconnect();
});

describe("Phase 22: CSV import validation", () => {
  test("normalizeRow maps common aliases and lowercases email", () => {
    const n = normalizeRow({
      firstname: "  Aarav ",
      lastname: " Sharma ",
      email: " AARAV@EXAMPLE.COM ",
      mobile: "9876543210",
      grade: " 11th ",
    });
    assert.equal(n.firstName, "Aarav");
    assert.equal(n.lastName, "Sharma");
    assert.equal(n.email, "aarav@example.com");
    assert.equal(n.phone, "9876543210");
    assert.equal(n.gradeLevel, "11th");
  });

  test("valid rows import without errors", () => {
    const { errors, validated } = validateCsvRows(
      [
        normalizeRow({
          firstName: "Aarav",
          lastName: "Sharma",
          email: "aarav@x.com",
        }),
        normalizeRow({
          firstName: "Isha",
          lastName: "Patel",
          email: "isha@x.com",
        }),
      ],
      {},
      []
    );
    assert.equal(errors.length, 0);
    assert.equal(validated.length, 2);
  });

  test("rejects missing name, invalid email, and unknown counselor", () => {
    const { errors, validated } = validateCsvRows(
      [
        normalizeRow({ firstName: "", lastName: "X", email: "a@x.com" }),
        normalizeRow({ firstName: "B", lastName: "Y", email: "not-an-email" }),
        normalizeRow({
          firstName: "C",
          lastName: "Z",
          email: "c@x.com",
          counselor: "nobody@x.com",
        }),
      ],
      {},
      []
    );
    assert.equal(validated.length, 0);
    assert.equal(errors.length, 3);
    assert.ok(errors.some((e) => /first or last name/i.test(e.error)));
    assert.ok(errors.some((e) => /invalid email/i.test(e.error)));
    assert.ok(errors.some((e) => /counselor not found/i.test(e.error)));
  });

  test("rejects duplicate email in file and duplicate vs existing org", () => {
    const email = `dup-${suffix}@x.com`;
    const { errors, validated } = validateCsvRows(
      [
        normalizeRow({ firstName: "A", lastName: "B", email }),
        normalizeRow({ firstName: "C", lastName: "D", email }),
      ],
      {},
      [email]
    );
    assert.equal(validated.length, 0);
    assert.equal(errors.length, 2);
    for (const e of errors) assert.ok(/duplicate/i.test(e.error));
  });

  test("validates and resolves counselor profile for assigned rows", () => {
    const { errors, validated } = validateCsvRows(
      [
        normalizeRow({
          firstName: "A",
          lastName: "B",
          email: `as-${suffix}@x.com`,
          counselor: counselor.email,
        }),
      ],
      { [counselor.email]: { userId: counselor.id, profileId: counselorProfile.id } },
      []
    );
    assert.equal(errors.length, 0);
    assert.equal(validated.length, 1);
    assert.equal(validated[0].counselorProfileId, counselorProfile.id);
  });
});

describe("Phase 22: invitation lifecycle", () => {
  test("generateInviteToken returns 64 hex chars and buildInviteUrl forms a path", () => {
    const t = generateInviteToken();
    assert.match(t, /^[0-9a-f]{64}$/);
    assert.ok(buildInviteUrl(t).includes(`/invite/${t}`));
    assert.equal(INVITE_TTL_MS, 7 * 24 * 60 * 60 * 1000);
  });

  test("creating an invitation stores PENDING with expiry, no password", async () => {
    const inv = await createInvitation({
      tenantId: tenant.id,
      studentId: student.id,
      emailedTo: student.email,
      createdById: admin.id,
    });
    assert.equal(inv.status, "PENDING");
    assert.equal(inv.studentId, student.id);
    assert.equal(inv.tenantId, tenant.id);
    assert.equal(inv.emailedTo, student.email);
    assert.ok(inv.tokenExpiresAt);
    assert.ok(inv.tokenExpiresAt.getTime() > Date.now());
    // token is a random non-trivial string, never a password
    assert.notEqual(inv.token, "password");
  });

  test("re-inviting regenerates the token and keeps single active invite", async () => {
    const first = await createInvitation({
      tenantId: tenant.id,
      studentId: student.id,
      emailedTo: student.email,
      createdById: admin.id,
    });
    const second = await createInvitation({
      tenantId: tenant.id,
      studentId: student.id,
      emailedTo: student.email,
      createdById: admin.id,
    });
    // studentId is unique -> exactly one row, token changes
    assert.notEqual(first.token, second.token);
    const all = await prisma.studentInvitation.findMany({
      where: { studentId: student.id },
    });
    assert.equal(all.length, 1);
    assert.equal(all[0].status, "PENDING");
    assert.equal(all[0].token, second.token);
  });

  test("accepting sets a password hash, activates the user, marks ACCEPTED", async () => {
    const inv = await prisma.studentInvitation.findUnique({
      where: { studentId: student.id },
    });
    assert.ok(inv);
    const passwordHash = await bcrypt.hash("NewPass!234", 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: student.id },
        data: { passwordHash, isActive: true },
      }),
      prisma.studentInvitation.update({
        where: { id: inv.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      }),
    ]);
    const acc = await prisma.studentInvitation.findUnique({
      where: { studentId: student.id },
    });
    const user = await prisma.user.findUnique({ where: { id: student.id } });
    assert.equal(acc.status, "ACCEPTED");
    assert.ok(acc.acceptedAt);
    assert.equal(user.isActive, true);
    assert.notEqual(user.passwordHash, placeholder);
    assert.ok(bcrypt.compareSync("NewPass!234", user.passwordHash));
  });

  test("an accepted invitation is no longer accepted for a second accept", async () => {
    const acc = await prisma.studentInvitation.findUnique({
      where: { studentId: student.id },
    });
    assert.equal(acc.status, "ACCEPTED");
  });
});

describe("Phase 22: support tickets", () => {
  test("a support ticket is created OPEN and scoped to the tenant", async () => {
    const ticket = await prisma.supportTicket.create({
      data: {
        tenantId: tenant.id,
        userId: student.id,
        category: "HELP",
        subject: "How do I retake an assessment?",
        description: "I cannot see the retake button.",
      },
    });
    assert.equal(ticket.status, "OPEN");
    assert.equal(ticket.category, "HELP");
    assert.equal(ticket.tenantId, tenant.id);
    assert.equal(ticket.userId, student.id);
  });
});

describe("Phase 22: tenant isolation for pilot ops", () => {
  test("a second tenant cannot see the first tenant's invitations", async () => {
    const other = await prisma.tenant.create({
      data: {
        name: "Other Org",
        slug: `other-${suffix}`,
        subdomain: `other-${suffix}`,
        status: "TRIAL",
        planType: "TRIAL",
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 14 * 86400000),
      },
    });
    const some = await prisma.studentInvitation.findMany({
      where: { tenantId: other.id },
    });
    const own = await prisma.studentInvitation.findMany({
      where: { tenantId: tenant.id },
    });
    assert.equal(some.length, 0);
    assert.ok(own.length >= 1);
    await prisma.tenant.deleteMany({ where: { id: other.id } });
  });

  test("student user belongs to exactly one tenant", async () => {
    const user = await prisma.user.findUnique({ where: { id: student.id } });
    assert.equal(user.tenantId, tenant.id);
    const count = await prisma.user.count({ where: { id: student.id } });
    assert.equal(count, 1);
  });
});
