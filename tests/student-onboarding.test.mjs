import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { saveCareerPreferences, PrefsValidationError } from "../src/lib/student/profile.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant;
let user, profile;
let career, subject;

before(async () => {
  tenant = await prisma.tenant.create({
    data: { name: "TSO", slug: `tso-${suffix}`, subdomain: `tso-${suffix}` },
  });
  user = await prisma.user.create({
    data: {
      email: `so-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "SO",
      lastName: "A",
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });
  profile = await prisma.studentProfile.create({ data: { userId: user.id } });

  subject = await prisma.subject.create({
    data: { name: `TestSubject ${suffix}`, slug: `test-subject-${suffix}` },
  });
  career = await prisma.career.create({
    data: {
      name: `TestCareer ${suffix}`,
      slug: `test-career-${suffix}`,
      title: `TestCareer ${suffix}`,
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
});

after(async () => {
  const cpIds = (await prisma.studentCareerProfile.findMany({ where: { studentId: user.id }, select: { id: true } })).map((p) => p.id);
  if (cpIds.length) await prisma.studentCareerSignal.deleteMany({ where: { profileId: { in: cpIds } } });
  await prisma.studentCareerProfile.deleteMany({ where: { studentId: user.id } });
  await prisma.studentProfile.deleteMany({ where: { id: profile.id } });
  await prisma.user.deleteMany({ where: { id: user.id } });
  if (subject) await prisma.subject.deleteMany({ where: { id: subject.id } });
  if (career) await prisma.career.deleteMany({ where: { id: career.id } });
  await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  await prisma.$disconnect();
});

test("saveCareerPreferences: valid submission with subjects, career and activities persists and generates signals", async () => {
  const res = await saveCareerPreferences(user.id, {
    nationality: "Indian",
    state: "Kerala",
    studyLevel: "Senior Secondary (Grades 11-12)",
    highestEducation: "Grade 12 / High School",
    gradeLevel: "Grade 12",
    averageGrade: "88",
    exams: ["JEE Main"],
    subjectsStudied: [subject.name],
    subjectsEnjoyed: [subject.name],
    activityInterests: ["Coding / Technology"],
    preferredCareer: career.name,
    targetCountries: ["India"],
    targetColleges: ["IIT Bombay"],
    tuitionBudget: "$10,000 – $20,000 USD",
    fundingSource: "Personal savings or Parents",
    hasEnglishResult: false,
    englishProficiency: "Advanced",
  });
  assert.equal(res.ok, true);

  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.equal(p.nationality, "Indian");
  assert.equal(p.gradeLevel, "Grade 12");
  assert.deepEqual(p.subjectsStudied, [subject.name]);
  assert.equal(p.careerPrefsFilled, true);
  assert.equal(p.targetCountry, "India");

  const cp = await prisma.studentCareerProfile.findUnique({ where: { studentId: user.id } });
  assert.ok(cp, "career profile regenerated");
  const signals = await prisma.studentCareerSignal.findMany({
    where: { profileId: cp.id, value: { startsWith: `subject_studied:${subject.name}` } },
  });
  assert.ok(signals.length > 0, "subject signal created");
});

test("saveCareerPreferences: rejects unknown career", async () => {
  await assert.rejects(
    () => saveCareerPreferences(user.id, { preferredCareer: "Nonexistent Career XYZ", targetCountries: ["India"], targetColleges: ["X"] }),
    (err) => err instanceof PrefsValidationError && err.status === 400
  );
});

test("saveCareerPreferences: rejects unknown subject", async () => {
  await assert.rejects(
    () => saveCareerPreferences(user.id, {
      subjectsStudied: ["Quantum Phytopathology"],
      preferredCareer: career.name,
      targetCountries: ["India"],
      targetColleges: ["X"],
    }),
    (err) => err instanceof PrefsValidationError && err.status === 400
  );
});

test("saveCareerPreferences: 'not finalized' career path is allowed", async () => {
  const res = await saveCareerPreferences(user.id, {
    nationality: "Indian",
    state: "Kerala",
    studyLevel: "Senior Secondary (Grades 11-12)",
    highestEducation: "Grade 12 / High School",
    gradeLevel: "Grade 12",
    averageGrade: "80",
    preferredCareer: "",
    careerNotFinalized: true,
    targetCountries: ["India"],
    targetColleges: ["X"],
    tuitionBudget: "$10,000 – $20,000 USD",
  });
  assert.equal(res.ok, true);
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.equal(p.preferredCareer, null);
});

test("saveCareerPreferences: english score required when hasEnglishResult", async () => {
  await assert.rejects(
    () => saveCareerPreferences(user.id, {
      hasEnglishResult: true,
      englishTestType: "IELTS",
      preferredCareer: career.name,
      targetCountries: ["India"],
      targetColleges: ["X"],
    }),
    (err) => err instanceof PrefsValidationError && err.status === 400
  );
});

test("saveCareerPreferences: returning user update overwrites previous values", async () => {
  await saveCareerPreferences(user.id, {
    nationality: "Indian",
    studyLevel: "Bachelor's Degree",
    highestEducation: "3-Year Bachelor's Degree",
    gradeLevel: "Year 1",
    averageGrade: "75",
    preferredCareer: career.name,
    targetCountries: ["USA"],
    targetColleges: ["MIT"],
    tuitionBudget: "Over $30,000 USD",
  });
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.equal(p.gradeLevel, "Year 1");
  assert.equal(p.targetCountry, "USA");
  assert.deepEqual(p.targetColleges, ["MIT"]);
});
