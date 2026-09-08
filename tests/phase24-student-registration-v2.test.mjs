import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { saveCareerPreferences, PrefsValidationError } from "../src/lib/student/profile.ts";
import {
  normalizeStage,
  normalizeSubjectName,
  normalizeSubjectList,
  normalizeAverageGrade,
  classifyStudyLevel,
} from "../src/lib/onboarding/normalize.ts";
import { canonicalStageAlias, canonicalSubjectAlias, CANONICAL_SUBJECTS } from "../src/lib/onboarding/vocabulary.ts";
import { validateRegisterPayload, validateCareerPrefsPayload } from "../src/lib/onboarding/validation.ts";
import { detectEducationStage } from "../src/lib/career-matching/score.ts";
import { detectEducationStage as roadmapStage } from "../src/lib/roadmap/education-stage.ts";
import { generateStudentCareerProfile } from "../src/lib/career-profile/generate.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant, user, profile;
let career, subject;
const created = { career: false, subject: false };

before(async () => {
  tenant = await prisma.tenant.create({
    data: { name: "PH24", slug: `ph24-${suffix}`, subdomain: `ph24-${suffix}` },
  });
  user = await prisma.user.create({
    data: {
      email: `ph24-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "PH24",
      lastName: "A",
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });
  profile = await prisma.studentProfile.create({ data: { userId: user.id } });

  subject = await prisma.subject.findFirst({ where: { isActive: true } });
  if (!subject) {
    subject = await prisma.subject.create({ data: { name: `Subj24 ${suffix}`, slug: `subj24-${suffix}` } });
    created.subject = true;
  }
  career = await prisma.career.findFirst({ where: { isActive: true } });
  if (!career) {
    career = await prisma.career.create({
      data: {
        name: `Career24 ${suffix}`,
        slug: `career24-${suffix}`,
        title: `Career24 ${suffix}`,
        introduction: "intro",
        demandLevel: "High",
        salaryCurrency: "INR",
        salaryEntry: "500000",
        salarySenior: "1200000",
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
  if (created.subject && subject) await prisma.subject.deleteMany({ where: { id: subject.id } });
  if (created.career && career) await prisma.career.deleteMany({ where: { id: career.id } });
  await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  await prisma.$disconnect();
});

const signal = (value) => ({
  dimension: "EDUCATION",
  value,
  score: 100,
  confidence: 1,
  sourceType: "STUDENT_PROFILE",
  sourceAssessment: null,
});

// ---------------------------------------------------------------------------
// Part 3 — canonical stage vocabulary + alias normalization (pure)
// ---------------------------------------------------------------------------

test("N1: legacy stage aliases normalize to canonical stages", () => {
  assert.equal(normalizeStage("10th").canonical, true);
  assert.equal(normalizeStage("10th").value, "Class 10");
  assert.equal(normalizeStage("SSC").value, "Class 10");
  assert.equal(normalizeStage("standard 10").value, "Class 10");
  assert.equal(normalizeStage("12th").value, "Class 12");
  assert.equal(normalizeStage("HSC").value, "Class 12");
  assert.equal(normalizeStage("Polytechnic").value, "Diploma (Polytechnic)");
  assert.equal(normalizeStage("diploma in engineering").value, "Diploma (Polytechnic)");
  assert.equal(normalizeStage("Working Professional").value, "Working Professional");
  assert.equal(normalizeStage("Ph.D").value, "Doctoral");
});

test("N2: unknown stage text is preserved (never invented or rewritten)", () => {
  assert.equal(normalizeStage("IGCSE Year 11").canonical, false);
  assert.equal(normalizeStage("IGCSE Year 11").value, "IGCSE Year 11");
  // Legacy register values keep working unchanged (no behavioral rewrite).
  assert.equal(normalizeStage("Pursuing UG").canonical, false);
  assert.equal(normalizeStage("Completed UG").value, "Completed UG");
  assert.equal(normalizeStage("B.Tech").value, "B.Tech");
});

test("N3: persona classification is role-adaptive", () => {
  assert.equal(classifyStudyLevel("Class 10"), "school");
  assert.equal(classifyStudyLevel("Diploma (Polytechnic)"), "diploma");
  assert.equal(classifyStudyLevel("Year 1 Undergraduate"), "undergraduate");
  assert.equal(classifyStudyLevel("Postgraduate"), "postgraduate");
  assert.equal(classifyStudyLevel("Doctoral"), "doctoral");
  assert.equal(classifyStudyLevel("Working Professional"), "working");
  assert.equal(classifyStudyLevel("Something else"), "other");
});

// ---------------------------------------------------------------------------
// Part 6 — subject alias normalization (pure)
// ---------------------------------------------------------------------------

test("N4: subject aliases collapse to canonical labels", () => {
  assert.equal(normalizeSubjectName("Maths"), "Mathematics");
  assert.equal(normalizeSubjectName("math"), "Mathematics");
  assert.equal(normalizeSubjectName("CS"), "Computer Science");
  assert.equal(normalizeSubjectName("Bio"), "Biology");
  assert.equal(normalizeSubjectName("Fine Arts"), "Art & Design");
  assert.equal(normalizeSubjectName("POLITICAL SCIENCE"), "Political Science");
  assert.deepEqual(normalizeSubjectList(["maths", "Mathematics", "Chem"]), ["Mathematics", "Chemistry"]);
  // Unknown name survives for the explicit "Other" path (still rejected as a
  // canonical subject, exactly as before).
  assert.equal(normalizeSubjectName("Astrology"), "Astrology");
  for (const s of CANONICAL_SUBJECTS) {
    assert.equal(canonicalSubjectAlias(s), s);
  }
});

// ---------------------------------------------------------------------------
// Part 10 — structured average grade (pure)
// ---------------------------------------------------------------------------

test("N5: grade conversions produce canonical 0-100 percentage", () => {
  assert.equal(normalizeAverageGrade("85", "percentage"), "85");
  assert.equal(normalizeAverageGrade("8.5", "cgpa"), "85");
  assert.equal(normalizeAverageGrade("3.2", "gpa"), "80");
  assert.equal(normalizeAverageGrade("101", "percentage"), "100");
  assert.equal(normalizeAverageGrade("", "percentage"), "");
  assert.equal(normalizeAverageGrade("abc", "percentage"), "");
});

// ---------------------------------------------------------------------------
// Part 11 — server-authoritative validation schema (pure)
// ---------------------------------------------------------------------------

test("N6: register schema accepts valid and rejects invalid payloads", () => {
  assert.equal(validateRegisterPayload({ firstName: "A", lastName: "B", email: "a@b.com", password: "12345678", gradeLevel: "Class 10" }), null);
  assert.match(validateRegisterPayload({ firstName: "A", lastName: "B", email: "not-an-email", password: "12345678" }), /valid email/i);
  assert.match(validateRegisterPayload({ firstName: "A", lastName: "B", email: "a@b.com", password: "123" }), /8 characters/i);
  assert.match(validateRegisterPayload({ firstName: "", lastName: "B", email: "a@b.com", password: "12345678" }), /first name/i);
  assert.match(validateRegisterPayload({ firstName: "A", lastName: "B", email: "a@b.com", password: "12345678", dateOfBirth: "2100-01-01" }), /future/i);
});

test("N7: career prefs schema is a coarse gate and preserves unknown keys", () => {
  assert.equal(validateCareerPrefsPayload({ studyLevel: "Class 10", careerId: career.id }), null);
  const bad = validateCareerPrefsPayload({ studyLevel: { nested: true } });
  assert.ok(bad, "nested object should be rejected");
});

// ---------------------------------------------------------------------------
// Part 20 — golden equivalence: legacy tokens vs canonical tokens MUST
// produce identical engine stage detection (and thus identical education
// dimension scoring). Roadmap stage must also be unchanged.
// ---------------------------------------------------------------------------

test("G1: engine stage identical for legacy register '10th' vs canonical 'Class 10'", () => {
  // Legacy register pages stored only grade_level (studyLevel was null); the
  // new register normalizes the same field. grade_level signals denote school.
  const legacy = detectEducationStage([signal("grade_level:10th")]);
  const canonical = detectEducationStage([signal("grade_level:Class 10")]);
  assert.equal(legacy, canonical);
  assert.equal(legacy, "SCHOOL");
});

test("G2: engine stage identical for 'Polytechnic' vs 'Diploma (Polytechnic)'", () => {
  const legacy = detectEducationStage([signal("study_level:Polytechnic"), signal("grade_level:Polytechnic")]);
  const canonical = detectEducationStage([signal("study_level:Diploma (Polytechnic)"), signal("grade_level:Diploma (Polytechnic)")]);
  assert.equal(legacy, canonical);
  assert.equal(legacy, "POST_SCHOOL");
});

test("G3: engine stage identical for legacy degree token vs canonical undergraduate", () => {
  const legacy = detectEducationStage([signal("study_level:B.Tech")]);
  const canonical = detectEducationStage([signal("study_level:Year 1 Undergraduate")]);
  assert.equal(legacy, canonical);
  assert.equal(legacy, "POST_SCHOOL");
});

test("G4: engine stage identical for '12th' vs 'Class 12' (school)", () => {
  assert.equal(detectEducationStage([signal("grade_level:12th")]), detectEducationStage([signal("grade_level:Class 12")]));
  assert.equal(detectEducationStage([signal("grade_level:Class 12")]), "SCHOOL");
});

test("G5: roadmap stage identical for legacy vs canonical school tokens", () => {
  assert.equal(roadmapStage({ gradeLevel: "10th" }), roadmapStage({ gradeLevel: "Class 10" }));
  assert.equal(roadmapStage({ gradeLevel: "Class 10" }), "SCHOOL_CLASS10");
});

test("G6: roadmap stage identical for legacy vs canonical diploma tokens (conservative UNKNOWN)", () => {
  assert.equal(roadmapStage({ studyLevel: "Polytechnic" }), roadmapStage({ studyLevel: "Diploma (Polytechnic)" }));
  assert.equal(roadmapStage({ studyLevel: "Diploma (Polytechnic)" }), "UNKNOWN");
});

test("G7: roadmap stage identical for legacy vs canonical working tokens", () => {
  assert.equal(roadmapStage({ gradeLevel: "Working", studyLevel: "Working" }), roadmapStage({ gradeLevel: "Working Professional", studyLevel: "Working Professional" }));
  assert.equal(roadmapStage({ studyLevel: "Working Professional" }), "CAREER_SWITCHER");
});

// ---------------------------------------------------------------------------
// Part 12 — partial draft saves vs finalize (DB)
// ---------------------------------------------------------------------------

test("D1: draft accepts a payload with no preferred career and keeps filled=false", async () => {
  const res = await saveCareerPreferences(user.id, {
    nationality: "Indian",
    state: "Kerala",
    studyLevel: "Class 10",
    highestEducation: "Still in school",
    mode: "draft",
  });
  assert.equal(res.ok, true);
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.equal(p.careerPrefsFilled, false);
});

test("D2: draft persists stage aliases canonically", async () => {
  await saveCareerPreferences(user.id, {
    nationality: "Indian",
    state: "Kerala",
    studyLevel: "10th",
    mode: "draft",
  });
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.equal(p.studyLevel, "Class 10");
  assert.equal(p.gradeLevel, "Class 10");
});

test("D3: draft accepts studyAbroad=yes without countries; finalize rejects", async () => {
  const res = await saveCareerPreferences(user.id, {
    nationality: "Indian",
    state: "Kerala",
    studyLevel: "Class 12",
    highestEducation: "Grade 12 / High School",
    studyAbroad: "yes",
    mode: "draft",
  });
  assert.equal(res.ok, true);
  await assert.rejects(
    () => saveCareerPreferences(user.id, {
      nationality: "Indian",
      state: "Kerala",
      studyLevel: "Class 12",
      highestEducation: "Grade 12 / High School",
      studyAbroad: "yes",
      careerId: career.id,
    }),
    (err) => err instanceof PrefsValidationError
  );
});

test("D4: finalize without a career is rejected; currentProgram persists", async () => {
  await assert.rejects(
    () => saveCareerPreferences(user.id, { studyLevel: "Class 12", mode: "finalize" }),
    (err) => err instanceof PrefsValidationError && /career/i.test(err.message)
  );
  const res = await saveCareerPreferences(user.id, {
    nationality: "Indian",
    state: "Kerala",
    studyLevel: "Diploma (Polytechnic)",
    highestEducation: "Grade 12 / High School",
    careerId: career.id,
    currentProgram: "Diploma in Computer Engineering",
    currentProgramYear: "Year 2",
    mode: "finalize",
  });
  assert.equal(res.ok, true);
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.equal(p.currentProgram, "Diploma in Computer Engineering");
  assert.equal(p.currentProgramYear, "Year 2");
  assert.equal(p.careerPrefsFilled, true);
});

test("D5: resume reflects draft + finalize fields (partial-save path)", async () => {
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.equal(p.careerPrefsFilled, true);
  assert.equal(p.currentProgram, "Diploma in Computer Engineering");
  assert.equal(p.studyLevel, "Diploma (Polytechnic)");
});

test("P1: currentProgram never leaks into career signals", async () => {
  await saveCareerPreferences(user.id, {
    nationality: "Indian",
    state: "Kerala",
    studyLevel: "Year 2 Undergraduate",
    highestEducation: "Grade 12 / High School",
    careerId: career.id,
    currentProgram: "B.Tech Computer Science",
    currentProgramYear: "Year 2",
  });
  await generateStudentCareerProfile(user.id);
  const profile = await prisma.studentCareerProfile.findUnique({ where: { studentId: user.id } });
  const signals = await prisma.studentCareerSignal.findMany({ where: { profileId: profile.id }, select: { value: true } });
  const values = signals.map((s) => s.value);
  assert.ok(!values.some((v) => v.toLowerCase().includes("current_program")), "no current_program signal");
  assert.ok(!values.some((v) => v.toLowerCase().includes("b.tech computer science")), "program text must not leak into signals");
  assert.equal(values.some((v) => v === "study_level:Year 2 Undergraduate"), true);
});

test("P2: subject aliases are accepted and stored canonically", async () => {
  const res = await saveCareerPreferences(user.id, {
    nationality: "Indian",
    state: "Kerala",
    studyLevel: "Class 10",
    highestEducation: "Still in school",
    careerId: career.id,
    subjectsStudied: ["Maths", "Biology"],
    subjectsEnjoyed: ["Computer Science"],
  });
  assert.equal(res.ok, true);
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.ok(p.subjectsStudied.includes("Mathematics"));
  assert.ok(p.subjectsStudied.includes("Biology"));
  assert.ok(p.subjectsEnjoyed.includes("Computer Science"));
});

test("P3: unrecognized subject names are still rejected from the canonical list", async () => {
  await assert.rejects(
    () => saveCareerPreferences(user.id, {
      studyLevel: "Class 10",
      highestEducation: "Still in school",
      careerId: career.id,
      subjectsStudied: ["Astrology"],
    }),
    (err) => err instanceof PrefsValidationError && /subject/i.test(err.message)
  );
});

test("P4: out-of-range average grade is still rejected at the resolver", async () => {
  await assert.rejects(
    () => saveCareerPreferences(user.id, {
      studyLevel: "Class 10",
      highestEducation: "Still in school",
      careerId: career.id,
      averageGrade: "105",
    }),
    (err) => err instanceof PrefsValidationError && /between 0 and 100/i.test(err.message)
  );
});

test("P5: draft English result without score is stored as 'no' instead of failing", async () => {
  await saveCareerPreferences(user.id, {
    nationality: "Indian",
    state: "Kerala",
    studyLevel: "Class 11",
    highestEducation: "Grade 12 / High School",
    hasEnglishResult: true,
    mode: "draft",
  });
  const p = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
  assert.equal(p.hasEnglishResult, false);
});

test("P6: new canonical stage options classify as post-school for the engine", () => {
  const ug = detectEducationStage([signal("study_level:Year 1 Undergraduate"), signal("grade_level:Year 1 Undergraduate")]);
  assert.equal(ug, "POST_SCHOOL");
  const work = detectEducationStage([signal("study_level:Working Professional"), signal("grade_level:Working Professional")]);
  assert.equal(work, "POST_SCHOOL");
});