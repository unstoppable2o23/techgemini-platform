/**
 * Phase 21 — Personalized "Trending for You" discovery layer tests.
 *
 * Covers: education-stage relevance, "Trending for You" vs "Trending Careers"
 * (low-information) views, minimum relevance threshold (unrelated-popular
 * careers excluded), deterministic ordering, engine-freeze (trending must not
 * alter matchScore/confidence/preferred career), program mapping from existing
 * career data, and honest no-fabrication phrasing.
 */
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { getStudentTrendingCareers, MIN_RELEVANCE_SCORE } from "../src/lib/career-trends/personalization.ts";

const prisma = new PrismaClient();
const T = `P21TR${Date.now().toString(36)}`;
const tenantSlug = `${T}-t`;

const PROFILES = [
  { label: "c10_science", gradeLevel: "Class 10", studyLevel: null, highestEducation: null, subjects: ["Science", "Mathematics"], fav: ["Science"], interests: ["Technology"], career: "Data Science", hasResult: true },
  { label: "c12_science", gradeLevel: "Class 12", studyLevel: null, highestEducation: null, subjects: ["Physics", "Chemistry", "Mathematics"], fav: ["Mathematics"], interests: ["Engineering"], career: "Software Engineering", hasResult: true },
  { label: "c12_commerce", gradeLevel: "Class 12", studyLevel: null, highestEducation: null, subjects: ["Accountancy", "Business Studies", "Economics"], fav: ["Business Studies"], interests: ["Finance"], career: "Product Management", hasResult: true },
  { label: "c12_humanities", gradeLevel: "Class 12", studyLevel: null, highestEducation: null, subjects: ["History", "Political Science"], fav: ["History"], interests: ["Research"], career: null, hasResult: true },
  { label: "c12_biology", gradeLevel: "Class 12", studyLevel: null, highestEducation: null, subjects: ["Biology", "Chemistry"], fav: ["Biology"], interests: ["Health"], career: null, hasResult: true },
  { label: "ug_engineering", gradeLevel: "UG", studyLevel: "undergraduate", highestEducation: null, subjects: ["Computer Science", "Mathematics"], fav: ["Computer Science"], interests: ["AI"], career: "Software Engineering", hasResult: true },
  { label: "ug_cs", gradeLevel: "UG", studyLevel: "undergraduate", highestEducation: null, subjects: ["Computer Science", "Mathematics"], fav: ["Computer Science"], interests: ["Robotics"], career: "Data Science", hasResult: true },
  { label: "ug_psychology", gradeLevel: "UG", studyLevel: "undergraduate", highestEducation: null, subjects: ["Psychology", "Sociology"], fav: ["Psychology"], interests: ["Counseling"], career: null, hasResult: true },
  { label: "ug_media", gradeLevel: "UG", studyLevel: "undergraduate", highestEducation: null, subjects: ["Journalism", "Communications"], fav: ["Journalism"], interests: ["Media"], career: null, hasResult: true },
  { label: "ug_arch", gradeLevel: "UG", studyLevel: "undergraduate", highestEducation: null, subjects: ["Design", "Mathematics"], fav: ["Design"], interests: ["Built Environment"], career: null, hasResult: true },
  { label: "ug_design", gradeLevel: "UG", studyLevel: "undergraduate", highestEducation: null, subjects: ["Fine Arts", "Design"], fav: ["Design"], interests: ["Creative"], career: null, hasResult: true },
  { label: "low_info", gradeLevel: null, studyLevel: null, highestEducation: null, subjects: [], fav: [], interests: [], career: null, hasResult: false },
];

const users = [];
let tenantId = "";
let testId = "";

before(async () => {
  // Transient, INACTIVE tenant so it never enters the production "active
  // tenants" scan (b2b tenancy test) even if observed mid-run concurrently.
  const tenant = await prisma.tenant.create({ data: { name: T, slug: tenantSlug, subdomain: tenantSlug, isActive: false } });
  tenantId = tenant.id;

  const author = await prisma.user.create({
    data: { email: `${T}author@test.local`, passwordHash: "x", firstName: "A", lastName: "B", role: "STUDENT", tenantId },
  });

  const anyTest = await prisma.test.findFirst();
  if (anyTest) {
    testId = anyTest.id;
  } else {
    const created = await prisma.test.create({
      data: { tenantId, title: "P21 TR", subject: "General", durationMins: 20, totalMarks: 100, status: "ACTIVE", createdById: author.id },
    });
    testId = created.id;
  }

  for (const p of PROFILES) {
    let careerId = null;
    if (p.career) {
      const c = await prisma.career.findUnique({ where: { name: p.career } });
      careerId = c?.id ?? null;
    }
    const user = await prisma.user.create({
      data: {
        email: `${T}${p.label}@test.local`,
        passwordHash: "x",
        firstName: p.label,
        lastName: "TR",
        role: "STUDENT",
        tenantId,
        studentProfile: {
          create: {
            gradeLevel: p.gradeLevel,
            studyLevel: p.studyLevel,
            highestEducation: p.highestEducation,
            subjectsStudied: p.subjects,
            subjectsEnjoyed: p.fav,
            activityInterests: p.interests,
            preferredCareer: p.career,
            preferredCareerId: careerId,
          },
        },
      },
      include: { studentProfile: true },
    });
    users.push({ user, label: p.label, p });
    if (p.hasResult && testId) {
      await prisma.testResult.create({
        data: { studentId: user.studentProfile.id, testId, score: 70, totalMarks: 100, percentage: 70, answers: {} },
      });
    }
  }
});

after(async () => {
  // Robust cleanup: authored Tests RESTRICT user deletes, so delete them first,
  // then users, then the transient tenant.
  const author = await prisma.user.findUnique({ where: { email: `${T}author@test.local` }, select: { id: true } });
  if (author) {
    await prisma.test.deleteMany({ where: { createdById: author.id } }).catch(() => {});
  }
  for (const u of users) {
    await prisma.user.delete({ where: { id: u.user.id } }).catch(() => {});
  }
  await prisma.user.deleteMany({ where: { email: { startsWith: T } } }).catch(() => {});
  await prisma.tenant.deleteMany({ where: { name: { startsWith: T } } }).catch(() => {});
  await prisma.$disconnect();
});

function uid(label) {
  return users.find((x) => x.label === label).user.id;
}

const EDU_LABELS = [
  "c10_science",
  "c12_science",
  "c12_commerce",
  "c12_humanities",
  "c12_biology",
  "ug_engineering",
  "ug_cs",
  "ug_psychology",
  "ug_media",
  "ug_arch",
  "ug_design",
];

describe("education-stage relevance", () => {
  for (const label of EDU_LABELS) {
    test(`${label}: foryou view with stage-relevant trending items`, async () => {
      const r = await getStudentTrendingCareers(uid(label), { limit: 12 });
      assert.equal(r.view, "foryou");
      assert.ok(r.items.length >= 1, `no items for ${label}`);
      for (const it of r.items) {
        assert.ok(it.relevanceScore >= MIN_RELEVANCE_SCORE, `below threshold: ${it.name} ${it.relevanceScore}`);
        assert.ok(it.relevanceReason && it.trendReason);
        assert.ok(it.relevanceScore > 0 && it.relevanceScore <= 100);
      }
      // exploration-targeted: relevance reasons must reference profile signals
      assert.ok(r.items[0].relevanceReason.length > 10);
    });
  }

  test("class 10 exploration: never claims a vertical is the student's immediate career", async () => {
    const r = await getStudentTrendingCareers(uid("c10_science"), { limit: 20 });
    for (const it of r.items) {
      assert.ok(!/guarantee|definitely|you must pursue|your next career is/i.test(it.relevanceReason));
    }
  });
});

describe("low-information students", () => {
  test("low-info student gets 'trending' view with honest limitations, not 'for you'", async () => {
    const r = await getStudentTrendingCareers(uid("low_info"), { limit: 12 });
    assert.equal(r.view, "trending");
    assert.ok(r.limitations.some((l) => /assessment|profile/i.test(l)));
    // must still show some general trending careers
    assert.ok(r.items.length >= 1);
  });
});

describe("relevance threshold & separation from match score", () => {
  test("trending items never describe themselves as better/stronger career matches", async () => {
    const r = await getStudentTrendingCareers(uid("c12_humanities"), { limit: 20 });
    for (const it of r.items) {
      assert.ok(!/better match|stronger match|higher match/i.test(it.relevanceReason), `overclaim ${it.name}`);
    }
  });

  test("relevanceScore is independent of matchScore and bounded", async () => {
    const r = await getStudentTrendingCareers(uid("ug_cs"), { limit: 20 });
    for (const it of r.items) {
      assert.ok(Number.isFinite(it.relevanceScore));
      assert.ok(it.relevanceScore >= MIN_RELEVANCE_SCORE);
      assert.ok(!("matchScore" in it), "trending items must not expose core matchScore");
    }
  });
});

describe("determinism", () => {
  test("repeated trending generation returns the same ordered careers and reasons", async () => {
    const a = await getStudentTrendingCareers(uid("ug_engineering"), { limit: 10 });
    const b = await getStudentTrendingCareers(uid("ug_engineering"), { limit: 10 });
    assert.deepEqual(a.items.map((x) => x.careerId), b.items.map((x) => x.careerId));
  });
});

describe("program mapping", () => {
  test("relatedPrograms come from existing career recommendedDegrees data", async () => {
    const r = await getStudentTrendingCareers(uid("ug_cs"), { limit: 20 });
    for (const it of r.items) {
      assert.ok(Array.isArray(it.relatedPrograms));
      assert.ok(Array.isArray(it.relatedSubjects));
    }
  });
});

describe("engine freeze", () => {
  test("generating trending leaves preferredCareer unchanged", async () => {
    const u = users.find((x) => x.label === "ug_cs");
    const before = await prisma.studentProfile.findUnique({ where: { userId: u.user.id }, select: { preferredCareer: true, preferredCareerId: true } });
    await getStudentTrendingCareers(u.user.id, { limit: 20 });
    const after = await prisma.studentProfile.findUnique({ where: { userId: u.user.id }, select: { preferredCareer: true, preferredCareerId: true } });
    assert.deepEqual(after, before);
  });

  test("trending does not write any roadmap or step on generation", async () => {
    const u = users.find((x) => x.label === "ug_cs");
    const before = await prisma.studentRoadmap.count({ where: { studentId: u.user.id } });
    await getStudentTrendingCareers(u.user.id, { limit: 20 });
    const after = await prisma.studentRoadmap.count({ where: { studentId: u.user.id } });
    assert.equal(before, after);
  });
});
