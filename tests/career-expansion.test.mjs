import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const newCareers = JSON.parse(
  fs.readFileSync(
    path.join("scripts", "career-intelligence", "new-careers-emerging-v1.json"),
    "utf8"
  )
);

test("all 40 emerging-v1 careers exist in the database with pathways and traits", async () => {
  assert.equal(newCareers.length, 40, "expected exactly 40 new careers in the file");
  for (const c of newCareers) {
    const career = await prisma.career.findUnique({ where: { name: c.name } });
    assert.ok(career, `career "${c.name}" should exist`);
    assert.equal(
      career.isEmerging,
      Boolean(c.emerging),
      `${c.name} emerging flag should match source`
    );

    const deg = await prisma.careerEducationPathway.count({
      where: { careerId: career.id, type: "DEGREE_PATHWAY" },
    });
    assert.ok(deg > 0, `${c.name} should have at least one DEGREE_PATHWAY (got ${deg})`);

    const traits = await prisma.careerTrait.count({
      where: { careerId: career.id },
    });
    assert.ok(traits > 0, `${c.name} should expose career traits (got ${traits})`);
  }
});

test("emerging-v1 careers cover distinct, non-duplicate categories", async () => {
  const cats = new Set(newCareers.map((c) => c.cat));
  assert.ok(cats.size >= 6, `should span multiple categories (got ${cats.size})`);
  const names = new Set(newCareers.map((c) => c.name));
  assert.equal(names.size, 40, "career names must be unique");
});

await prisma.$disconnect();
