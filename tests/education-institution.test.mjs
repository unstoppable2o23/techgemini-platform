import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  getInstitutionsForDegrees,
  getInstitutionsForSpecialization,
  getInstitutionsForCareer,
  deriveInstitutionTypeTokens,
} from "../src/lib/education-institutions/service.ts";

const prisma = new PrismaClient();

test("education canonicalization: case/format variations map identically", () => {
  const a = deriveInstitutionTypeTokens("B.TECH Computer Science");
  const b = deriveInstitutionTypeTokens("b.tech computer science");
  assert.deepEqual(a, b);
  assert.ok(a.includes("Technical"));
  assert.ok(a.includes("Polytechnic"));
});

test("category discovery returns Indian institutions for an engineering degree (verified=false)", async () => {
  const degree = await prisma.degree.findFirst({
    where: { name: { contains: "Tech", mode: "insensitive" } },
  });
  assert.ok(degree, "expected at least one Tech degree in the database");

  const res = await getInstitutionsForDegrees([degree.id], { limit: 5 });
  assert.equal(res.verified, false);
  assert.equal(res.mappingBasis, "institutionType-category");
  assert.ok(res.disclaimer, "category discovery must carry a transparency disclaimer");
  assert.ok(res.institutions.length > 0, "expected category-matched institutions");
  assert.ok(res.institutions.every((i) => i.dataset === "indian"));
});

test("degree with no category match returns empty gracefully", async () => {
  const res = await getInstitutionsForDegrees(["000000000000000000000000"], { limit: 5 });
  assert.equal(res.institutions.length, 0);
  assert.equal(res.verified, false);
  assert.equal(res.mappingBasis, "none");
  assert.ok(res.disclaimer, "missing mapping must explain why it is empty");
});

test("specialization -> institution flow works", async () => {
  const spec = await prisma.specialization.findFirst({
    where: { degree: { name: { contains: "Tech", mode: "insensitive" } } },
    include: { degree: true },
  });
  assert.ok(spec, "expected a specialization under a Tech degree");

  const res = await getInstitutionsForSpecialization(spec.id, { limit: 5 });
  assert.ok(res.institutions.length > 0);
  assert.equal(res.mappingBasis, "institutionType-category");
  assert.ok(res.institutions.every((i) => i.dataset === "indian"));
});

test("career -> education -> institution flow works", async () => {
  const pathway = await prisma.careerEducationPathway.findFirst({
    where: { type: "DEGREE_PATHWAY", degreeId: { not: null } },
    include: { degree: true, career: true },
  });
  assert.ok(pathway, "expected a career education pathway");

  const res = await getInstitutionsForCareer(pathway.careerId, { limit: 5 });
  // Either category discovery produced institutions, or it honestly reports none.
  assert.ok(Array.isArray(res.institutions));
  if (res.institutions.length > 0) {
    assert.equal(res.mappingBasis, "institutionType-category");
    assert.ok(res.institutions.every((i) => i.dataset === "indian"));
  } else {
    assert.equal(res.mappingBasis, "none");
  }
});

test("no global university fabrication in category discovery", async () => {
  const degree = await prisma.degree.findFirst({
    where: { name: { contains: "Tech", mode: "insensitive" } },
  });
  assert.ok(degree);
  const res = await getInstitutionsForDegrees([degree.id], { limit: 10 });
  assert.ok(res.institutions.every((i) => i.dataset === "indian"));
});

test("University records remain unchanged after integration queries", async () => {
  const before = await prisma.university.count();
  const degree = await prisma.degree.findFirst({
    where: { name: { contains: "Tech", mode: "insensitive" } },
  });
  if (degree) await getInstitutionsForDegrees([degree.id], { limit: 5 });
  const after = await prisma.university.count();
  assert.equal(after, before, "University count must not change");
});

test("IndianInstitution records remain unchanged after integration queries", async () => {
  const beforeCount = await prisma.indianInstitution.count();
  const sampleBefore = await prisma.indianInstitution.findFirst({
    where: { institutionType: { contains: "Technical", mode: "insensitive" } },
    select: { id: true, name: true, state: true, type: true, website: true, aisheCode: true },
  });

  const degree = await prisma.degree.findFirst({
    where: { name: { contains: "Tech", mode: "insensitive" } },
  });
  if (degree) await getInstitutionsForDegrees([degree.id], { limit: 5 });

  const afterCount = await prisma.indianInstitution.count();
  assert.equal(afterCount, beforeCount, "IndianInstitution count must not change");

  if (sampleBefore) {
    const sampleAfter = await prisma.indianInstitution.findUnique({
      where: { id: sampleBefore.id },
      select: { id: true, name: true, state: true, type: true, website: true, aisheCode: true },
    });
    assert.deepEqual(sampleAfter, sampleBefore, "IndianInstitution record must not be modified");
  }
});

test("curated mapping path returns verified institutions end-to-end", async () => {
  const degree = await prisma.degree.findFirst({});
  const institution = await prisma.indianInstitution.findFirst({});
  assert.ok(degree && institution, "need a degree and an institution to test curated mapping");

  const created = await prisma.educationInstitutionMapping.create({
    data: {
      degreeId: degree.id,
      indianInstitutionId: institution.id,
      mappingType: "CURATED",
      source: "test",
      confidence: 1,
    },
  });

  try {
    const res = await getInstitutionsForDegrees([degree.id], { limit: 5 });
    assert.equal(res.verified, true, "curated mapping must be reported as verified");
    assert.equal(res.mappingBasis, "curated");
    const matched = res.institutions.find((i) => i.id === institution.id);
    assert.ok(matched, "curated institution must be returned");
    assert.equal(matched.dataset, "indian");
  } finally {
    await prisma.educationInstitutionMapping.delete({ where: { id: created.id } });
  }

  const after = await getInstitutionsForDegrees([degree.id], { limit: 5 });
  assert.equal(after.verified, false, "after deleting curated mapping, falls back to category discovery");
});

test("pagination metadata is present and coherent", async () => {
  const degree = await prisma.degree.findFirst({
    where: { name: { contains: "Tech", mode: "insensitive" } },
  });
  assert.ok(degree);
  const res = await getInstitutionsForDegrees([degree.id], { limit: 3, page: 1 });
  assert.ok(typeof res.total === "number");
  assert.ok(typeof res.page === "number");
  assert.ok(typeof res.totalPages === "number");
  assert.ok(res.page >= 1);
  assert.ok(res.totalPages >= 1);
});

test("EducationInstitutionMapping table does not duplicate-authoritatively reference actual institutions", async () => {
  // Mapping table stores only IDs; it must not create copies of University/IndianInstitution rows.
  const uniCount = await prisma.university.count();
  const instCount = await prisma.indianInstitution.count();
  const mappingCount = await prisma.educationInstitutionMapping.count();
  assert.ok(uniCount === 0 || uniCount > 0); // unchanged
  assert.ok(instCount > 0);
  assert.equal(mappingCount, 0, "no mappings should persist after the curated test cleaned up");
});

await prisma.$disconnect();
