import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { getCareerMatches } from "../src/lib/career-matching/engine.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant, user, studentProfile, careerProfile;
const TARGET = "NLP Engineer";

const SIG = (dimension, value, score = 85, sourceType = "ASSESSMENT", confidence = 0.85) => ({
  dimension,
  value,
  score,
  sourceType,
  sourceAssessment: sourceType === "ASSESSMENT" ? "personality" : null,
  confidence,
});

// Build signals from a career's actual CareerTrait records (the engine matches
// student signals against CareerTrait dimensions only).
function traitSignals(career, dims) {
  const out = [];
  for (const t of career.traits) {
    if (dims && !dims.includes(t.dimension)) continue;
    out.push(SIG(t.dimension, t.value, 85, "ASSESSMENT"));
  }
  return out;
}

before(async () => {
  tenant = await prisma.tenant.create({ data: { name: "TMN", slug: `tmn-${suffix}`, subdomain: `tmn-${suffix}` } });
  user = await prisma.user.create({
    data: {
      email: `mn-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "MN",
      lastName: "A",
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });
  studentProfile = await prisma.studentProfile.create({ data: { userId: user.id } });
  careerProfile = await prisma.studentCareerProfile.create({ data: { studentId: user.id, level: "DEVELOPING" } });
});

// Reset signals + preference between cases so they don't accumulate (idempotency / isolation).
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

function loadTarget() {
  return prisma.career.findFirst({
    where: { name: TARGET, isActive: true },
    include: { traits: true },
  });
}

test("STEP 8/9: getCareerMatches surfaces the new career with strong signals", async () => {
  const career = await loadTarget();
  assert.ok(career, "target new career must exist");
  assert.ok(career.traits.length > 0, "new career must have traits");
  await prisma.studentCareerSignal.createMany({ data: traitSignals(career).map((s) => ({ ...s, profileId: careerProfile.id })) });

  const res = await getCareerMatches(user.id, { limit: 80 });
  assert.ok(res.totalCareersScored >= 40, "should score the full career catalogue");
  const hit = res.matches.find((m) => m.career.name === TARGET);
  assert.ok(hit, "new career must appear in matches");
  assert.ok(hit.matchScore > 50, "strong-signal match should score high");
  assert.ok(hit.reasons.length > 0, "should include match reasons/explanations");
  assert.ok(hit.confidenceScore > 0 && hit.confidenceScore <= 100);
});

test("STEP 11: preferred career boosts the new career", async () => {
  const career = await loadTarget();
  await prisma.studentProfile.update({ where: { id: studentProfile.id }, data: { preferredCareer: TARGET } });
  const weak = traitSignals(career).slice(0, 1);
  await prisma.studentCareerSignal.createMany({ data: weak.map((s) => ({ ...s, profileId: careerProfile.id })) });

  const res = await getCareerMatches(user.id, { limit: 80 });
  const hit = res.matches.find((m) => m.career.name === TARGET);
  assert.ok(hit, "preferred new career should still appear");
  assert.ok(hit.preferenceBoost === true, "preference boost should be flagged");
});

test("STEP 13: subject matching surfaces the new career from its SUBJECT traits", async () => {
  const career = await loadTarget();
  const subj = traitSignals(career, ["SUBJECT"]);
  assert.ok(subj.length > 0, "new career should declare SUBJECT traits");
  await prisma.studentCareerSignal.createMany({ data: subj.map((s) => ({ ...s, profileId: careerProfile.id })) });

  const res = await getCareerMatches(user.id, { limit: 200 });
  const hit = res.matches.find((m) => m.career.name === TARGET);
  assert.ok(hit, "subject-only profile should still match the new career");
  assert.ok(hit.matchScore > 0);
});

test("STEP 10: partial profile yields lower-confidence recommendation, not a crash", async () => {
  const career = await loadTarget();
  const sigs = traitSignals(career, ["INTEREST"]).slice(0, 1);
  await prisma.studentCareerSignal.createMany({ data: sigs.map((s) => ({ ...s, profileId: careerProfile.id })) });

  const res = await getCareerMatches(user.id, { limit: 80 });
  const hit = res.matches.find((m) => m.career.name === TARGET);
  assert.ok(hit, "partial profile should produce a recommendation");
  assert.ok(hit.confidenceScore < 90, "partial data should lower confidence");
});

test("STEP 17: ranking is stable across repeated calls (idempotent)", async () => {
  const career = await loadTarget();
  await prisma.studentCareerSignal.createMany({ data: traitSignals(career).map((s) => ({ ...s, profileId: careerProfile.id })) });
  const a = await getCareerMatches(user.id, { limit: 80 });
  const b = await getCareerMatches(user.id, { limit: 80 });
  assert.equal(a.matches.length, b.matches.length);
  const topA = a.matches.slice(0, 10).map((m) => m.career.name).join("|");
  const topB = b.matches.slice(0, 10).map((m) => m.career.name).join("|");
  assert.equal(topA, topB, "top matches must be deterministic across calls");
});
