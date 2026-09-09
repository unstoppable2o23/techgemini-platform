// Phase 28 — Program & University Intelligence V2.
//
// Covers:
//   1–6   pure normalization: qualification kinds stay distinct, education
//        stage + discipline derivation, conservative next steps
//   7     admissions: verified medical entrances only (registry-reused),
//        "varies by institution" for others, null (never fabricated) otherwise
//   8     availability: VERIFIED only from verified Program rows, honest
//        NOT_VERIFIED state when no evidence exists
//   9–14  searchPrograms: catalog + data-driven facets + saved flags
//   15–16 comparePrograms: up to 3, fixed row order, descriptive not ranking
//   17    roadmap goal-program recognition (additive, reversible)
//   18    shortlist PROGRAM type (add/list/saved) + cap semantics
//   19    analytics program_shortlisted event persists
//   20    protected datasets unchanged (20 / 73969 / 242 / 80 / 0 UNVERIFIED)
//   21    career engine determinism still holds (frozen-engine regression)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  normalizeQualification,
  qualificationKindOf,
  qualificationLevelOf,
  disciplineOf,
  educationStageFitOf,
  nextStepOf,
} from "../src/lib/program-intelligence/normalize.ts";
import { getAdmissionInfo } from "../src/lib/program-intelligence/admissions.ts";
import { coversAcademicProgram, getProgramAvailability, availabilityNote } from "../src/lib/program-intelligence/availability.ts";
import { searchPrograms } from "../src/lib/program-intelligence/search.ts";
import { comparePrograms, MAX_PROGRAM_COMPARE } from "../src/lib/program-intelligence/compare.ts";
import { setGoalProgram, clearGoalProgram } from "../src/lib/roadmap/service.ts";
import { addShortlist, isSaved, listShortlist, removeShortlist } from "../src/lib/student/shortlist.ts";
import { recordProductEvent } from "../src/lib/analytics/record.ts";
import { getCareerMatches } from "../src/lib/career-matching/engine.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant, student;
let csProgram, mbbsProgram, engineeringProgram;
let indianWithPrograms, indianNoPrograms, uniWithPrograms;
let storedTraits = [];

before(async () => {
  tenant = await prisma.tenant.create({
    data: { name: "PH28", slug: `ph28-${suffix}`, subdomain: `ph28-${suffix}` },
  });
  const plan = await prisma.subscriptionPlan.upsert({
    where: { planType: "TRIAL" },
    update: {},
    create: { name: "Trial", planType: "TRIAL" },
  });
  await prisma.subscription.create({
    data: { tenantId: tenant.id, planId: plan.id, status: "TRIAL" },
  });
  student = await prisma.user.create({
    data: {
      email: `ph28-student-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "PH28",
      lastName: "Student",
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });
  await prisma.studentProfile.create({ data: { userId: student.id } });

  csProgram = await prisma.academicProgram.findFirst({
    where: { name: { contains: "Computer Science", mode: "insensitive" }, level: "Bachelor's" },
  });
  mbbsProgram = await prisma.academicProgram.findFirst({
    where: { name: { contains: "MBBS", mode: "insensitive" } },
  });
  engineeringProgram =
    csProgram && csProgram.category === "Engineering"
      ? csProgram
      : await prisma.academicProgram.findFirst({
          where: { category: { contains: "Engineering", mode: "insensitive" }, level: "Bachelor's" },
        });

  const indianRow = await prisma.program.findFirst({
    where: { indianInstitutionId: { not: null } },
    include: { indianInstitution: { select: { id: true } } },
  });
  indianWithPrograms = indianRow?.indianInstitutionId ?? null;
  indianNoPrograms = await prisma.indianInstitution.findFirst({
    where: { programs: { none: {} } },
    select: { id: true },
  });
  const uniRow = await prisma.program.findFirst({
    where: { universityId: { not: null } },
    include: { university: { select: { id: true } } },
  });
  uniWithPrograms = uniRow?.universityId ?? null;

  // Seed deterministic engine signals so the frozen engine returns reproducible,
  // non-empty matches for the regression test.
  const src = await prisma.career.findFirst({
    where: { isActive: true, traits: { some: {} } },
    select: { traits: { select: { dimension: true, value: true } } },
  });
  for (const dim of ["INTEREST", "SUBJECT", "WORK_ENVIRONMENT"]) {
    const hit = (src?.traits ?? []).find((t) => t.dimension === dim);
    if (hit) storedTraits.push({ dimension: hit.dimension, value: hit.value });
  }
  if (storedTraits.length === 0) {
    storedTraits = (src?.traits ?? []).slice(0, 3).map((t) => ({ dimension: t.dimension, value: t.value }));
  }
  const profile = await prisma.studentCareerProfile.create({ data: { studentId: student.id } });
  await prisma.studentCareerSignal.createMany({
    data: storedTraits.map((t) => ({
      profileId: profile.id,
      dimension: t.dimension,
      value: t.value,
      score: 100,
      confidence: 1,
      sourceType: "STUDENT_PROFILE",
      sourceAssessment: null,
    })),
  });
});

after(async () => {
  const users = await prisma.user.findMany({ where: { email: { contains: `-${suffix}@x.com` } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  if (userIds.length) {
    await prisma.productEvent.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.studentShortlist.deleteMany({ where: { studentId: { in: userIds } } });
    await prisma.studentRoadmap.deleteMany({ where: { studentId: { in: userIds } } });
    const cpIds = (await prisma.studentCareerProfile.findMany({ where: { studentId: { in: userIds } }, select: { id: true } })).map((p) => p.id);
    if (cpIds.length) await prisma.studentCareerSignal.deleteMany({ where: { profileId: { in: cpIds } } });
    await prisma.studentCareerProfile.deleteMany({ where: { studentId: { in: userIds } } });
    await prisma.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: `ph28-${suffix}` } } });
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1–4. Normalization
// ---------------------------------------------------------------------------
test("1 · qualification kinds are never collapsed into one 'degree'", () => {
  const cases = [
    ["Diploma", "DIPLOMA", "DIPLOMA", "Diploma"],
    ["Certificate", "CERTIFICATE", "SCHOOL", "Certificate"],
    ["Bachelor's", "BACHELORS", "UNDERGRADUATE", "Bachelor's Degree"],
    ["Professional Degree", "PROFESSIONAL_DEGREE", "UNDERGRADUATE", "Professional Degree"],
    ["Master's", "MASTERS", "POSTGRADUATE", "Master's Degree"],
    ["Postgraduate", "MASTERS", "POSTGRADUATE", "Postgraduate Degree"],
    ["Doctoral", "DOCTORAL", "DOCTORAL", "Doctoral Degree"],
  ];
  for (const [level, kind, family, name] of cases) {
    const q = normalizeQualification(level);
    assert.ok(q, `resolved ${level}`);
    assert.equal(q.kind, kind, `${level} kind`);
    assert.equal(q.level, family, `${level} family`);
    assert.equal(q.name, name, `${level} display name`);
  }
  assert.equal(normalizeQualification(null), null);
  assert.equal(normalizeQualification("Totally Unkown Level"), null);
  assert.equal(qualificationLevelOf("Diploma"), "DIPLOMA");
});

test("2 · discipline derives from the stored category with stable ids", () => {
  const d = disciplineOf("Engineering");
  assert.equal(d.id, "engineering");
  assert.equal(d.name, "Engineering");
  const h = disciplineOf("Healthcare");
  assert.equal(h.id, "healthcare");
  const other = disciplineOf("Quantum Textiles");
  assert.equal(other.name, "Quantum Textiles");
  assert.notEqual(other.id, "");
  assert.deepEqual(disciplineOf(null), { id: "other", name: "Other", category: null });
});

test("3 · education-stage fit keeps the diploma/distinctness guardrail", () => {
  const diploma = educationStageFitOf("Diploma");
  assert.ok(diploma.some((s) => s.includes("Technical route")));
  assert.ok(!diploma.some((s) => s.includes("B.E./B.Tech degree")));
  const bachelors = educationStageFitOf("Bachelor's");
  assert.ok(bachelors.some((s) => s.includes("Class 12 → Undergraduate")));
  const masters = educationStageFitOf("Master's");
  assert.ok(masters.some((s) => s.includes("Postgraduate")));
  assert.deepEqual(educationStageFitOf(null), []);
});

test("4 · next steps are qualification-aware and conservative", () => {
  const diplomaNext = nextStepOf("Diploma", getAdmissionInfo({ programName: "Diploma in Mechanical Engineering", level: "Diploma", category: "Engineering" }));
  assert.ok(diplomaNext.includes("not a B.E./B.Tech degree"));
  const bachelorNext = nextStepOf("Bachelor's", null);
  assert.ok(bachelorNext.includes("confirm their admission requirements"));
  const masterNext = nextStepOf("Master's", null);
  assert.ok(masterNext.includes("prerequisites"));
});

// ---------------------------------------------------------------------------
// 5–7. Admissions
// ---------------------------------------------------------------------------
test("5 · medical entrances reuse the verified registry with source + review date", () => {
  const mbbs = getAdmissionInfo({ programName: "Medicine (MBBS)", level: "Bachelor's", category: "Healthcare" });
  assert.ok(mbbs, "MBBS admission info present");
  assert.ok(mbbs.entranceExam?.toLowerCase().includes("neet-ug"));
  assert.ok(mbbs.source?.label, "source label present");
  assert.ok(mbbs.source?.lastReviewed, "review date present");
  assert.ok(!mbbs.entranceExam?.includes("deadline") && !mbbs.entranceExam?.includes("2025"), "no deadlines/cutoffs fabricated");

  const bds = getAdmissionInfo({ programName: "Dentistry (BDS)", level: "Bachelor's", category: "Healthcare" });
  assert.ok(bds?.entranceExam?.toLowerCase().includes("neet-ug"));

  const pharmacy = getAdmissionInfo({ programName: "Pharmacy (B.Pharm)", level: "Bachelor's", category: "Healthcare" });
  assert.ok(pharmacy, "pharmacy info present");
  assert.ok(!pharmacy.entranceExam?.toLowerCase().includes("neet-ug"), "pharmacy must not default to NEET-UG");
});

test("6 · non-medical programs get institution-varying or null (never one exam for all)", () => {
  const eng = getAdmissionInfo({ programName: "Computer Science (Bachelor's)", level: "Bachelor's", category: "Engineering" });
  assert.equal(eng?.entranceExam, null, "no single universal entrance claimed");
  assert.ok(!eng?.admissionType || eng.admissionType.toLowerCase().includes("varies by institution"));
  const law = getAdmissionInfo({ programName: "Law (BA LLB)", level: "Bachelor's", category: "Law" });
  assert.ok(law?.admissionType.includes("CLAT"));
  const unknown = getAdmissionInfo({ programName: "Airline Pilot Training (CPL)", level: "Bachelor's", category: "Aviation" });
  assert.equal(unknown, null, "unknown route returns null — never invents an exam");
});

test("7 · coversAcademicProgram is conservative", () => {
  assert.equal(coversAcademicProgram("Computer Science", "B.Tech Computer Science and Engineering"), true);
  assert.equal(coversAcademicProgram("Computer Science", "B.Tech Mechanical Engineering"), false);
  assert.equal(coversAcademicProgram("", "Anything"), false);
});

// ---------------------------------------------------------------------------
// 8. Availability
// ---------------------------------------------------------------------------
test("8 · availability is VERIFIED only over verified Program rows", async () => {
  const ga = await getProgramAvailability(prisma, { institutionId: indianWithPrograms, kind: "INDIAN" });
  assert.ok(ga.hasVerified, "exposed institution has verified offered programs");
  assert.ok(ga.verifiedCount > 0);
  assert.ok(ga.qualificationCoverage.length > 0);
  assert.equal(ga.state, "VERIFIED");
  assert.ok(ga.rows.every((r) => r.freshness !== undefined));
  const note = availabilityNote(ga);
  assert.ok(note.title.toLowerCase().includes("verified"));

  const gb = await getProgramAvailability(prisma, { institutionId: indianNoPrograms.id, kind: "INDIAN" });
  assert.equal(gb.state, "NOT_VERIFIED");
  assert.equal(gb.verifiedCount, 0);
  const notVerified = availabilityNote(gb);
  assert.equal(notVerified.title, "Program availability not verified");
  assert.ok(notVerified.body.includes("withheld") || notVerified.body.includes("invented"));

  const gi = await getProgramAvailability(prisma, { institutionId: uniWithPrograms, kind: "INTERNATIONAL" });
  assert.equal(gi.state, "VERIFIED", "global institution availability verified");
  assert.ok(gi.verifiedCount > 0);
});

// ---------------------------------------------------------------------------
// 9–14. Search
// ---------------------------------------------------------------------------
test("9 · search returns normalized catalog items with facets", async () => {
  const res = await searchPrograms({ q: "computer science" });
  assert.ok(res.items.length > 0, "items found");
  const it = res.items[0];
  assert.ok(it.qualification, "qualified item");
  assert.ok(it.discipline.id.length > 0);
  assert.ok(typeof it.nextStep === "string" && it.nextStep.length > 0);
  assert.ok(Array.isArray(it.careers));
  assert.equal(it.saved, false);
  const quals = res.facets.qualification.find((f) => f.value === "Bachelor's");
  assert.ok(quals && quals.count > 0, "qualification facet data-driven");
  assert.ok(res.facets.disciplines.length > 0);
});

test("10 · qualification kind filter narrows to that family", async () => {
  const res = await searchPrograms({ qualification: "MASTERS" });
  assert.ok(res.items.length > 0);
  for (const it of res.items) assert.ok(it.level.toLowerCase().includes("master") || it.qualification?.level === "POSTGRADUATE", `level ${it.level}`);
});

test("11 · discipline filter narrows to the category", async () => {
  const res = await searchPrograms({ discipline: "engineering" });
  assert.ok(res.items.length > 0);
  for (const it of res.items) {
    assert.ok(it.discipline.name.toLowerCase().includes("engineering"), `category ${it.category}`);
  }
});

test("12 · institution facets only exist when data supports them (data-driven)", async () => {
  const res = await searchPrograms({});
  assert.ok(res.facets.countries.length >= 0);
  for (const c of res.facets.countries) assert.ok(c.count > 0, "no zero-count facets");
  for (const s of res.facets.states) assert.ok(s.count > 0);
  for (const t of res.facets.institutionTypes) assert.ok(t.count > 0);
});

test("13 · saved flags reflect a student's PROGRAM shortlist", async () => {
  await addShortlist({ studentId: student.id, itemType: "PROGRAM", itemId: csProgram.id });
  const res = await searchPrograms({ q: "computer science", shortlistProgramIds: [csProgram.id] });
  const match = res.items.find((it) => it.programId === csProgram.id);
  assert.ok(match, "cs program in results");
  assert.equal(match.saved, true);
  await removeShortlist(student.id, "PROGRAM", csProgram.id);
});

test("14 · no-match search returns empty items but facets stay", async () => {
  const res = await searchPrograms({ q: "zzz-no-such-program-xyz" });
  assert.equal(res.items.length, 0);
  assert.ok(res.institutionOfferTotal === 0);
});

// ---------------------------------------------------------------------------
// 15–16. Compare
// ---------------------------------------------------------------------------
test("15 · compare builds up to 3 programs with a fixed documented row order", async () => {
  const ids = [csProgram.id, mbbsProgram.id];
  const cmp = await comparePrograms(ids);
  assert.equal(cmp.programs.length, 2);
  assert.equal(cmp.maxCompare, MAX_PROGRAM_COMPARE);
  const keys = cmp.rowOrder;
  for (const row of cmp.rows) {
    assert.ok(keys.includes(row.key));
    assert.equal(row.values.length, 2);
    assert.ok(row.label.length > 0);
  }
  for (const required of ["program", "qualification", "discipline", "admission", "availability", "nextStep"]) {
    assert.ok(keys.includes(required), `row ${required} present`);
  }
  assert.ok(cmp.clarifier.includes("never a ranking"));
});

test("16 · compare caps input above MAX and never ranks", async () => {
  const more = await prisma.academicProgram.findMany({ where: { isActive: true }, select: { id: true }, take: MAX_PROGRAM_COMPARE + 2 });
  const cmp = await comparePrograms(more.map((m) => m.id));
  assert.ok(cmp.programs.length <= MAX_PROGRAM_COMPARE, "capped");
  for (const row of cmp.rows) {
    if (!row.allUnavailable) {
      assert.ok(row.values.every((v) => v !== ""), "no blank cells");
    }
  }
});

// ---------------------------------------------------------------------------
// 17. Roadmap goal-program recognition
// ---------------------------------------------------------------------------
test("17 · goal program is recorded additively and reversible", async () => {
  const r1 = await setGoalProgram(student.id, csProgram.id);
  assert.equal(r1.ok, true);
  assert.equal(r1.roadmap.goalProgramId, csProgram.id);
  assert.ok(r1.roadmap.goalProgramName.length > 0);

  const bad = await setGoalProgram(student.id, "definitely-not-a-real-id-123");
  assert.equal(bad.ok, false);
  assert.ok(!bad.roadmap);

  const r2 = await clearGoalProgram(student.id);
  assert.equal(r2.roadmap.goalProgramId, null);
  assert.equal(r2.roadmap.goalProgramName, null);
});

// ---------------------------------------------------------------------------
// 18. Shortlist PROGRAM type
// ---------------------------------------------------------------------------
test("18 · PROGRAM shortlist add / list / saved works", async () => {
  await addShortlist({ studentId: student.id, itemType: "PROGRAM", itemId: csProgram.id, note: "explorer" });
  assert.equal(await isSaved(student.id, "PROGRAM", csProgram.id), true);
  const rows = await listShortlist(student.id, "PROGRAM");
  assert.ok(rows.some((r) => r.itemId === csProgram.id));
  await removeShortlist(student.id, "PROGRAM", csProgram.id);
  assert.equal(await isSaved(student.id, "PROGRAM", csProgram.id), false);
});

// ---------------------------------------------------------------------------
// 19. Analytics
// ---------------------------------------------------------------------------
test("19 · program_shortlisted analytics event persists", async () => {
  await recordProductEvent({
    userId: student.id,
    event: "program_shortlisted",
    meta: { programId: csProgram.id },
  });
  const ev = await prisma.productEvent.findFirst({
    where: { userId: student.id, event: "program_shortlisted" },
  });
  assert.ok(ev, "event row exists");
});

// ---------------------------------------------------------------------------
// 20. Protected datasets
// ---------------------------------------------------------------------------
test("20 · program intelligence never mutates protected datasets", async () => {
  assert.equal(await prisma.university.count(), 20);
  assert.equal(await prisma.indianInstitution.count(), 73969);
  assert.equal(await prisma.academicProgram.count(), 242);
  assert.equal(await prisma.program.count(), 80);
  assert.equal(await prisma.program.count({ where: { verificationStatus: "UNVERIFIED" } }), 0);
  assert.equal(await prisma.program.count({ where: { verificationStatus: { not: "VERIFIED" } } }), 0);
});

// ---------------------------------------------------------------------------
// 21. Frozen-engine regression
// ---------------------------------------------------------------------------
test("21 · career engine output is deterministic across runs", async () => {
  const a = await getCareerMatches(student.id);
  const b = await getCareerMatches(student.id);
  assert.ok(a.matches.length > 0, "student has matches");
  const sig = (r) => r.matches.map((m) => `${m.career.id}:${m.career.name}:${m.matchScore}`).join("|");
  assert.equal(sig(a), sig(b), "identical match ranking across runs");
});