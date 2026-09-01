import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { getCareerMatches } from "../src/lib/career-matching/engine.ts";
import { generateStudentCareerProfile } from "../src/lib/career-profile/generate.ts";
import { saveCareerPreferences } from "../src/lib/student/profile.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant, user, studentProfile, careerProfile;
const MEDICINE_NAME = "Medicine";

before(async () => {
  tenant = await prisma.tenant.create({ data: { name: "16A", slug: `a16-${suffix}`, subdomain: `a16-${suffix}` } });
  user = await prisma.user.create({
    data: {
      email: `a16-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "A16",
      lastName: "T",
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });
  studentProfile = await prisma.studentProfile.create({ data: { userId: user.id } });
  careerProfile = await prisma.studentCareerProfile.create({ data: { studentId: user.id, level: "DEVELOPING" } });
});

beforeEach(async () => {
  await prisma.studentCareerSignal.deleteMany({ where: { profileId: careerProfile.id } });
  await prisma.studentProfile.update({
    where: { id: studentProfile.id },
    data: {
      preferredCareer: null,
      preferredCareerId: null,
      gradeLevel: null,
      studyLevel: null,
      highestEducation: null,
      subjectsStudied: [],
      subjectsEnjoyed: [],
    },
  });
});

after(async () => {
  await prisma.studentCareerSignal.deleteMany({ where: { profileId: careerProfile.id } });
  await prisma.studentCareerProfile.deleteMany({ where: { id: careerProfile.id } });
  await prisma.studentProfile.deleteMany({ where: { id: studentProfile.id } });
  await prisma.user.deleteMany({ where: { id: user.id } });
  await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  await prisma.$disconnect();
});

function sig(dimension, value, score = 80, sourceType = "ASSESSMENT", confidence = 0.8) {
  return {
    dimension,
    value,
    score,
    sourceType,
    sourceAssessment: sourceType === "ASSESSMENT" ? "personality" : null,
    confidence,
  };
}

async function loadCareer(name, extraInclude = {}) {
  const c = await prisma.career.findFirst({
    where: { name, isActive: true },
    include: { traits: true, ...extraInclude },
  });
  assert.ok(c, `career '${name}' must exist in the seed data`);
  return c;
}

async function matchesForStudent() {
  return getCareerMatches(user.id, { limit: 200 });
}

test("DB1: preferredCareerId is persisted and used canonically; no other career inherits the boost", async () => {
  const first = await prisma.career.findFirst({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  assert.ok(first);

  await saveCareerPreferences(user.id, { careerId: first.id, studyAbroad: "no" });

  const sp = await prisma.studentProfile.findUnique({ where: { id: studentProfile.id } });
  assert.equal(sp.preferredCareerId, first.id, "canonical id must be stored");
  assert.equal(sp.preferredCareer, first.name);

  const res = await matchesForStudent();
  const hit = res.matches.find((m) => m.careerId === first.id);
  assert.ok(hit, "preferred career must appear in matches");
  assert.equal(hit.preferenceBoost, true);
  assert.equal(hit.trace.preferredCareerSource, "id", "engine must resolve via the stored canonical id");

  const boostLeaks = res.matches.filter((m) => m.careerId !== first.id && m.preferenceBoost);
  assert.equal(boostLeaks.length, 0, "canonical resolution must NOT bestow the boost on similar-named careers");
});

test("DB2: legacy preferredCareer name still resolves exactly and boosts", async () => {
  const medicine = await loadCareer(MEDICINE_NAME);
  await prisma.studentProfile.update({
    where: { id: studentProfile.id },
    data: { preferredCareer: MEDICINE_NAME, preferredCareerId: null },
  });
  await generateStudentCareerProfile(user.id);

  const res = await matchesForStudent();
  const hit = res.matches.find((m) => m.careerId === medicine.id);
  assert.ok(hit);
  assert.equal(hit.preferenceBoost, true);
  assert.equal(hit.trace.preferredCareerSource, "name_exact");
});

test("DB3: Class 8 student with Biology subjects is scored on future plausibility, never penalized", async () => {
  const medicine = await loadCareer(MEDICINE_NAME);
  await prisma.studentProfile.update({
    where: { id: studentProfile.id },
    data: { gradeLevel: "CLASS_8", subjectsStudied: ["Biology"] },
  });
  await generateStudentCareerProfile(user.id);

  const res = await matchesForStudent();
  const hit = res.matches.find((m) => m.careerId === medicine.id);
  assert.ok(hit, "school student with Biology must still surface medical careers");
  assert.ok(hit.matchScore > 0);
  assert.ok(!hit.developmentAreas.some((a) => /education/i.test(a)), "school stage must produce no education penalty");
  const edu = hit.dimensionScores.find((d) => d.dimension === "EDUCATION");
  assert.equal(edu.score, 0, "school stage education is neutral (no generic baseline inflation)");
  assert.ok(
    !hit.reasons.some((r) => r.dimension === "EDUCATION"),
    "school stage must produce no education reasons at all"
  );
});

test("DB4: a lone preferred-career signal cannot reach high confidence, even when it matches a career trait", async () => {
  const career = await prisma.career.findFirst({
    where: { isActive: true, traits: { some: { dimension: "INTEREST" } } },
    include: { traits: true },
  });
  assert.ok(career);
  const interestTrait = career.traits.find((t) => t.dimension === "INTEREST");
  assert.ok(interestTrait);

  await prisma.studentCareerSignal.create({
    data: { profileId: careerProfile.id, ...sig("INTEREST", interestTrait.value, 100, "PREFERENCE") },
  });

  const res = await matchesForStudent();
  const hit = res.matches.find((m) => m.careerId === career.id);
  assert.ok(hit);
  assert.ok(hit.evidence.length > 0, "the single preference signal should match the career trait");
  assert.ok(hit.confidenceScore < 45, `single signal must cap confidence, got ${hit.confidenceScore}`);
});

test("DB5: reliable conflicting assessment evidence surfaces as a VERIFIED_GAP, not a vague miss", async () => {
  const medicine = await loadCareer(MEDICINE_NAME);
  await prisma.studentCareerSignal.createMany({
    data: [
      { profileId: careerProfile.id, ...sig("SKILL", "Creative Writing", 95, "ASSESSMENT", 0.95) },
      { profileId: careerProfile.id, ...sig("INTEREST", "Creative Writing", 95, "ASSESSMENT", 0.95) },
    ],
  });

  const res = await matchesForStudent();
  const hit = res.matches.find((m) => m.careerId === medicine.id);
  assert.ok(hit, "Medicine must be scored");
  assert.ok(hit.verifiedGaps.length > 0, "reliable non-aligning assessment evidence must be a VERIFIED_GAP");
  assert.ok(hit.developmentAreas.length > 0, "gaps must also surface as development areas");
  assert.ok(
    hit.reasons.some((r) => r.evidenceType === "VERIFIED_GAP"),
    "reasons must carry structured evidenceType metadata"
  );
});

test("DB6: CareerEducationPathway degrees feed aligned post-school education scoring", async () => {
  const career = await prisma.career.findFirst({
    where: { isActive: true, careerEducationPathways: { some: { degree: { isNot: null } } } },
    include: { careerEducationPathways: { include: { degree: { select: { name: true } } } } },
  });
  assert.ok(career, "there must be a career with degree pathways in the seed data");
  const pathway = career.careerEducationPathways.find((p) => p.degree?.name);
  assert.ok(pathway && pathway.degree?.name, "pathway must carry a degree name");
  const degreeName = pathway.degree.name;

  await prisma.studentProfile.update({
    where: { id: studentProfile.id },
    data: { studyLevel: degreeName, gradeLevel: null, highestEducation: null },
  });
  await generateStudentCareerProfile(user.id);

  const res = await matchesForStudent();
  const hit = res.matches.find((m) => m.careerId === career.id);
  assert.ok(hit, "pathway career must be scored for a matching post-school student");
  const edu = hit.dimensionScores.find((d) => d.dimension === "EDUCATION");
  assert.equal(edu.score, 85, "aligned degree from a CareerEducationPathway must earn the aligned baseline");
  assert.ok(hit.reasons.some((r) => r.dimension === "EDUCATION" && r.type === "strength"));
});

test("DB7: subject selection feeds SUBJECT evidence only, never SKILL/APTITUDE", async () => {
  const medicine = await loadCareer(MEDICINE_NAME);
  await prisma.studentProfile.update({
    where: { id: studentProfile.id },
    data: { subjectsStudied: ["Biology"] },
  });
  await generateStudentCareerProfile(user.id);

  const res = await matchesForStudent();
  const hit = res.matches.find((m) => m.careerId === medicine.id);
  assert.ok(hit);
  const subj = hit.dimensionScores.find((d) => d.dimension === "SUBJECT");
  assert.ok(subj.matchedCount > 0, "Biology subject must match medical SUBJECT traits");
  const skill = hit.dimensionScores.find((d) => d.dimension === "SKILL");
  assert.equal(skill.matchedCount, 0, "subjects must not leak into SKILL");
  const apt = hit.dimensionScores.find((d) => d.dimension === "APTITUDE");
  assert.equal(apt.matchedCount, 0, "subjects must not leak into APTITUDE");
});

test("DB8: engine scoring is deterministic — repeated calls return identical rankings and scores", async () => {
  await prisma.studentCareerSignal.createMany({
    data: [
      { profileId: careerProfile.id, ...sig("INTEREST", "Building software products", 85, "ASSESSMENT") },
      { profileId: careerProfile.id, ...sig("SUBJECT", "Computer Science", 90, "STUDENT_PROFILE") },
    ],
  });

  const a = await matchesForStudent();
  const b = await matchesForStudent();
  assert.deepEqual(
    a.matches.map((m) => [m.careerId, m.matchScore, m.confidenceScore]),
    b.matches.map((m) => [m.careerId, m.matchScore, m.confidenceScore]),
    "repeated runs must be identical"
  );
  assert.ok(a.matches.length >= 1);
});

test("DB9: mixed aligned+non-aligned evidence shows alignment, never a false VERIFIED_GAP", async () => {
  const se = await loadCareer("Software Engineering");
  await prisma.studentCareerSignal.createMany({
    data: [
      {
        profileId: careerProfile.id,
        ...sig("SKILL", "Python", 90, "ASSESSMENT"),
      },
      // Reliable non-aligned evidence in the SAME dimension as a real alignment.
      { profileId: careerProfile.id, ...sig("SKILL", "Problem Solving", 90, "ASSESSMENT") },
    ],
  });
  const res = await matchesForStudent();
  const hit = res.matches.find((m) => m.careerId === se.id);
  assert.ok(hit, "Software Engineering must be scored");
  const skill = hit.dimensionScores.find((d) => d.dimension === "SKILL");
  assert.ok(skill.matchedCount > 0, "Problem Solving must align with SKILL");
  assert.ok(
    !hit.verifiedGaps.some((g) => /skill/i.test(g)),
    "mixed aligned+non-aligned SKILL evidence must NOT be a verified gap"
  );
  assert.ok(
    hit.reasons.some((r) => r.dimension === "SKILL" && r.type === "strength"),
    "the aligned signal should surface as a strength"
  );
});

test("DB10: school student's education is score-neutral through the engine (no baseline inflation)", async () => {
  const medicine = await loadCareer(MEDICINE_NAME);
  // Same Biology subject, once with a declared school stage and once without any
  // education evidence. Scores must be identical: school stage neither adds
  // nor subtracts (and must not emit education reasons).
  const body = { subjectsStudied: ["Biology"] };

  await prisma.studentProfile.update({
    where: { id: studentProfile.id },
    data: { ...body, gradeLevel: "CLASS_8", studyLevel: null, highestEducation: null },
  });
  await generateStudentCareerProfile(user.id);
  const withStage = await matchesForStudent();
  const withHit = withStage.matches.find((m) => m.careerId === medicine.id);
  assert.ok(withHit, "Class 8 + Biology must still surface Medicine");
  const edu = withHit.dimensionScores.find((d) => d.dimension === "EDUCATION");
  assert.equal(edu.score, 0, "school stage education must be neutral (no baseline)");
  assert.ok(
    !withHit.reasons.some((r) => r.dimension === "EDUCATION"),
    "school stage must produce no education reasons through the engine"
  );
  assert.ok(!withHit.developmentAreas.some((a) => /education/i.test(a)), "no education penalty for a school student");

  await prisma.studentProfile.update({
    where: { id: studentProfile.id },
    data: { ...body, gradeLevel: null, studyLevel: null, highestEducation: null },
  });
  await generateStudentCareerProfile(user.id);
  const noStage = await matchesForStudent();
  const noHit = noStage.matches.find((m) => m.careerId === medicine.id);
  assert.ok(noHit);
  assert.equal(
    withHit.matchScore,
    noHit.matchScore,
    "declaring a school stage must be score-neutral versus having no education evidence"
  );
});