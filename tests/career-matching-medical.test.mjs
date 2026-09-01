import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { getCareerMatches } from "../src/lib/career-matching/engine.ts";
import { generateStudentCareerProfile } from "../src/lib/career-profile/generate.ts";

const prisma = new PrismaClient();
const S = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant, user, studentProfile, careerProfile;

before(async () => {
  tenant = await prisma.tenant.create({ data: { name: "MED", slug: `med-${S}`, subdomain: `med-${S}` } });
  user = await prisma.user.create({ data: { email: `med-${S}@x.com`, passwordHash: "x", firstName: "M", lastName: "S", role: "STUDENT", tenantId: tenant.id } });
  studentProfile = await prisma.studentProfile.create({ data: { userId: user.id } });
  careerProfile = await prisma.studentCareerProfile.create({ data: { studentId: user.id, level: "DEVELOPING" } });
});

beforeEach(async () => {
  await prisma.studentCareerSignal.deleteMany({ where: { profileId: careerProfile.id } });
  await prisma.studentProfile.update({ where: { id: studentProfile.id }, data: { preferredCareer: null } });
});

after(async () => {
  await prisma.studentCareerSignal.deleteMany({ where: { profileId: careerProfile.id } });
  await prisma.studentCareerProfile.deleteMany({ where: { id: careerProfile.id } });
  await prisma.studentProfile.deleteMany({ where: { id: studentProfile.id } });
  await prisma.user.deleteMany({ where: { id: user.id } });
  await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  await prisma.$disconnect();
});

async function runPersona(label, { subjectsStudied, subjectsEnjoyed, activities, preferred, gradeLevel }) {
  await prisma.studentProfile.update({
    where: { id: studentProfile.id },
    data: { subjectsStudied, subjectsEnjoyed, activityInterests: activities, preferredCareer: preferred, gradeLevel },
  });
  const prof = await generateStudentCareerProfile(user.id);
  const signals = await prisma.studentCareerSignal.findMany({ where: { profileId: careerProfile.id }, select: { dimension: true, value: true, sourceType: true } });
  const matches = await getCareerMatches(user.id, { limit: 30 });
  console.log(`\n=== ${label} ===`);
  console.log(`  type(matches)=${typeof matches} matchesIsArray=${Array.isArray(matches)}`);
  console.log(`  type(matches.matches)=${typeof matches?.matches} matchesIsArray=${Array.isArray(matches?.matches)}`);
  console.log(`  signals dimensions=${JSON.stringify([...new Set(signals.map((s) => s.dimension))])} count=${signals.length}`);
  for (const s of signals) console.log(`    ${s.dimension}: "${s.value}" src=${s.sourceType}`);
  const marr = matches.matches;
  const top = marr.slice(0, 10).map((m) => `${m.career.name}(${m.matchScore})`).join(" | ");
  console.log(`  TOP10: ${top}`);
  const med = marr.filter((m) => m.career.category === "Healthcare & Medicine" || m.career.category === "Life Sciences");
  console.log(`  medicalInTop30=${med.length} totalScored=${matches.totalCareersScored}`);
  for (const m of med) {
    const active = m.dimensionScores.filter((d) => d.matchedCount > 0).map((d) => `${d.dimension}=${d.score}`);
    console.log(`    ${m.career.name} score=${m.matchScore} conf=${m.confidenceScore} active=${JSON.stringify(active)}`);
  }
  return { signals, matches };
}

test("A: medicine-oriented student (Biology/Chemistry/Physics)", async () => {
  const r = await runPersona("A", { subjectsStudied: ["Biology", "Chemistry", "Physics"], subjectsEnjoyed: ["Biology", "Chemistry"], activities: ["Science / Experiments", "Research", "Helping people"], preferred: null, gradeLevel: "CLASS_12" });
  const med = r.matches.matches.filter((m) => m.career.category === "Healthcare & Medicine" || m.career.category === "Life Sciences");
  assert.ok(med.length > 0, "medical careers should appear");
});

test("E: no-assessment medical student (CLASS_10)", async () => {
  const r = await runPersona("E", { subjectsStudied: ["Biology", "Chemistry", "Physics"], subjectsEnjoyed: ["Biology", "Chemistry"], activities: ["Research", "Helping people"], preferred: null, gradeLevel: "CLASS_10" });
  assert.ok(!r.matches.hasAssessmentData, "no assessment data");
  const med = r.matches.matches.filter((m) => m.career.category === "Healthcare & Medicine" || m.career.category === "Life Sciences");
  assert.ok(med.length > 0, "medical careers should appear without assessments");
  for (const m of med) {
    const hasSubj = m.dimensionScores.some((d) => d.dimension === "SUBJECT" && d.matchedCount > 0);
    assert.ok(hasSubj, `${m.career.name} should have SUBJECT match`);
    assert.ok(m.matchScore > 0, `${m.career.name} should score >0`);
  }
});
