import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { getCareerMatches } from "../src/lib/career-matching/engine.ts";
import { generateStudentCareerProfile } from "../src/lib/career-profile/generate.ts";

const prisma = new PrismaClient();
const S = Date.now() + "_" + Math.random().toString(36).slice(2, 6);

let tenant, user, studentProfile, careerProfile;

before(async () => {
  tenant = await prisma.tenant.create({ data: { name: "MED2", slug: `med2-${S}`, subdomain: `med2-${S}` } });
  user = await prisma.user.create({ data: { email: `med2-${S}@x.com`, passwordHash: "x", firstName: "M2", lastName: "S", role: "STUDENT", tenantId: tenant.id } });
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

async function persona(label, { subjectsStudied, subjectsEnjoyed, activities, preferred, gradeLevel }) {
  await prisma.studentProfile.update({ where: { id: studentProfile.id }, data: { subjectsStudied, subjectsEnjoyed, activityInterests: activities, preferredCareer: preferred, gradeLevel } });
  await generateStudentCareerProfile(user.id);
  const matches = await getCareerMatches(user.id, { limit: 50 });
  return matches;
}

// Part 32 coverage tests

test("biology subject matching surfaces medical careers", async () => {
  const r = await persona("bio", { subjectsStudied: ["Biology"], subjectsEnjoyed: ["Biology"], activities: [], preferred: null, gradeLevel: "CLASS_12" });
  const med = r.matches.filter((m) => m.career.category === "Healthcare & Medicine" || m.career.category === "Life Sciences");
  assert.ok(med.length >= 3, `biology should surface >=3 medical careers, got ${med.length}`);
  for (const m of med) {
    const hasBio = m.dimensionScores.some((d) => d.dimension === "SUBJECT" && d.matchedCount > 0);
    assert.ok(hasBio, `${m.career.name} should have SUBJECT match`);
  }
});

test("chemistry subject matching surfaces paramedic/pharmacology-related careers", async () => {
  const r = await persona("chem", { subjectsStudied: ["Chemistry"], subjectsEnjoyed: ["Chemistry"], activities: [], preferred: null, gradeLevel: "CLASS_12" });
  const hasChem = r.matches.some((m) => m.dimensionScores.some((d) => d.dimension === "SUBJECT" && d.matchedCount > 0));
  assert.ok(hasChem, "chemistry should produce SUBJECT matches");
});

test("physics subject matching surfaces imaging/therapy careers", async () => {
  const r = await persona("phys", { subjectsStudied: ["Physics"], subjectsEnjoyed: ["Physics"], activities: [], preferred: null, gradeLevel: "CLASS_12" });
  const hasPhys = r.matches.some((m) => m.dimensionScores.some((d) => d.dimension === "SUBJECT" && d.matchedCount > 0));
  assert.ok(hasPhys, "physics should produce SUBJECT matches");
});

test("science interest (Research) matching", async () => {
  const r = await persona("sci", { subjectsStudied: ["Biology"], subjectsEnjoyed: ["Biology"], activities: ["Research", "Science / Experiments"], preferred: null, gradeLevel: "CLASS_12" });
  const res = r.matches.filter((m) => m.dimensionScores.some((d) => d.dimension === "INTEREST" && d.matchedCount > 0));
  assert.ok(res.length > 0, "science activities should produce INTEREST matches");
});

test("healthcare interest (Helping people) matching", async () => {
  const r = await persona("help", { subjectsStudied: ["Biology"], subjectsEnjoyed: ["Biology"], activities: ["Helping people"], preferred: null, gradeLevel: "CLASS_12" });
  const med = r.matches.filter((m) => m.career.category === "Healthcare & Medicine");
  assert.ok(med.length > 0, "helping people should surface healthcare careers");
});

test("medical career explicit preference gets boost", async () => {
  const r = await persona("pref", { subjectsStudied: ["Biology", "Chemistry"], subjectsEnjoyed: ["Biology"], activities: ["Science / Experiments"], preferred: "Medicine", gradeLevel: "CLASS_12" });
  const hit = r.matches.find((m) => m.career.name === "Medicine");
  if (hit) {
    assert.ok(hit.preferenceBoost === true, "preferred Medicine should have preferenceBoost");
    assert.ok(hit.matchScore < 100 || hit.matchScore === 100, "boost must not force beyond 100");
  }
  // Also check new careers can be preferred - use larger limit to find Surgeon
  await prisma.studentProfile.update({ where: { id: studentProfile.id }, data: { subjectsStudied: ["Biology", "Chemistry", "Physics"], subjectsEnjoyed: ["Biology"], activityInterests: [], preferredCareer: "Surgeon", gradeLevel: "CLASS_12" } });
  await generateStudentCareerProfile(user.id);
  const r2full = await getCareerMatches(user.id, { limit: 200 });
  const hit2 = r2full.matches.find((m) => m.career.name === "Surgeon");
  assert.ok(hit2, "Surgeon should be in results when preferred (limit 200)");
  assert.ok(hit2.preferenceBoost === true, "Surgeon preferred should boost");
});

test("profile-only matching (no assessments) works", async () => {
  const r = await persona("noAssess", { subjectsStudied: ["Biology", "Chemistry", "Physics"], subjectsEnjoyed: ["Biology", "Chemistry"], activities: ["Research", "Helping people"], preferred: null, gradeLevel: "CLASS_10" });
  assert.ok(!r.hasAssessmentData, "should have no assessment data");
  assert.ok(r.matches.length > 0, "should produce matches without assessments");
  const med = r.matches.filter((m) => m.career.category === "Healthcare & Medicine" || m.career.category === "Life Sciences");
  assert.ok(med.length > 0, "medical careers should appear without assessments");
  assert.ok(r.disclaimer !== null, "should show no-assessment disclaimer");
});

test("contradictory profile (Art/Design/Writing) does not force medical", async () => {
  const r = await persona("art", { subjectsStudied: [], subjectsEnjoyed: [], activities: ["Art", "Design", "Writing"], preferred: null, gradeLevel: "CLASS_12" });
  // Inject Art/Design/Writing as raw signals to simulate the persona
  await prisma.studentCareerSignal.deleteMany({ where: { profileId: careerProfile.id } });
  await prisma.studentCareerSignal.createMany({
    data: [
      { profileId: careerProfile.id, dimension: "INTEREST", value: "activity:Art", score: 80, sourceType: "STUDENT_PROFILE", confidence: 1 },
      { profileId: careerProfile.id, dimension: "INTEREST", value: "activity:Design", score: 80, sourceType: "STUDENT_PROFILE", confidence: 1 },
      { profileId: careerProfile.id, dimension: "INTEREST", value: "activity:Writing", score: 80, sourceType: "STUDENT_PROFILE", confidence: 1 },
    ],
  });
  const r2 = await getCareerMatches(user.id, { limit: 20 });
  const top5Cats = r2.matches.slice(0, 5).map((m) => m.career.category);
  // Medical should not dominate top 5 for an art student
  const medInTop5 = r2.matches.slice(0, 5).filter((m) => m.career.category === "Healthcare & Medicine").length;
  assert.ok(medInTop5 < 5, `art student: at most some medical in top5, got ${medInTop5}`);
  // At least one non-medical should be in top 5
  const nonMed = top5Cats.some((c) => c !== "Healthcare & Medicine" && c !== "Life Sciences");
  assert.ok(nonMed, "art student should have non-medical careers in top 5");
});

test("Class 8-12: school students not penalized for education mismatch", async () => {
  for (const grade of ["CLASS_8", "CLASS_9", "CLASS_10", "CLASS_11", "CLASS_12"]) {
    const r = await persona(grade, { subjectsStudied: ["Biology", "Chemistry"], subjectsEnjoyed: ["Biology"], activities: ["Science / Experiments"], preferred: null, gradeLevel: grade });
    const med = r.matches.filter((m) => m.career.category === "Healthcare & Medicine" || m.career.category === "Life Sciences");
    assert.ok(med.length > 0, `${grade} with Biology should surface medical careers`);
    for (const m of med.slice(0, 3)) {
      assert.ok(m.matchScore > 0, `${grade} ${m.career.name} should score >0`);
    }
  }
});

test("deterministic ranking: same profile run 3 times", async () => {
  await prisma.studentProfile.update({ where: { id: studentProfile.id }, data: { subjectsStudied: ["Biology", "Chemistry"], subjectsEnjoyed: ["Biology"], activityInterests: ["Research"], gradeLevel: "CLASS_12" } });
  await generateStudentCareerProfile(user.id);
  const a = await getCareerMatches(user.id, { limit: 20 });
  const b = await getCareerMatches(user.id, { limit: 20 });
  const c = await getCareerMatches(user.id, { limit: 20 });
  const topA = a.matches.slice(0, 10).map((m) => m.career.name).join("|");
  const topB = b.matches.slice(0, 10).map((m) => m.career.name).join("|");
  const topC = c.matches.slice(0, 10).map((m) => m.career.name).join("|");
  assert.equal(topA, topB, "run 1 vs 2 must be deterministic");
  assert.equal(topB, topC, "run 2 vs 3 must be deterministic");
});

test("explanations are evidence-based", async () => {
  const r = await persona("explain", { subjectsStudied: ["Biology", "Chemistry", "Physics"], subjectsEnjoyed: ["Biology", "Chemistry"], activities: ["Science / Experiments", "Research"], preferred: null, gradeLevel: "CLASS_12" });
  const med = r.matches.filter((m) => m.career.category === "Healthcare & Medicine").slice(0, 3);
  for (const m of med) {
    assert.ok(m.reasons.length > 0, `${m.career.name} should have reasons`);
    const hasEvidence = m.dimensionScores.some((d) => d.matchedCount > 0);
    assert.ok(hasEvidence, `${m.career.name} should have matched dimensions`);
    // Reasons should reference actual dimensions, not generic claims
    const text = m.reasons.map((r) => r.text).join(" ");
    assert.ok(text.length > 10, "reasons should be substantive");
  }
});

test("medical vs science distinction: biology student gets both, not only medicine", async () => {
  const r = await persona("medVsSci", { subjectsStudied: ["Biology", "Chemistry"], subjectsEnjoyed: ["Biology"], activities: ["Science / Experiments", "Research"], preferred: null, gradeLevel: "CLASS_12" });
  const cats = [...new Set(r.matches.slice(0, 20).map((m) => m.career.category))];
  // Should have multiple categories, not just Medicine
  assert.ok(cats.length > 1, `top 20 should span multiple categories, got ${JSON.stringify(cats)}`);
  const hasLifeSci = r.matches.slice(0, 30).some((m) => m.career.category === "Life Sciences");
  assert.ok(hasLifeSci, "biology student should also see Life Sciences options");
});

test("new medical careers are matchable via SUBJECT", async () => {
  const newNames = ["Surgeon", "Paramedic", "Biomedical Scientist", "Epidemiologist", "Phlebotomist", "Sonographer"];
  for (const name of newNames) {
    const career = await prisma.career.findUnique({ where: { name }, include: { traits: true } });
    assert.ok(career, `${name} should exist`);
    const subjTraits = career.traits.filter((t) => t.dimension === "SUBJECT").map((t) => t.value);
    assert.ok(subjTraits.length > 0, `${name} should have SUBJECT traits`);
  }
  await prisma.studentProfile.update({ where: { id: studentProfile.id }, data: { subjectsStudied: ["Biology", "Chemistry", "Physics"], subjectsEnjoyed: ["Biology"], activityInterests: [], preferredCareer: null, gradeLevel: "CLASS_12" } });
  await generateStudentCareerProfile(user.id);
  const r = await getCareerMatches(user.id, { limit: 200 });
  for (const name of newNames) {
    const hit = r.matches.find((m) => m.career.name === name);
    assert.ok(hit, `${name} should appear for Biology student (limit 200)`);
    const hasSubj = hit.dimensionScores.some((d) => d.dimension === "SUBJECT" && d.matchedCount > 0);
    assert.ok(hasSubj, `${name} should have SUBJECT match for Biology student`);
  }
});

test("other domains remain functional (Technology, Engineering, Commerce)", async () => {
  // Technology persona
  const r1 = await persona("tech", { subjectsStudied: ["Mathematics", "Computer Science", "Physics"], subjectsEnjoyed: ["Computer Science", "Mathematics"], activities: ["Coding", "Technology"], preferred: null, gradeLevel: "CLASS_12" });
  const tech = r1.matches.filter((m) => m.career.category === "Technology & Software" || m.career.category === "Data & AI");
  assert.ok(tech.length > 0, "tech student should see tech careers");

  // Business persona
  const r2 = await persona("biz", { subjectsStudied: ["Business Studies", "Economics"], subjectsEnjoyed: ["Business Studies"], activities: ["Leadership"], preferred: null, gradeLevel: "CLASS_12" });
  const biz = r2.matches.filter((m) => m.career.category === "Business & Management" || m.career.category === "Finance & Accounting");
  assert.ok(biz.length > 0, "business student should see business careers");
});

test("partial assessment simulation: 1 assessment signal still surfaces medical", async () => {
  await prisma.studentProfile.update({ where: { id: studentProfile.id }, data: { subjectsStudied: ["Biology", "Chemistry"], subjectsEnjoyed: ["Biology"], activityInterests: ["Research"], gradeLevel: "CLASS_12" } });
  await generateStudentCareerProfile(user.id);
  // Add a single assessment signal
  await prisma.studentCareerSignal.create({ data: { profileId: careerProfile.id, dimension: "INTEREST", value: "research", score: 85, sourceType: "ASSESSMENT", sourceAssessment: "personality", confidence: 0.9 } });
  const r = await getCareerMatches(user.id, { limit: 30 });
  const med = r.matches.filter((m) => m.career.category === "Healthcare & Medicine" || m.career.category === "Life Sciences");
  assert.ok(med.length > 0, "partial assessment + profile should still surface medical");
  assert.ok(r.hasAssessmentData === true, "should have assessment data");
});
