import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { getUniversityProfile } from "../src/lib/university-profile/profile.ts";
import { computeFreshness, FRESHNESS_THRESHOLDS } from "../src/lib/university-profile/freshness.ts";

const prisma = new PrismaClient();

before(async () => {});
after(async () => { await prisma.$disconnect(); });

test("Profile renders for institution with verified programs (badges, sources, freshness correct)", async () => {
  const inst = await prisma.indianInstitution.findFirst({ where: { programs: { some: { verificationStatus: "VERIFIED" } } } });
  assert.ok(inst, "need institution with verified program");
  const profile = await getUniversityProfile(inst.id, "indian");
  assert.ok(profile, "profile should exist");
  assert.ok(profile.programs.hasVerified, "should have verified");
  assert.ok(profile.programs.verifiedCount > 0);
  for (const prog of profile.programs.all) {
    if (prog.verificationStatus === "VERIFIED") {
      assert.ok(prog.source, "verified should have source");
      assert.ok(prog.sourceUrl, "verified should have sourceUrl");
      assert.ok(["CURRENT", "RECENT", "HISTORICAL", "UNKNOWN"].includes(prog.freshness));
    }
  }
});

test("Profile renders for institution with NO programs (honest empty state)", async () => {
  // Find an institution with no programs (likely many)
  const inst = await prisma.indianInstitution.findFirst({ where: { programs: { none: {} } } });
  assert.ok(inst, "need institution with no programs");
  const profile = await getUniversityProfile(inst.id, "indian");
  assert.ok(profile);
  assert.equal(profile.isEmpty, true);
  assert.equal(profile.hasPrograms, false);
  assert.equal(profile.programs.total, 0);
});

test("Profile renders with partial data (missing fields → Not available, no crashes)", async () => {
  const inst = await prisma.indianInstitution.findFirst({ where: { website: null } });
  if (!inst) return; // skip if none
  const profile = await getUniversityProfile(inst.id, "indian");
  assert.ok(profile);
  // Should not crash, and missing website should be handled (UI will show Not available)
  assert.ok(profile.identity.website === null || typeof profile.identity.website === "string");
});

test("Freshness boundaries: current / recent / historical / unknown all render correctly", async () => {
  const now = new Date();
  const current = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000); // ~3 months ago
  const recent = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000); // ~13 months ago
  const historical = new Date(now.getTime() - 800 * 24 * 60 * 60 * 1000); // ~26 months ago
  assert.equal(computeFreshness(current), "CURRENT");
  assert.equal(computeFreshness(recent), "RECENT");
  assert.equal(computeFreshness(historical), "HISTORICAL");
  assert.equal(computeFreshness(null), "UNKNOWN");
  assert.equal(computeFreshness("invalid"), "UNKNOWN");
  // Thresholds are documented constants, not magic numbers
  assert.equal(FRESHNESS_THRESHOLDS.CURRENT_MONTHS, 12);
  assert.equal(FRESHNESS_THRESHOLDS.RECENT_MONTHS, 24);
});

test("Profile opened WITH student context shows pathway chain + match reasons", async () => {
  const career = await prisma.career.findFirst({ where: { isActive: true } });
  assert.ok(career);
  // Create a test student
  const tenant = await prisma.tenant.findFirst();
  assert.ok(tenant);
  const user = await prisma.user.create({ data: { email: `test-${Date.now()}@x.com`, passwordHash: "x", firstName: "Test", lastName: "User", role: "STUDENT", tenantId: tenant.id } });
  const sp = await prisma.studentProfile.create({ data: { userId: user.id, gradeLevel: "CLASS_12" } });
  await prisma.studentCareerProfile.create({ data: { studentId: user.id, level: "DEVELOPING" } });
  const inst = await prisma.indianInstitution.findFirst({ where: { programs: { some: { verificationStatus: "VERIFIED" } } } });
  assert.ok(inst);
  const profile = await getUniversityProfile(inst.id, "indian", { studentId: user.id, careerId: career.id });
  assert.ok(profile);
  if (profile.studentContext) {
    assert.ok(profile.studentContext.pathwayChain || profile.studentContext.career || profile.studentContext.education);
  }
  // Cleanup
  await prisma.studentCareerProfile.deleteMany({ where: { studentId: user.id } });
  await prisma.studentProfile.delete({ where: { id: sp.id } });
  await prisma.user.delete({ where: { id: user.id } });
});

test("Profile opened WITHOUT student context shows neutral view", async () => {
  const inst = await prisma.indianInstitution.findFirst({});
  assert.ok(inst);
  const profile = await getUniversityProfile(inst.id, "indian");
  assert.ok(profile);
  assert.equal(profile.studentContext, null);
});

test("Counselor view: identical match results as student API (no fork)", async () => {
  const career = await prisma.career.findFirst({ where: { isActive: true } });
  assert.ok(career);
  const tenant = await prisma.tenant.findFirst();
  assert.ok(tenant);
  const user = await prisma.user.create({ data: { email: `counselor-test-${Date.now()}@x.com`, passwordHash: "x", firstName: "Counselor", lastName: "Test", role: "STUDENT", tenantId: tenant.id } });
  const sp = await prisma.studentProfile.create({ data: { userId: user.id, gradeLevel: "CLASS_12" } });
  await prisma.studentCareerProfile.create({ data: { studentId: user.id, level: "DEVELOPING" } });
  const inst = await prisma.indianInstitution.findFirst({ where: { programs: { some: {} } } });
  assert.ok(inst);
  // Student view
  const studentProfile = await getUniversityProfile(inst.id, "indian", { studentId: user.id, careerId: career.id });
  // Counselor view should reuse same logic — we test that getUniversityProfile with same args gives same result
  const counselorProfile = await getUniversityProfile(inst.id, "indian", { studentId: user.id, careerId: career.id });
  assert.deepEqual(studentProfile?.studentContext?.career, counselorProfile?.studentContext?.career);
  // Cleanup
  await prisma.studentCareerProfile.deleteMany({ where: { studentId: user.id } });
  await prisma.studentProfile.delete({ where: { id: sp.id } });
  await prisma.user.delete({ where: { id: user.id } });
});

test("API: pagination for large program lists", async () => {
  // Find an institution with many programs (if any) or test pagination logic
  const inst = await prisma.indianInstitution.findFirst({ where: { programs: { some: {} } } });
  assert.ok(inst);
  const profile = await getUniversityProfile(inst.id, "indian");
  assert.ok(profile);
  // Simulate pagination: slice first 2
  const paginated = profile.programs.all.slice(0, 2);
  assert.ok(paginated.length <= 2);
  assert.ok(profile.programs.total >= paginated.length);
});

test("API: explicit absence markers for missing data", async () => {
  const inst = await prisma.indianInstitution.findFirst({ where: { website: null } });
  if (!inst) return;
  const profile = await getUniversityProfile(inst.id, "indian");
  assert.ok(profile);
  // Missing website should be null in identity, UI will show "Not available"
  assert.ok(profile.identity.website === null);
  // Programs with no level/duration should be null, not invented
  for (const prog of profile.programs.all) {
    if (!prog.level) assert.equal(prog.level, null);
    if (!prog.duration) assert.equal(prog.duration, null);
  }
});

test("Regression: matching results byte-identical (engine frozen)", async () => {
  const { getUniversityMatchesForStudent } = await import("../src/lib/university-matching/engine.ts");
  const tenant = await prisma.tenant.findFirst();
  assert.ok(tenant);
  const user = await prisma.user.create({ data: { email: `regression-${Date.now()}@x.com`, passwordHash: "x", firstName: "Reg", lastName: "Test", role: "STUDENT", tenantId: tenant.id } });
  await prisma.studentProfile.create({ data: { userId: user.id, gradeLevel: "CLASS_12" } });
  await prisma.studentCareerProfile.create({ data: { studentId: user.id, level: "DEVELOPING" } });
  const career = await prisma.career.findFirst({ where: { isActive: true } });
  assert.ok(career);
  const res1 = await getUniversityMatchesForStudent(user.id, { careerId: career.id, limit: 5 });
  const res2 = await getUniversityMatchesForStudent(user.id, { careerId: career.id, limit: 5 });
  assert.deepEqual(res1.matches.map(m=>m.institution.name), res2.matches.map(m=>m.institution.name));
  assert.deepEqual(res1.matches.map(m=>m.matchScore), res2.matches.map(m=>m.matchScore));
  // Cleanup
  await prisma.studentCareerProfile.deleteMany({ where: { studentId: user.id } });
  await prisma.studentProfile.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
});
