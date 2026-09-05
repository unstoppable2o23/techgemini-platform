import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { seedEducationOrphans } from "../scripts/seed-education-orphans.mjs";

const prisma = new PrismaClient();

let tenant, user;
const created = { tenant: false };

before(async () => {
  tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: "TO", slug: `to-${Date.now()}`, subdomain: `to-${Date.now()}` },
    });
    created.tenant = true;
  }
  user = await prisma.user.create({
    data: {
      email: `opath-${Date.now()}@x.com`,
      passwordHash: "x",
      firstName: "O",
      lastName: "P",
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });
  await prisma.studentProfile.create({ data: { userId: user.id } });
});

after(async () => {
  await prisma.studentProfile.deleteMany({ where: { userId: user.id } });
  await prisma.user.deleteMany({ where: { id: user.id } });
  if (created.tenant) await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  await prisma.$disconnect();
});

test("orphan education pathways are mapped from authoritative career data", async () => {
  await seedEducationOrphans(prisma);

  // Authoritative Subject catalog (the seed only links names that exist here —
  // it never fabricates Subject records).
  const subjectCatalog = await prisma.subject.findMany({ select: { name: true } });
  const authoritative = new Set(subjectCatalog.map((s) => s.name));

  const withSubjects = await prisma.career.findMany({
    where: { isActive: true, recommendedSubjects: { isEmpty: false } },
    select: { id: true, name: true, recommendedSubjects: true },
  });
  assert.ok(withSubjects.length > 0, "there should be careers with recommended subjects");

  for (const c of withSubjects) {
    const links = await prisma.careerEducationPathway.findMany({
      where: { careerId: c.id, type: "SUBJECT_LINK" },
      include: { subject: true },
    });
    const mappedNames = new Set(links.map((l) => l.subject?.name));
    const mapped = c.recommendedSubjects.filter((s) => authoritative.has(s));
    if (mapped.length === 0) continue; // nothing authoritative to assert coverage for
    assert.ok(links.length > 0, `${c.name} should have at least one subject-link pathway`);
    for (const s of mapped) {
      assert.ok(mappedNames.has(s), `${c.name} subject link should cover the authoritative subject ${s}`);
    }
  }
});
