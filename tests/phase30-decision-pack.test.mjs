// Phase 30 — Counselling Decision Pack & Student Action Plan V1.
//
// Covers the Phase 30 list (20 areas):
//   1  access control at the lib level (student-only, profile guard)
//   2  counselor authorized access (includeCounselor true/false)
//   3  access control at the route level (source-contract static checks)
//   4  determinism (compose + DB loader, byte-identical)
//   5  career statuses + grouping vocabulary preserved verbatim
//   6  no fabricated fit percentages / scores in the pack
//   7  program pathway uses the existing mapping (VERIFIED vs PARTIAL)
//   8  verified-only institution options surfaced when evidence exists
//   9  medical distinctness (MBBS vs BDS) preserved
//  10  diploma vs B.E./B.Tech stays distinct (never flattened)
//  11  missing information surfaced honestly (not hidden)
//  12  action plan determinism + priority rules
//  13  parent summary: six prose strings, no internal trace
//  14  counselor summary is counselor-only (absent for students)
//  15  print / share UI + navigation surface loads
//  16  analytics: 4 new events allowlisted & persisted server-side
//  17  no assessment answers stored in the pack (counts only)
//  18  protected catalog dataset counts unchanged by a pack run
//  19  frozen engine output byte-identical around a pack run
//  20  no Decision Center regression (pure + DB smoke)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { buildDecisionCenter, getDecisionCenter } from "../src/lib/decision-center/center.ts";
import { composeDecisionPack } from "../src/lib/decision-pack/compose.ts";
import { getDecisionPack } from "../src/lib/decision-pack/loader.ts";
import { recordProductEvent } from "../src/lib/analytics/record.ts";
import { getCareerMatches } from "../src/lib/career-matching/engine.ts";
import { getCareerPrograms } from "../src/lib/career-program.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant, analyserStudent, emptyStudent, plannedStudent, noProfileStudent;
let counselorUser, counselorProfile;
let careerA, surgeonCareer, dentistryCareer;

/* ------------------------------ input builders --------------------------- */

const CARD = (id, name) => ({
  id,
  name,
  slug: id,
  title: name,
  category: "Engineering",
  shortDescription: null,
  demandLevel: "High",
  salaryEntry: "$50k",
  isEmerging: false,
});

const MATCH = (id, name, opts = {}) => ({
  careerId: id,
  career: CARD(id, name),
  matchScore: opts.score ?? 80,
  confidenceScore: 0.82,
  matchStrength: opts.strength ?? "strong",
  evidence:
    opts.noneEvidence === true
      ? []
      : [{ dimension: "INTEREST", sourceType: "STUDENT_PROFILE", studentValue: "a", careerValue: "a" }],
  reasons: opts.reasons ?? [{ type: "strength", text: "Strong interest alignment", evidenceType: "ALIGNED" }],
  strengths: opts.strengths ?? ["Strong interest alignment"],
  developmentAreas: [],
  missingEvidence: [],
  verifiedGaps: [],
  dimensionScores: [],
  sourceSummary: [],
  preferenceBoost: false,
  matchTypes: [],
  confidenceDetail: {},
  supportedDimensions: 1,
});

const PROGRAM = (id, name, rel = "PRIMARY", level = "Degree") => ({
  programId: id,
  programName: name,
  level,
  category: "engineering",
  relationshipType: rel,
  priority: 1,
});

const OFFER = (academicProgramId, institutionName, extra = {}) => ({
  academicProgramId,
  programId: `${academicProgramId}-p`,
  programName: "B.Tech Computer Science and Engineering",
  qualification: "Degree",
  studyMode: "Full-time",
  duration: "4 years",
  institutionId: `inst-${academicProgramId}-${institutionName}`,
  institutionName,
  institutionKind: "UNIVERSITY",
  country: "United States",
  state: null,
  city: null,
  source: "official-website",
  sourceUrl: null,
  verifiedAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

function baseInputs(overrides = {}) {
  return {
    profileCompleteness: 100,
    lowInformation: false,
    assessmentCompletedCount: 5,
    assessmentTotal: 5,
    counselorAssigned: true,
    appointmentBooked: false,
    preferredCareerId: null,
    preferredCareerName: null,
    subjectsStudied: ["Mathematics"],
    currentProgram: "Class 12",
    studyLevel: null,
    highestEducation: null,
    studyAbroad: null,
    targetCountries: [],
    educationStageLabel: "Undergraduate",
    careerMatches: [],
    discussedCareerIds: [],
    unresolvedDecisionCount: 0,
    shortlist: { careers: [], programs: [], universities: [] },
    programMappings: {},
    verifiedOffersByProgram: {},
    roadmap: null,
    nextBestAction: null,
    ...overrides,
  };
}

function packInputs(dcInputs = {}, extra = {}) {
  const matches = dcInputs.careerMatches ?? [];
  const center = buildDecisionCenter(baseInputs(dcInputs));
  return {
    student: {
      id: "u1",
      firstName: "Aisha",
      lastName: "Khan",
      gradeLevel: null,
      studyLevel: null,
      educationStageLabel: center.header.educationStageLabel,
      targetCountry: null,
      preferredIntake: null,
      preferredYear: null,
      currentProgram: null,
      state: null,
    },
    assessments: { completed: [], remaining: [], completedCount: 0, total: 5 },
    careerMatches: matches,
    center,
    catalog: [],
    careerNameById: {},
    programNameById: {},
    ...extra,
  };
}

function readRel(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}

function readPath(p) {
  return readFileSync(join(process.cwd(), p), "utf8");
}

/* ---------------------------------- setup ------------------------------- */

before(async () => {
  tenant = await prisma.tenant.create({
    data: { name: "PH30", slug: `ph30-${suffix}`, subdomain: `ph30-${suffix}` },
  });
  const plan = await prisma.subscriptionPlan.upsert({
    where: { planType: "TRIAL" },
    update: {},
    create: { name: "Trial", planType: "TRIAL" },
  });
  await prisma.subscription.create({
    data: { tenantId: tenant.id, planId: plan.id, status: "TRIAL" },
  });

  const mk = (tag, role = "STUDENT") =>
    prisma.user.create({
      data: {
        email: `ph30-${tag}-${suffix}@x.com`,
        passwordHash: "x",
        firstName: "PH30",
        lastName: tag,
        role,
        tenantId: tenant.id,
      },
    });

  analyserStudent = await mk("analyser");
  emptyStudent = await mk("empty");
  plannedStudent = await mk("planned");
  noProfileStudent = await mk("noprofile");
  counselorUser = await mk("counselor", "COUNSELOR");

  counselorProfile = await prisma.counselorProfile.create({
    data: { userId: counselorUser.id },
  });

  await prisma.studentProfile.create({ data: { userId: analyserStudent.id } });
  await prisma.studentProfile.create({ data: { userId: emptyStudent.id } });
  const plannedProfile = await prisma.studentProfile.create({
    data: { userId: plannedStudent.id, counselorId: counselorProfile.id },
  });

  careerA = await prisma.career.findFirst({ where: { isActive: true }, select: { id: true, name: true, slug: true } });
  surgeonCareer = await prisma.career.findFirst({
    where: { OR: [{ name: { contains: "Surgeon", mode: "insensitive" } }, { name: { contains: "Surgery", mode: "insensitive" } }] },
    select: { id: true, name: true, slug: true },
  });
  dentistryCareer = await prisma.career.findFirst({
    where: { name: { contains: "Dent", mode: "insensitive" } },
    select: { id: true, name: true, slug: true },
  });

  // Reuse the proven analyser fixture: real career traits as student signals →
  // deterministic non-empty engine matches.
  const src = await prisma.career.findFirst({
    where: { isActive: true, traits: { some: {} } },
    select: { traits: { select: { dimension: true, value: true } } },
  });
  const storedCareerTraits = [];
  for (const dim of ["INTEREST", "SUBJECT", "WORK_ENVIRONMENT"]) {
    const hit = (src?.traits ?? []).find((t) => t.dimension === dim);
    if (hit) storedCareerTraits.push({ dimension: hit.dimension, value: hit.value });
  }
  if (storedCareerTraits.length === 0) {
    storedCareerTraits.push(...(src?.traits ?? []).slice(0, 3).map((t) => ({ dimension: t.dimension, value: t.value })));
  }
  const profile = await prisma.studentCareerProfile.create({ data: { studentId: analyserStudent.id } });
  await prisma.studentCareerSignal.createMany({
    data: storedCareerTraits.map((t) => ({
      profileId: profile.id,
      dimension: t.dimension,
      value: t.value,
      score: 100,
      confidence: 1,
      sourceType: "STUDENT_PROFILE",
      sourceAssessment: null,
    })),
  });

  // Counselor planning records for the planned student (driver for includeCounselor).
  const program = await prisma.academicProgram.findFirst({ select: { id: true, name: true } });
  if (careerA && program) {
    await prisma.counselorCareerDecision.create({
      data: {
        studentId: plannedProfile.id,
        careerId: careerA.id,
        shortlistedCareer: true,
        selectedPathway: true,
        counselorRecommendation: "Strong fit for the student's goals.",
        createdById: counselorUser.id,
      },
    });
    await prisma.counselorProgramPlan.create({
      data: {
        studentId: plannedProfile.id,
        careerId: careerA.id,
        programId: program.id,
        shortlisted: true,
        createdById: counselorUser.id,
      },
    });
    await prisma.counselorNote.create({
      data: {
        studentId: plannedProfile.id,
        counselorId: counselorProfile.id,
        type: "SESSION",
        content: "Discussed the shortlist in detail.",
      },
    });
    await prisma.counselorAction.create({
      data: {
        studentId: plannedProfile.id,
        counselorId: counselorProfile.id,
        type: "FOLLOW_UP",
        title: "Confirm entrance exam preferences",
        dueDate: new Date("2026-02-01T00:00:00.000Z"),
      },
    });
  }

  // Completed assessment row WITH answers — the pack must never leak them.
  await prisma.testAssignment.create({
    data: {
      tenantId: tenant.id,
      studentId: plannedStudent.id,
      assignedById: counselorUser.id,
      kind: "stream",
      token: `ph30-tok-${suffix}`,
      status: "COMPLETED",
      answers: { __PH30_ANSWER_MARKER__: "never-export-this", stream: "Engineering" },
    },
  });
});

after(async () => {
  const users = await prisma.user.findMany({ where: { email: { contains: `-${suffix}@x.com` } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  if (userIds.length) {
    await prisma.productEvent.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.testAssignment.deleteMany({ where: { studentId: { in: userIds } } });
    const spIds = (await prisma.studentProfile.findMany({ where: { userId: { in: userIds } }, select: { id: true } })).map((p) => p.id);
    if (spIds.length) {
      await prisma.counselorCareerDecision.deleteMany({ where: { studentId: { in: spIds } } });
      await prisma.counselorProgramPlan.deleteMany({ where: { studentId: { in: spIds } } });
      await prisma.counselorNote.deleteMany({ where: { studentId: { in: spIds } } });
      await prisma.counselorAction.deleteMany({ where: { studentId: { in: spIds } } });
    }
    const cpIds = (await prisma.studentCareerProfile.findMany({ where: { studentId: { in: userIds } }, select: { id: true } })).map((p) => p.id);
    if (cpIds.length) await prisma.studentCareerSignal.deleteMany({ where: { profileId: { in: cpIds } } });
    await prisma.studentCareerProfile.deleteMany({ where: { studentId: { in: userIds } } });
    await prisma.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  if (counselorProfile) await prisma.counselorProfile.deleteMany({ where: { id: counselorProfile.id } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: `ph30-${suffix}` } } });
  await prisma.$disconnect();
});

/* ----------------------------- 1. access guards ------------------------- */

test("1 · student-only access + profile guard at the lib level", async () => {
  assert.equal(await getDecisionPack(counselorUser.id), null, "counselor role is rejected");
  assert.equal(await getDecisionPack(noProfileStudent.id), null, "student without a profile is rejected");
  const pack = await getDecisionPack(emptyStudent.id);
  assert.ok(pack, "plain student gets a valid empty pack");
  assert.ok(pack.careerDirections.length > 0, "engine-listed careers honestly appear");
  assert.ok(
    pack.careerDirections.every((d) => d.group === "more_info" && d.status === "MORE_INFORMATION_NEEDED"),
    "no falsified matches for an empty profile"
  );
  assert.equal(pack.snapshot.lowInformation, true);
  assert.equal(pack.student.firstName, "PH30");
  assert.ok(Array.isArray(pack.actionPlan) && pack.actionPlan.length > 0, "an empty pack still proposes next actions");
  assert.ok(pack.disclaimer.length > 20, "guardrail disclaimer present");
  assert.equal(pack.careerMatchCount, undefined, "no non-spec keys start leaking");
});

/* ------------------------ 2. counselor authorized access ----------------- */

test("2 · counselor block appears only via includeCounselor", async () => {
  const studentView = await getDecisionPack(plannedStudent.id);
  assert.ok(studentView, "student view builds");
  assert.equal(studentView.counselor, undefined, "student view must not include counselor records");

  const counselorView = await getDecisionPack(plannedStudent.id, { includeCounselor: true });
  assert.ok(counselorView, "counselor view builds");
  assert.ok(counselorView.counselor, "counselor block present only when authorized");
  const c = counselorView.counselor;
  assert.ok(c.snapshot.profileCompleteness >= 0);
  assert.ok(Array.isArray(c.recommendations.strong));
  assert.ok(Array.isArray(c.gaps));
  assert.equal(c.counselorName, "PH30 counselor", "assigned counselor name resolves");
  assert.equal(c.counselorDecisions.length, 1);
  assert.equal(c.counselorDecisions[0].careerName, careerA?.name, "career id resolves to a real name");
  assert.equal(c.programPlans.length, 1);
  assert.ok(c.programPlans[0].programName && c.programPlans[0].programName !== c.programPlans[0].programId, "program id resolves");
  assert.equal(c.notes.length, 1);
  assert.equal(c.notes[0].content, "Discussed the shortlist in detail.");
  assert.equal(c.openActions.length, 1);
  assert.equal(c.openActions[0].title, "Confirm entrance exam preferences");
  assert.ok(c.discussionTopics.length >= 0);
  assert.ok(c.nextBestActions.length > 0, "counselor summary carries the same action plan");
});

/* ------------------------ 3. route source-contract ----------------------- */

test("3 · route-level access contracts (static)", () => {
  const studentRoute = readRel("src/app/api/student/decision-pack/route.ts");
  assert.match(studentRoute, /getServerSession/);
  assert.match(studentRoute, /const user = session\.user;/);
  assert.ok(!/get\("studentId"\)|body\.studentId/.test(studentRoute), "no client-supplied studentId");
  assert.ok(!/\.studentId\s*=/.test(studentRoute));

  const counselorRoute = readPath("src/app/api/counselor/students/[id]/decision-pack/route.ts");
  assert.match(counselorRoute, /getServerSession/);
  assert.match(counselorRoute, /loadAuthorizedStudent/);

  const studentPage = readPath("src/app/(student)/decision-pack/page.tsx");
  assert.match(studentPage, /fetch\("\/api\/student\/decision-pack"\)/);
  assert.match(studentPage, /mode="student"/);
  const counselorPage = readPath("src/app/(counselor)/students/[id]/decision-pack/page.tsx");
  assert.match(counselorPage, /getDecisionPack/);
  assert.match(counselorPage, /includeCounselor:\s*true/);
  assert.match(counselorPage, /loadAuthorizedStudent/);
});

/* ------------------------------ 4. determinism -------------------------- */

test("4 · deterministic compose + loader output", async () => {
  const inputs = packInputs({
    careerMatches: [MATCH("c1", "Python Developer"), MATCH("c2", "Cloud Architect", { strength: "moderate" })],
    programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
    verifiedOffersByProgram: { p1: [OFFER("p1", "MIT")] },
  });
  assert.equal(JSON.stringify(composeDecisionPack(inputs)), JSON.stringify(composeDecisionPack(inputs)));

  const a = await getDecisionPack(plannedStudent.id, { includeCounselor: true });
  const b = await getDecisionPack(plannedStudent.id, { includeCounselor: true });
  assert.ok(a && b);
  assert.equal(JSON.stringify(a), JSON.stringify(b), "identical persisted state → byte-identical pack");
});

/* ------------------------ 5. status vocabulary --------------------------- */

test("5 · grouping + status vocabulary preserved verbatim", () => {
  const pack = composeDecisionPack(
    packInputs({
      careerMatches: [
        MATCH("c1", "Python Developer", { strength: "strong", score: 92 }),
        MATCH("c2", "Cloud Architect", { strength: "moderate", score: 74 }),
        MATCH("c3", "Data Analyst", { strength: "weak", score: 58 }),
        MATCH("c4", "Security Analyst", { strength: "missing_evidence", score: 0 }),
        MATCH("c5", "UX Designer", { noneEvidence: true, strength: "strong", score: 88 }),
      ],
    })
  );
  assert.equal(pack.careerDirections[0].group, "strong");
  assert.equal(pack.careerDirections[0].status, "RECOMMENDED");
  assert.equal(pack.careerDirections[1].group, "explore");
  assert.equal(pack.careerDirections[1].status, "SUPPORTED");
  assert.equal(pack.careerDirections[2].group, "explore");
  assert.equal(pack.careerDirections[2].status, "EXPLORE");
  const more = pack.careerDirections.filter((d) => d.group === "more_info");
  assert.equal(more.length, 2);
  assert.ok(more.every((d) => d.status === "MORE_INFORMATION_NEEDED"));
  assert.equal(pack.careerDirections.find((d) => d.careerId === "c5")?.supportedByProfile, false);
  assert.equal(pack.careerDirections.find((d) => d.careerId === "c1")?.supportedByProfile, true);
  assert.ok(pack.careerDirections.every((d) => typeof d.stage === "string" && d.stage.length > 0));
});

/* ------------------------- 6. no fabricated scores ----------------------- */

test("6 · the pack never invents fit percentages or scores", () => {
  const pack = composeDecisionPack(
    packInputs({
      careerMatches: [MATCH("c1", "Python Developer", { score: 91 }), MATCH("c2", "Cloud Architect", { score: 42, strength: "weak" })],
    })
  );
  const blob = JSON.stringify(pack);
  assert.ok(!/"matchScore"/.test(blob), "engine scores are excluded");
  assert.ok(!/"fitScore"|"fitPct"|"fitPercent"|"confidenceScore"/.test(blob), "no derived fit values");
  assert.ok(!/Guaranteed|Perfect career|Best university for you/.test(blob));
});

/* ------------------------- 7. VERIFIED / PARTIAL ------------------------- */

test("7 · program pathway follows the existing mapping evidence", () => {
  const verified = composeDecisionPack(
    packInputs({
      careerMatches: [MATCH("c1", "Python Developer")],
      programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
      verifiedOffersByProgram: { p1: [OFFER("p1", "MIT")] },
    })
  );
  const rowV = verified.educationPathways[0];
  assert.equal(rowV.kind, "PROGRAM");
  assert.equal(rowV.verification, "VERIFIED");
  assert.equal(rowV.verifiedInstitutionCount, 1);
  assert.equal(verified.careerDirections[0].program?.verification, "VERIFIED");

  const partial = composeDecisionPack(
    packInputs({
      careerMatches: [MATCH("c1", "Python Developer")],
      programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
      verifiedOffersByProgram: {},
    })
  );
  assert.equal(partial.educationPathways[0].verification, "PARTIAL");
  assert.equal(partial.educationPathways[0].verifiedInstitutionCount, 0);

  // Knowledge-base degree routes are honestly NOT VERIFIED.
  const kb = composeDecisionPack(
    packInputs(
      { careerMatches: [MATCH("c1", "Python Developer")] },
      { catalog: [{ careerId: "c1", careerName: "Python Developer", degreeName: "B.Sc Mathematics", degreeLevel: "Degree", priority: "1" }] }
    )
  );
  const kbRow = kb.educationPathways.find((r) => r.kind === "KNOWLEDGE_BASE");
  assert.ok(kbRow);
  assert.equal(kbRow.programId, null);
  assert.equal(kbRow.verification, "NOT_VERIFIED");
  assert.equal(kbRow.programName, "B.Sc Mathematics");
});

/* ------------------------ 8. institutions verified-only ------------------ */

test("8 · institution options only when verification evidence exists", () => {
  const packed = composeDecisionPack(
    packInputs({
      careerMatches: [MATCH("c1", "Python Developer")],
      programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
      verifiedOffersByProgram: { p1: [OFFER("p1", "Norwestern"), OFFER("p1", "Arizona Tech", { institutionKind: "INDIAN_INSTITUTION", country: null, state: "Gujarat" })] },
      shortlist: { careers: [], programs: [], universities: ["inst-p1-Arizona Tech"] },
    })
  );
  assert.deepEqual(packed.universityOptions.map((o) => o.institutionName), ["Arizona Tech", "Norwestern"]);
  const ar = packed.universityOptions.find((o) => o.institutionName === "Arizona Tech");
  assert.equal(ar?.country, null);
  assert.equal(ar?.state, "Gujarat");
  assert.equal(ar?.saved, true);
  assert.equal(ar?.programId, "p1");

  const noOffers = composeDecisionPack(
    packInputs({
      careerMatches: [MATCH("c1", "Python Developer")],
      programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
      verifiedOffersByProgram: {},
    })
  );
  assert.deepEqual(noOffers.universityOptions, []);
});

/* ---------------------- 9. MBBS vs BDS distinctness ---------------------- */

test("9 · MBBS vs BDS stays distinct in the pack", async () => {
  assert.ok(surgeonCareer && dentistryCareer, "need Surgeon + Dentistry careers");
  const surgeonPrograms = await getCareerPrograms(surgeonCareer.id);
  const dentalPrograms = await getCareerPrograms(dentistryCareer.id);
  assert.ok(surgeonPrograms && dentalPrograms, "both have curated programs");
  assert.ok(surgeonPrograms.some((p) => /MBBS/i.test(p.programName)), "Surgeon maps to MBBS");
  assert.ok(!surgeonPrograms.some((p) => /BDS/i.test(p.programName)), "Surgeon must not map to BDS");
  assert.ok(dentalPrograms.some((p) => /BDS/i.test(p.programName)), "Dentistry maps to BDS");
  assert.ok(!dentalPrograms.some((p) => /MBBS/i.test(p.programName)), "Dentistry must not map to MBBS");

  const sur = composeDecisionPack(
    packInputs({
      careerMatches: [MATCH("sur", "Surgeon")],
      programMappings: { sur: surgeonPrograms.map((p) => ({ programId: p.id, programName: p.programName, level: p.level, category: p.category, relationshipType: p.relationshipType, priority: p.priority })) },
    })
  );
  const surNames = sur.educationPathways.map((r) => r.programName ?? "");
  assert.ok(surNames.some((n) => /MBBS/i.test(n)));
  assert.ok(surNames.every((n) => !/BDS/i.test(n)), "no BDS leakage into the Surgeon pathway");
  const dent = composeDecisionPack(
    packInputs({
      careerMatches: [MATCH("dent", "Dentistry")],
      programMappings: { dent: dentalPrograms.map((p) => ({ programId: p.id, programName: p.programName, level: p.level, category: p.category, relationshipType: p.relationshipType, priority: p.priority })) },
    })
  );
  const dentNames = dent.educationPathways.map((r) => r.programName ?? "");
  assert.ok(dentNames.some((n) => /BDS/i.test(n)));
});

/* ---------------------- 10. diploma never becomes a degree --------------- */

test("10 · diploma stays distinct from B.E./B.Tech", () => {
  const pack = composeDecisionPack(
    packInputs({
      careerMatches: [MATCH("mech", "Mechanical Technician"), MATCH("eng", "Mechanical Engineer")],
      programMappings: {
        mech: [PROGRAM("d1", "Diploma in Mechanical Engineering", "PRIMARY", "Diploma")],
        eng: [PROGRAM("b1", "B.E. in Mechanical Engineering", "PRIMARY", "B.E. or B.Tech")],
      },
    })
  );
  const names = pack.educationPathways.map((r) => r.programName ?? "");
  assert.ok(names.includes("Diploma in Mechanical Engineering"), "diploma row preserved verbatim");
  assert.ok(names.includes("B.E. in Mechanical Engineering"), "degree row preserved verbatim");
  const dip = pack.educationPathways.find((r) => r.programName === "Diploma in Mechanical Engineering");
  assert.ok(dip);
  assert.ok(/Diploma/i.test(dip.level ?? ""), "diploma keeps its qualification identity");
  assert.ok(!/B\.E\.|B\.Tech/.test(dip.programName ?? ""), "diploma is never flattened to a degree");
});

/* ------------------------ 11. missing info honesty ----------------------- */

test("11 · missing information is surfaced, not hidden", () => {
  const pack = composeDecisionPack(
    packInputs({
      profileCompleteness: 0,
      lowInformation: true,
      assessmentCompletedCount: 0,
      careerMatches: [MATCH("c5", "UX Designer", { noneEvidence: true, strength: "strong" })],
    })
  );
  assert.equal(pack.snapshot.lowInformation, true);
  assert.equal(pack.careerDirections[0].group, "more_info");
  assert.equal(pack.careerDirections[0].status, "MORE_INFORMATION_NEEDED");
  assert.deepEqual(pack.educationPathways, []);
  assert.deepEqual(pack.universityOptions, []);
  assert.ok(pack.currentDecision.evidenceStillMissing.length > 0, "gaps surface in the current decision");
  if (pack.currentDecision.decision) {
    assert.ok(pack.currentDecision.decision.label.length > 0);
    assert.ok(pack.currentDecision.decision.href.startsWith("/"));
  }
  assert.ok(pack.currentDecision.why.length > 0, "an honest 'why' is always produced");
  assert.match(pack.parentSummary.whatStillNeedsConfirmation, /confirm/i);
});

/* ---------------------- 12. action plan determinism ---------------------- */

test("12 · action plan priorities + determinism", () => {
  const inputs = packInputs({
    careerMatches: [MATCH("c1", "Python Developer"), MATCH("c2", "Cloud Architect")],
    programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
    nextBestAction: { id: "select_pathway", category: "PATHWAY", label: "Select your preferred pathway", detail: "Pin the career direction.", href: "/career-matches" },
  });
  const plan = composeDecisionPack(inputs).actionPlan;
  const plan2 = composeDecisionPack(inputs).actionPlan;
  assert.equal(JSON.stringify(plan), JSON.stringify(plan2));
  assert.ok(new Set(plan.map((a) => a.id)).size === plan.length, "action ids are unique");
  assert.ok(plan.every((a) => a.done === false), "only actionable steps are emitted");
  assert.equal(plan[0].id, "select_pathway", "the current next decision is the highest priority");
  assert.equal(plan[0].priority, "high");
  assert.equal(plan[plan.length - 1].priority, "low", "counselor step is intentionally low priority");
  assert.equal(plan[plan.length - 1].type, "COUNSELOR");
  const high = plan.filter((a) => a.priority === "high");
  assert.equal(high.length, 1);
  assert.equal(high[0].id, "select_pathway");
  const lows = plan.filter((a) => a.priority === "low");
  assert.ok(lows.every((a) => a.type === "COUNSELOR"));
  for (const a of plan) assert.ok(a.href.startsWith("/"), "every action has a real destination");
  // Sort is by numeric priority rank (high=0 < medium=1 < low=2), then id.
  const RANK = { high: 0, medium: 1, low: 2 };
  const ranks = plan.map((a) => RANK[a.priority]);
  assert.ok(ranks.every((r, i) => i === 0 || r >= ranks[i - 1]));
});

/* ---------------------- 13. parent summary cleanliness ------------------- */

test("13 · parent summary is six prose strings with no internal trace", () => {
  const pack = composeDecisionPack(
    packInputs({
      preferredCareerId: "c1",
      preferredCareerName: "Python Developer",
      careerMatches: [MATCH("c1", "Python Developer")],
      programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
      verifiedOffersByProgram: { p1: [OFFER("p1", "MIT")] },
    })
  );
  const s = pack.parentSummary;
  assert.deepEqual(Object.keys(s).sort(), [
    "careerDirectionsSupported",
    "counselorSupport",
    "nextRecommendedStep",
    "studyPathway",
    "whatStillNeedsConfirmation",
    "whereTheStudentIsNow",
  ]);
  for (const v of Object.values(s)) {
    assert.equal(typeof v, "string");
    assert.ok(v.length > 10, "each prose line is substantive");
  }
  const joined = JSON.stringify(s);
  assert.match(joined, /Aisha/, "addresses the student's family");
  assert.ok(!/recommendedPrograms|counselorBrief|informationGaps|strongOptions|moreInfoOptions|nextDecision/.test(joined), "no internal identifiers");
  assert.ok(!/\bc[0-9]\b|\bp[0-9]\b/.test(joined), "no raw ids leak into parent copy");
});

/* ---------------------- 14. counselor-only summary ----------------------- */

test("14 · counselor summary is strictly counselor-only", () => {
  const counselorInput = {
    counselorName: "Neha Shah",
    careerDecisions: [
      { id: "cd1", careerId: "c1", shortlistedCareer: true, selectedPathway: false, followUpRequired: false, counselorRecommendation: "Encourage B.Tech", studentInterest: true, createdAt: new Date("2026-01-01T00:00:00.000Z") },
    ],
    programPlans: [{ id: "pp1", programId: "p1", shortlisted: true, requiresResearch: false, studentInterested: true }],
    notes: [{ id: "n1", content: "Follow up next month", type: "SESSION", createdAt: new Date("2026-01-02T00:00:00.000Z") }],
    openActions: [{ id: "oa1", title: "Book first counselling", dueDate: new Date("2026-02-01T00:00:00.000Z") }],
  };
  const base = {
    careerMatches: [MATCH("c1", "Python Developer")],
    programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
  };
  const studentPack = composeDecisionPack(packInputs(base));
  assert.equal(studentPack.counselor, undefined, "no counselor block for a student");

  const cPack = composeDecisionPack(
    packInputs(base, { counselor: counselorInput, careerNameById: { c1: "Python Developer" }, programNameById: { p1: "B.Tech Computer Science" } })
  );
  assert.ok(cPack.counselor, "counselor block present when authorized");
  assert.equal(cPack.counselor.counselorName, "Neha Shah");
  assert.equal(cPack.counselor.counselorDecisions[0].careerName, "Python Developer");
  assert.equal(cPack.counselor.counselorDecisions[0].createdAt, "2026-01-01T00:00:00.000Z");
  assert.equal(cPack.counselor.programPlans[0].programName, "B.Tech Computer Science");
  assert.equal(cPack.counselor.notes[0].content, "Follow up next month");
  assert.equal(cPack.counselor.openActions[0].title, "Book first counselling");
  assert.equal(cPack.counselor.nextBestActions.length, cPack.actionPlan.length, "counselor copy mirrors the action plan");
});

/* --------------------------- 15. print / share UI ------------------------ */

test("15 · print + navigation surface is wired", () => {
  const view = readPath("src/components/decision-pack/decision-pack-view.tsx");
  assert.match(view, /PrintButton/);
  assert.match(view, /beforeprint/);
  assert.match(view, /decision_pack_viewed/);
  assert.match(view, /decision_pack_printed/);
  assert.match(view, /decision_pack_action_opened/);
  const printButton = readPath("src/components/decision-pack/print-button.tsx");
  assert.match(printButton, /window\.print/);
  assert.match(printButton, /no-print/);
  const nav = readRel("src/components/layout/nav-config.ts");
  assert.match(nav, /label:\s*"Decision Pack"/);
  assert.match(nav, /href:\s*"\/decision-pack"/);
  const navTest = readRel("tests/navigation.test.mjs");
  assert.match(navTest, /"\/decision-pack"/);
});

/* -------------------------- 16. analytics events ------------------------- */

test("16 · Phase 30 analytics events are allowlisted + persist server-side", async () => {
  const record = readRel("src/lib/analytics/record.ts");
  assert.match(record, /"decision_pack_viewed"/);
  assert.match(record, /"decision_pack_printed"/);
  assert.match(record, /"decision_pack_action_opened"/);
  assert.match(record, /"decision_pack_counselor_reviewed"/);

  const client = readRel("src/lib/analytics/client.ts");
  for (const ev of ["decision_pack_viewed", "decision_pack_printed", "decision_pack_action_opened"]) {
    assert.match(client, new RegExp(ev));
  }
  assert.ok(!/decision_pack_counselor_reviewed/.test(client), "counselor_reviewed must never fire from a client");

  const route = readRel("src/app/api/student/analytics/events/route.ts");
  for (const ev of ["decision_pack_viewed", "decision_pack_printed", "decision_pack_action_opened"]) {
    assert.match(route, new RegExp(ev));
  }
  assert.ok(!/decision_pack_counselor_reviewed/.test(route), "counselor_reviewed not in the student allowlist");

  // Server-side persistence of the counselor event (as the counselor page does).
  await recordProductEvent({ userId: counselorUser.id, event: "decision_pack_counselor_reviewed", meta: { studentId: plannedStudent.id } });
  const row = await prisma.productEvent.findFirst({
    where: { userId: counselorUser.id, event: "decision_pack_counselor_reviewed" },
    select: { event: true, meta: true },
  });
  assert.ok(row);
  assert.deepEqual(row.meta, { studentId: plannedStudent.id });
});

/* --------------------- 17. no assessment answers leak -------------------- */

test("17 · the pack stores assessment counts, never answers", async () => {
  const pure = composeDecisionPack(packInputs({}));
  assert.deepEqual(Object.keys(pure.assessments).sort(), ["completed", "completedCount", "remaining", "total"]);

  const pack = await getDecisionPack(plannedStudent.id, { includeCounselor: true });
  assert.ok(pack);
  assert.ok(pack.assessments.completed.includes("stream"), "completed stream assignment is counted");
  assert.ok(!pack.assessments.remaining.includes("stream"));
  const blob = JSON.stringify(pack);
  assert.ok(!/__PH30_ANSWER_MARKER__/.test(blob), "answers payload never reaches the pack");
  assert.ok(!/"answers"/.test(blob), "'answers' is not a pack key");
});

/* --------------------- 18. protected counts unchanged -------------------- */

test("18 · pack run leaves protected catalog counts untouched", async () => {
  const models = ["career", "degree", "academicProgram", "program", "university", "indianInstitution", "subject", "careerEducationPathway", "careerProgramMapping"];
  const count = async (m) => prisma[m].count();
  const before = {};
  for (const m of models) before[m] = await count(m);

  await getDecisionPack(analyserStudent.id);
  await getDecisionPack(plannedStudent.id, { includeCounselor: true });

  const after = {};
  for (const m of models) after[m] = await count(m);
  assert.deepEqual(after, before, "decision packs are read-only for the protected datasets");
});

/* -------------------- 19. engine byte-identical -------------------------- */

test("19 · frozen engine output unchanged around a pack run", async () => {
  const beforeRun = await getCareerMatches(analyserStudent.id, { limit: 10 });
  assert.ok(beforeRun.matches.length > 0, "analyser must yield matches");
  const pack = await getDecisionPack(analyserStudent.id);
  assert.ok(pack, "pack run over the engine must succeed");
  const afterRun = await getCareerMatches(analyserStudent.id, { limit: 10 });
  assert.equal(JSON.stringify(beforeRun.matches), JSON.stringify(afterRun.matches));
  const packIds = new Set(pack.careerDirections.map((d) => d.careerId));
  const engineIds = afterRun.matches.map((m) => m.careerId);
  assert.ok(engineIds.every((id) => packIds.has(id)), "pack careers are a subset of engine matches");
});

/* ---------------------- 20. decision center regression ------------------- */

test("20 · Decision Center still behaves (pure + DB smoke)", async () => {
  const center = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("c1", "Python Developer", { strength: "strong" }), MATCH("c2", "Cloud Architect", { strength: "moderate" })],
    })
  );
  assert.deepEqual(center.strongOptions.map((o) => o.careerName), ["Python Developer"]);
  assert.deepEqual(center.exploreOptions.map((o) => o.careerName), ["Cloud Architect"]);

  const db = await getDecisionCenter(emptyStudent.id);
  assert.ok(db, "loader still resolves an empty-but-valid state");
  assert.equal(db.strongOptions.length, 0);
});