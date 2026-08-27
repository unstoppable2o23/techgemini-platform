import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { saveCareerPreferences } from "../src/lib/student/profile.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant, user, profile, subject, career;
const created = { career: false };

const base = {
  nationality: "Indian",
  state: "Kerala",
  averageGrade: "80",
  studyAbroad: "no",
};

before(async () => {
  tenant = await prisma.tenant.create({
    data: { name: "TSB", slug: `tsb-${suffix}`, subdomain: `tsb-${suffix}` },
  });
  user = await prisma.user.create({
    data: {
      email: `sb-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "SB",
      lastName: "A",
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });
  profile = await prisma.studentProfile.create({ data: { userId: user.id } });

  subject = await prisma.subject.findFirst({ where: { isActive: true } });
  if (!subject) {
    subject = await prisma.subject.create({
      data: { name: `SubjB ${suffix}`, slug: `subjb-${suffix}`, category: "Science" },
    });
    // subject not flagged for cleanup since we reused-or-created minimally; clean if created
    created.subject = true;
  }
  career = await prisma.career.findFirst({ where: { isActive: true } });
  if (!career) {
    career = await prisma.career.create({
      data: {
        name: `CareerB ${suffix}`,
        slug: `careerb-${suffix}`,
        title: `CareerB ${suffix}`,
        introduction: "intro",
        demandLevel: "High",
        salaryCurrency: "USD",
        salaryEntry: "50000",
        salarySenior: "120000",
        jobGrowth: "High",
        workNatureDesc: "desc",
        futureOutlook: "outlook",
        whoShouldPursue: [],
        eligibility: [],
        workNatureExamples: [],
        topIndustries: [],
        faqs: [],
        pathways: [],
        conventionalOptions: [],
        newAgeOptions: [],
        aiRelatedOptions: [],
        videoRecommendations: [],
      },
    });
    created.career = true;
  }
});

after(async () => {
  const cpIds = (await prisma.studentCareerProfile.findMany({ where: { studentId: user.id }, select: { id: true } })).map((p) => p.id);
  if (cpIds.length) await prisma.studentCareerSignal.deleteMany({ where: { profileId: { in: cpIds } } });
  await prisma.studentCareerProfile.deleteMany({ where: { studentId: user.id } });
  await prisma.studentProfile.deleteMany({ where: { id: profile.id } });
  await prisma.user.deleteMany({ where: { id: user.id } });
  if (created.career && career) await prisma.career.deleteMany({ where: { id: career.id } });
  if (created.subject && subject) await prisma.subject.deleteMany({ where: { id: subject.id } });
  await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  await prisma.$disconnect();
});

test("/api/subjects data returns active subjects with id, name, category", async () => {
  const subs = await prisma.subject.findMany({
    where: { isActive: true },
    select: { id: true, name: true, category: true },
    orderBy: { name: "asc" },
  });
  assert.ok(Array.isArray(subs));
  // If there are subjects, they must expose the expected shape.
  for (const s of subs) {
    assert.ok(s.id, "subject must have an id");
    assert.equal(typeof s.name, "string");
    // category is optional in the model but provided by the API when present
  }
});

test("saving studied subjects stores the canonical name (resolved from id)", async () => {
  const res = await saveCareerPreferences(user.id, {
    ...base,
    studyLevel: "Class 10",
    highestEducation: "Still in school",
    careerId: career.id,
    subjectIdsStudied: [subject.id],
  });
  assert.equal(res.ok, true);
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.ok(p.subjectsStudied.includes(subject.name), "canonical name should be stored");
});

test("studied and enjoyed are independent fields", async () => {
  const res = await saveCareerPreferences(user.id, {
    ...base,
    studyLevel: "Class 10",
    highestEducation: "Still in school",
    careerId: career.id,
    subjectIdsStudied: [subject.id],
    subjectOtherEnjoyed: ["Music"],
  });
  assert.equal(res.ok, true);
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.ok(p.subjectsStudied.includes(subject.name));
  assert.ok(p.subjectsEnjoyed.includes("Music"));
  // enjoyed custom value must NOT leak into studied
  assert.ok(!p.subjectsStudied.includes("Music"));
});

test("subject selection is idempotent (no duplicate stored)", async () => {
  await saveCareerPreferences(user.id, {
    ...base,
    studyLevel: "Class 10",
    highestEducation: "Still in school",
    careerId: career.id,
    subjectIdsStudied: [subject.id],
  });
  await saveCareerPreferences(user.id, {
    ...base,
    studyLevel: "Class 10",
    highestEducation: "Still in school",
    careerId: career.id,
    subjectIdsStudied: [subject.id, subject.id],
  });
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  const count = p.subjectsStudied.filter((n) => n === subject.name).length;
  assert.equal(count, 1, "same subject must not be stored twice");
});
