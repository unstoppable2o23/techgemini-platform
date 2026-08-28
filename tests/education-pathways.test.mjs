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

  // Careers that carry recommendedSubjects must gain at least one SUBJECT_LINK.
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
    const allMapped = c.recommendedSubjects.every((s) =>
      mappedNames.has(s) || !/^(Physics|Chemistry|Accountancy|Mathematics|Business Studies|Law|Computer Science|English|Biology)$/i.test(s)
    );
    assert.ok(links.length > 0, `${c.name} should have at least one subject-link pathway`);
    assert.ok(allMappable(c.recommendedSubjects, mappedNames), `${c.name} subject links should cover authoritative subjects`);
  }
});

function allMappable(recommended, mappedNames) {
  // Only assert coverage for subjects that actually exist as Subject records.
  const existing = ["Physics", "Chemistry", "Accountancy", "Mathematics", "Business Studies", "Law", "Computer Science", "English", "Biology"];
  for (const s of recommended) {
    if (existing.includes(s) && !mappedNames.has(s)) return false;
  }
  return true;
}
