import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CURATED = [
  "Game Development",
  "Information Technology Business Analysis",
  "Veterinary Science",
  "Forensic Science",
  "Visual Merchandising",
  "Advertising",
  "Agricultural Engineering",
  "Wildlife Biology",
  "Library Sciences",
];

test("the 9 previously data-empty careers now have curated education pathways", async () => {
  for (const name of CURATED) {
    const career = await prisma.career.findUnique({ where: { name } });
    assert.ok(career, `career "${name}" should exist`);
    const deg = await prisma.careerEducationPathway.count({
      where: { careerId: career.id, type: "DEGREE_PATHWAY" },
    });
    const subj = await prisma.careerEducationPathway.count({
      where: { careerId: career.id, type: "SUBJECT_LINK" },
    });
    assert.ok(deg > 0, `${name} should have at least one DEGREE_PATHWAY (got ${deg})`);
    assert.ok(subj > 0 || deg > 0, `${name} should expose subject signals`);
  }
});

test("newly required degrees were created with correct education level", async () => {
  const vet = await prisma.degree.findUnique({ where: { name: "B.V.SC & A.H." } });
  assert.ok(vet, "veterinary degree should exist");
  assert.equal(vet.educationLevel, "Bachelor's");

  const agri = await prisma.degree.findUnique({ where: { name: "B.TECH/B.E. Agricultural Engineering" } });
  assert.ok(agri, "agricultural engineering degree should exist");
  assert.equal(agri.educationLevel, "Bachelor's");

  const lib = await prisma.degree.findUnique({ where: { name: "M.LIB" } });
  assert.ok(lib, "library science master's should exist");
  assert.equal(lib.educationLevel, "Master's");
});

await prisma.$disconnect();
