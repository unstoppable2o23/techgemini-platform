import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { REL_RANK, rankCareerPrograms } from "../src/lib/career-program.ts";

const prisma = new PrismaClient();

const VALID_REL = new Set(["PRIMARY", "COMMON", "SPECIALIZED", "RELEVANT", "OPTIONAL"]);

const LEGACY_MALFORMED = [/ANY\s+degree/i, /12TH/i, /PASS\s/i, /^\s*\)/];

// Baseline DB-safety values captured before Phase 17 (scripts/audit/phase17-db-baseline.json).
const BASELINE = {
  University: 20,
  IndianInstitution: 73969,
  Program: 75,
  activeCareer: 289,
};

// ========== 1. Every active career has >=1 active mapping ==========

test("1: every active career has at least one active programme mapping", async () => {
  const active = await prisma.career.findMany({
    where: { isActive: true },
    select: { name: true, careerProgramMappings: { where: { isActive: true }, select: { id: true } } },
  });
  const unmapped = active.filter((c) => c.careerProgramMappings.length === 0).map((c) => c.name);
  assert.equal(active.length, BASELINE.activeCareer, "active career count drift");
  assert.equal(unmapped.length, 0, `careers with no mapping: ${unmapped.join(", ")}`);
});

// ========== 2. No mapping references a non-existent program ==========

test("2: every mapping's programId resolves to an AcademicProgram", async () => {
  const mappings = await prisma.careerProgramMapping.findMany({ select: { programId: true, careerId: true } });
  const programIds = new Set((await prisma.academicProgram.findMany({ select: { id: true } })).map((p) => p.id));
  const careerIds = new Set((await prisma.career.findMany({ select: { id: true } })).map((c) => c.id));
  const badProgram = mappings.filter((m) => !programIds.has(m.programId)).length;
  const badCareer = mappings.filter((m) => !careerIds.has(m.careerId)).length;
  assert.equal(badProgram, 0, "orphan programId references");
  assert.equal(badCareer, 0, "orphan careerId references");
});

// ========== 3. No duplicate (careerId, programId) ==========

test("3: no duplicate (careerId, programId) mapping pairs", async () => {
  const rows = await prisma.careerProgramMapping.findMany({ select: { careerId: true, programId: true } });
  const seen = new Set();
  const dups = [];
  for (const r of rows) {
    const key = `${r.careerId}|${r.programId}`;
    if (seen.has(key)) dups.push(key);
    seen.add(key);
  }
  assert.equal(dups.length, 0, `duplicate pairs: ${dups.join(", ")}`);
});

// ========== 4. Valid relationship type ==========

test("4: all relationshipType values are from the canonical taxonomy", async () => {
  const distinct = await prisma.careerProgramMapping.findMany({
    distinct: ["relationshipType"],
    select: { relationshipType: true },
  });
  const invalid = distinct.map((d) => d.relationshipType).filter((t) => !VALID_REL.has(t));
  assert.deepEqual(invalid, [], `invalid relationship types: ${invalid.join(", ")}`);
});

// ========== 5. Deterministic ranking ==========

test("5: rankCareerPrograms is deterministic for identical input", () => {
  const rows = [
    { relationshipType: "RELEVANT", strength: 0.6, confidence: 0.75, priority: 40, rationale: "r", source: "s",
      program: { id: "c", name: "Ceramics", slug: "c", level: "Bachelor's", category: "Eng" } },
    { relationshipType: "PRIMARY", strength: 1, confidence: 0.95, priority: 10, rationale: "r", source: "s",
      program: { id: "a", name: "Alpha", slug: "a", level: "Bachelor's", category: "Eng" } },
    { relationshipType: "COMMON", strength: 0.8, confidence: 0.85, priority: 20, rationale: "r", source: "s",
      program: { id: "b", name: "Beta", slug: "b", level: "Bachelor's", category: "Eng" } },
  ];
  const first = rankCareerPrograms(rows).map((p) => p.programSlug);
  const second = rankCareerPrograms(rows).map((p) => p.programSlug);
  assert.deepEqual(first, ["a", "b", "c"]);
  assert.deepEqual(second, first);
});

// ========== 6. PRIMARY > COMMON > SPECIALIZED/RELEVANT/OPTIONAL ==========

test("6: ranking honours PRIMARY > COMMON > (SPECIALIZED/RELEVANT/OPTIONAL)", () => {
  const mk = (rel, slug, priority = 100) =>
    ({ relationshipType: rel, strength: 0.5, confidence: 0.6, priority, rationale: "r", source: "s",
      program: { id: slug, name: slug, slug, level: "Bachelor's", category: "Eng" } });
  const rows = [
    mk("OPTIONAL", "five", 10),
    mk("RELEVANT", "four", 10),
    mk("SPECIALIZED", "three", 10),
    mk("COMMON", "two", 10),
    mk("PRIMARY", "one", 10),
  ];
  const out = rankCareerPrograms(rows);
  assert.deepEqual(out.map((p) => p.programSlug), ["one", "two", "three", "four", "five"]);
});

// ========== 7. School-stage: every career offers an undergraduate on-ramp ==========

test("7: every career offers an undergraduate (Bachelor's/Professional/Diploma) programme", async () => {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    include: {
      careerProgramMappings: {
        where: { isActive: true },
        include: { program: { select: { name: true, level: true } } },
      },
    },
  });
  const missing = [];
  for (const c of careers) {
    const levels = (c.careerProgramMappings ?? []).map((m) => m.program.level || "");
    const hasUg = levels.some((l) => /Bachelor|Professional|Diploma/.test(l));
    if (!hasUg) missing.push(c.name);
  }
  assert.deepEqual(missing, [], `careers with no undergraduate on-ramp: ${missing.join(", ")}`);
});

// ========== 8. No malformed / generic legacy education tokens ==========

test("8: no mapping references a generic or malformed legacy programme", async () => {
  const programs = await prisma.academicProgram.findMany({ select: { name: true, slug: true } });
  const bad = programs.filter((p) => LEGACY_MALFORMED.some((re) => re.test(p.name)));
  assert.deepEqual(bad, [], `malformed programme names: ${bad.map((b) => b.name).join(", ")}`);
});

// ========== 9,10,11. Career / University / Institution / Program counts unchanged ==========

test("9: Career / University / IndianInstitution / Program counts unchanged vs Phase 17 baseline", async () => {
  const [active, uni, ind, prog] = await Promise.all([
    prisma.career.count({ where: { isActive: true } }),
    prisma.university.count(),
    prisma.indianInstitution.count(),
    prisma.program.count(),
  ]);
  assert.equal(active, BASELINE.activeCareer, "active careers changed");
  assert.equal(uni, BASELINE.University, "University count changed");
  assert.equal(ind, BASELINE.IndianInstitution, "IndianInstitution count changed");
  assert.equal(prog, BASELINE.Program, "Program table count changed");
});

test("10: Program table remains at 75 rows", async () => {
  assert.equal(await prisma.program.count(), 75);
});

test("11: University table remains at 20 rows", async () => {
  assert.equal(await prisma.university.count(), 20);
});

// ========== 12. Family coverage across major families ==========

test("12: every major career family has all careers mapped", async () => {
  const majors = [
    "Healthcare & Medicine", "Engineering", "Technology & Software",
    "Environment & Sustainability", "Media & Communication", "Finance & Accounting",
  ];
  const families = await prisma.career.groupBy({
    by: ["category"],
    where: { isActive: true },
    _count: { id: true },
  });
  const mapped = await prisma.career.groupBy({
    by: ["category"],
    where: { isActive: true, careerProgramMappings: { some: { isActive: true } } },
    _count: { id: true },
  });
  const mappedBy = new Map(mapped.map((m) => [m.category, m._count.id]));
  const totalBy = new Map(families.map((f) => [f.category, f._count.id]));
  for (const fam of majors) {
    assert.equal(mappedBy.get(fam), totalBy.get(fam), `family ${fam} not fully mapped`);
  }
});

// ========== 13. No obviously unrelated mappings ==========

test("13: known-good mappings exist and no obviously unrelated mapping is present", async () => {
  const sw = await prisma.career.findUnique({
    where: { name: "Software Engineering" },
    include: { careerProgramMappings: { include: { program: { select: { name: true } } } } },
  });
  const names = sw?.careerProgramMappings.map((m) => m.program.name) ?? [];
  assert.ok(names.includes("Computer Science"), "Software Engineering should map to Computer Science");

  const nursing = await prisma.career.findUnique({
    where: { name: "Nursing" },
    include: { careerProgramMappings: { include: { program: { select: { name: true } } } } },
  });
  const nursNames = nursing?.careerProgramMappings.map((m) => m.program.name) ?? [];
  assert.ok(!nursNames.includes("Mining Engineering"), "Nursing must not map to Mining Engineering");
});

// ========== 14. API/service returns a ranked programme list ==========

test("14: getCareerPrograms returns a correctly-ordered set for Data Science", async () => {
  const ds = await prisma.career.findUnique({ where: { name: "Data Science" }, select: { id: true } });
  assert.ok(ds, "Data Science career exists");
  const rows = await prisma.careerProgramMapping.findMany({
    where: { careerId: ds.id, isActive: true },
    include: { program: { select: { id: true, name: true, slug: true, level: true, category: true, isActive: true } } },
  });
  const ranked = rankCareerPrograms(rows);
  assert.ok(ranked.length > 0);
  assert.equal(ranked[0].programName, "Data Science", "PRIMARY Data Science programme listed first");
});

// ========== 15. AcademicProgram catalogue integrity ==========

test("15: AcademicProgram catalogue has unique names/slugs and a sane size", async () => {
  const programs = await prisma.academicProgram.findMany({ select: { name: true, slug: true } });
  const names = programs.map((p) => p.name.toLowerCase());
  const slugs = programs.map((p) => p.slug);
  assert.equal(new Set(names).size, names.length, "duplicate programme names");
  assert.equal(new Set(slugs).size, slugs.length, "duplicate programme slugs");
  assert.ok(programs.length >= 100, "catalogue should be sizeable");
  assert.ok(programs.length <= 400, "catalogue remains a curated set");
});

await prisma.$disconnect();