import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { saveCareerPreferences, PrefsValidationError } from "../src/lib/student/profile.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant, user, profile;
let career, subject, university, institution;
const created = { career: false, subject: false, university: false, institution: false };

before(async () => {
  tenant = await prisma.tenant.create({
    data: { name: "TSO2", slug: `tso2-${suffix}`, subdomain: `tso2-${suffix}` },
  });
  user = await prisma.user.create({
    data: {
      email: `so2-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "SO2",
      lastName: "A",
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });
  profile = await prisma.studentProfile.create({ data: { userId: user.id } });

  // Reuse seeded records where possible so we don't mutate global counts that
  // other tests assert on (e.g. the university/institution unchanged checks).
  subject = await prisma.subject.findFirst({ where: { isActive: true } });
  if (!subject) {
    subject = await prisma.subject.create({ data: { name: `Subj2 ${suffix}`, slug: `subj2-${suffix}` } });
    created.subject = true;
  }
  career = await prisma.career.findFirst({ where: { isActive: true } });
  if (!career) {
    career = await prisma.career.create({
      data: {
        name: `Career2 ${suffix}`,
        slug: `career2-${suffix}`,
        title: `Career2 ${suffix}`,
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
  // Read-only: reuse existing seeded institutions. We never create/delete
  // University or IndianInstitution rows, so global-count assertions in other
  // test files are not disturbed under parallel execution.
  university = await prisma.university.findFirst();
  institution = await prisma.indianInstitution.findFirst();
});

after(async () => {
  const cpIds = (await prisma.studentCareerProfile.findMany({ where: { studentId: user.id }, select: { id: true } })).map((p) => p.id);
  if (cpIds.length) await prisma.studentCareerSignal.deleteMany({ where: { profileId: { in: cpIds } } });
  await prisma.studentCareerProfile.deleteMany({ where: { studentId: user.id } });
  await prisma.studentProfile.deleteMany({ where: { id: profile.id } });
  await prisma.user.deleteMany({ where: { id: user.id } });
  if (created.subject && subject) await prisma.subject.deleteMany({ where: { id: subject.id } });
  if (created.career && career) await prisma.career.deleteMany({ where: { id: career.id } });
  await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  await prisma.$disconnect();
});

const base = {
  nationality: "Indian",
  state: "Kerala",
  averageGrade: "80",
  studyAbroad: "no",
};

test("career saved by canonical id (resolves name from id)", async () => {
  const res = await saveCareerPreferences(user.id, {
    ...base,
    studyLevel: "Class 10",
    highestEducation: "Still in school",
    careerId: career.id,
  });
  assert.equal(res.ok, true);
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.equal(p.preferredCareer, career.name);
});

test("unknown career name is rejected with a friendly error", async () => {
  await assert.rejects(
    () => saveCareerPreferences(user.id, { ...base, studyLevel: "Class 10", highestEducation: "Still in school", preferredCareer: "Nonexistent XYZ" }),
    (err) => err instanceof PrefsValidationError && err.status === 400 && /couldn't find/i.test(err.message)
  );
});

test("subject saved by canonical id", async () => {
  const res = await saveCareerPreferences(user.id, {
    ...base,
    studyLevel: "Class 11",
    highestEducation: "Grade 12 / High School",
    careerId: career.id,
    subjectIdsStudied: [subject.id],
  });
  assert.equal(res.ok, true);
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.deepEqual(p.subjectsStudied, [subject.name]);
});

test("invalid subject id is rejected", async () => {
  await assert.rejects(
    () => saveCareerPreferences(user.id, { ...base, studyLevel: "Class 11", highestEducation: "Grade 12 / High School", careerId: career.id, subjectIdsStudied: ["clrt123notreal"] }),
    (err) => err instanceof PrefsValidationError && err.status === 400
  );
});

test("institution saved by canonical id (university + indian)", async (t) => {
  if (!institution) return t.skip();
  // Create a throwaway University scoped to this test only (the shared test DB
  // has no universities), so global university-count assertions elsewhere are
  // unaffected. Cleaned up in finally.
  const uni = await prisma.university.create({ data: { name: `UniT ${suffix}`, country: "USA", tenantId: tenant.id } });
  try {
    const res = await saveCareerPreferences(user.id, {
      ...base,
      studyAbroad: "yes",
      studyLevel: "Class 12",
      highestEducation: "Grade 12 / High School",
      careerId: career.id,
      targetCollegeIds: [uni.id, institution.id],
      targetCountries: ["USA"],
      tuitionBudget: "$20,000 – $30,000 USD",
    });
    assert.equal(res.ok, true);
    const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    assert.ok(p.targetColleges.includes(uni.name));
    assert.ok(p.targetColleges.includes(institution.name));
  } finally {
    await prisma.university.deleteMany({ where: { id: uni.id } });
  }
});

test("invalid institution id is rejected", async () => {
  await assert.rejects(
    () => saveCareerPreferences(user.id, { ...base, studyAbroad: "yes", studyLevel: "Class 12", highestEducation: "Grade 12 / High School", careerId: career.id, targetCollegeIds: ["badid"], targetCountries: ["USA"], tuitionBudget: "$20,000 – $30,000 USD" }),
    (err) => err instanceof PrefsValidationError && err.status === 400
  );
});

test("domestic student (studyAbroad=no) is NOT required to provide countries/colleges/budget", async () => {
  const res = await saveCareerPreferences(user.id, {
    ...base,
    studyLevel: "Class 8",
    highestEducation: "Still in school",
    careerId: career.id,
  });
  assert.equal(res.ok, true);
});

test("studyAbroad=yes without countries is rejected", async () => {
  await assert.rejects(
    () => saveCareerPreferences(user.id, { ...base, studyAbroad: "yes", studyLevel: "Class 12", highestEducation: "Grade 12 / High School", careerId: career.id, tuitionBudget: "$20,000 – $30,000 USD" }),
    (err) => err instanceof PrefsValidationError && err.status === 400
  );
});

test("study level 'Other' requires a specification", async () => {
  await assert.rejects(
    () => saveCareerPreferences(user.id, { ...base, studyLevel: "Other", careerId: career.id }),
    (err) => err instanceof PrefsValidationError && err.status === 400
  );
  const res = await saveCareerPreferences(user.id, { ...base, studyLevel: "Other", studyLevelOther: "IGCSE Year 11", careerId: career.id });
  assert.equal(res.ok, true);
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.equal(p.studyLevel, "IGCSE Year 11");
});

test("highest education 'Other' requires a specification", async () => {
  await assert.rejects(
    () => saveCareerPreferences(user.id, { ...base, studyLevel: "Class 12", highestEducation: "Other", careerId: career.id }),
    (err) => err instanceof PrefsValidationError && err.status === 400
  );
  const res = await saveCareerPreferences(user.id, { ...base, studyLevel: "Class 12", highestEducation: "Other", highestEducationOther: "Foundation Diploma", careerId: career.id });
  assert.equal(res.ok, true);
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.equal(p.highestEducation, "Foundation Diploma");
});

test("grade is derived from study level (no duplicate question)", async () => {
  const res = await saveCareerPreferences(user.id, { ...base, studyLevel: "Year 2 Undergraduate", highestEducation: "Grade 12 / High School", careerId: career.id });
  assert.equal(res.ok, true);
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.equal(p.gradeLevel, "Year 2 Undergraduate");
});
