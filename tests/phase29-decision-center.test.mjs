// Phase 29 — Personalized Career & Education Decision Center V1.
//
// Covers (Part 25 list, 20 areas):
//   1  pure build with an empty profile (no fabrication, honest empty state)
//   2  STRONG / EXPLORE / NEEDS-MORE-INFO grouping + status vocabulary
//   3  career→program pairing with VERIFIED vs NOT VERIFIED program state
//   4  recommended programs: dedupe, cap, career connections, preferred fallback
//   5  institution options: only VERIFIED offers, deterministic, saved flag
//   6  profile-fit "Supported by your profile" (no invented percentages)
//   7  pathway stage precedence (Exploring → Shortlisted → Preferred → Discussions → Selected)
//   8  information gap derivation (deterministic gap ids)
//   9  next decision passthrough + fallback
//  10  roadmap progress card (next step, href, percentages)
//  11  parent summary (tone, destinations, institution counts)
//  12  counselor brief (discussWithStudent reasons, unresolved decisions)
//  13  medical education distinctness (MBBS vs BDS) + diploma stays distinct
//  14  availability honesty: absent evidence -> NOT VERIFIED + empty options
//  15  access control / role & profile guards (lib-level)
//  16  analytics: the 7 new Phase 29 events persist
//  17  student 360 exposes the decision center block (engine reused)
//  18  buildDecisionCenter + getDecisionCenter determinism (refresh/login)
//  19  engine golden regression (engine output unchanged by a decision run)
//  20  DB-backed composition produces all major blocks
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { buildDecisionCenter, getDecisionCenter } from "../src/lib/decision-center/center.ts";
import { recordProductEvent } from "../src/lib/analytics/record.ts";
import { getCareerMatches } from "../src/lib/career-matching/engine.ts";
import { getCareerPrograms } from "../src/lib/career-program.ts";
import { getStudent360 } from "../src/lib/counselor/student360.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant, analyserStudent, emptyStudent, counselorUser, noProfileStudent;
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

const PROGRAM = (id, name, rel = "PRIMARY") => ({
  programId: id,
  programName: name,
  level: "Degree",
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

/* ---------------------------------- setup ------------------------------- */

before(async () => {
  tenant = await prisma.tenant.create({
    data: { name: "PH29", slug: `ph29-${suffix}`, subdomain: `ph29-${suffix}` },
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
        email: `ph29-${tag}-${suffix}@x.com`,
        passwordHash: "x",
        firstName: "PH29",
        lastName: tag,
        role,
        tenantId: tenant.id,
      },
    });

  analyserStudent = await mk("analyser");
  emptyStudent = await mk("empty");
  noProfileStudent = await mk("noprofile");
  counselorUser = await mk("counselor", "COUNSELOR");

  await prisma.studentProfile.create({ data: { userId: analyserStudent.id } });
  await prisma.studentProfile.create({ data: { userId: emptyStudent.id } });

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
});

after(async () => {
  const users = await prisma.user.findMany({ where: { email: { contains: `-${suffix}@x.com` } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  if (userIds.length) {
    await prisma.productEvent.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.studentShortlist.deleteMany({ where: { studentId: { in: userIds } } });
    await prisma.studentRoadmap.deleteMany({ where: { studentId: { in: userIds } } });
    await prisma.testAssignment.deleteMany({ where: { studentId: { in: userIds } } });
    const cpIds = (await prisma.studentCareerProfile.findMany({ where: { studentId: { in: userIds } }, select: { id: true } })).map((p) => p.id);
    if (cpIds.length) await prisma.studentCareerSignal.deleteMany({ where: { profileId: { in: cpIds } } });
    await prisma.studentCareerProfile.deleteMany({ where: { studentId: { in: userIds } } });
    await prisma.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: `ph29-${suffix}` } } });
  await prisma.$disconnect();
});

/* ------------------------------ 1. empty state --------------------------- */

test("1 · empty profile: honest empty state, no fabrication", () => {
  const s = buildDecisionCenter(baseInputs({ profileCompleteness: 0, careerMatches: [], lowInformation: true }));
  assert.equal(s.header.lowInformation, true);
  assert.equal(s.header.profileCompleteness, 0);
  assert.deepEqual(s.strongOptions, []);
  assert.deepEqual(s.exploreOptions, []);
  assert.deepEqual(s.moreInfoOptions, []);
  assert.deepEqual(s.recommendedPrograms, []);
  assert.deepEqual(s.institutionOptions, []);
  assert.equal(s.parentSummary.careerArea, null);
  assert.equal(s.parentSummary.possibleProgram, null);
  assert.equal(s.parentSummary.institutionOptionCount, 0);
  assert.equal(s.selectedPathway.careerId, null);
  assert.equal(s.counselorBrief.needsMoreInformation, true);
  assert.equal(s.nextDecision?.id, "explore_matches");
});

/* --------------------------- 2. grouping + status ----------------------- */

test("2 · grouping and status vocabulary", () => {
  const s = buildDecisionCenter(
    baseInputs({
      careerMatches: [
        MATCH("c1", "Python Developer", { strength: "strong", score: 92 }),
        MATCH("c2", "Cloud Architect", { strength: "moderate", score: 74 }),
        MATCH("c3", "Data Analyst", { strength: "weak", score: 58 }),
        MATCH("c4", "Security Analyst", { strength: "missing_evidence", score: 0 }),
        MATCH("c5", "UX Designer", { noneEvidence: true, strength: "strong", score: 88 }),
      ],
    })
  );
  assert.deepEqual(s.strongOptions.map((o) => o.careerName), ["Python Developer"]);
  assert.equal(s.strongOptions[0].status, "RECOMMENDED");
  assert.deepEqual(s.exploreOptions.map((o) => o.careerName), ["Cloud Architect", "Data Analyst"]);
  assert.equal(s.exploreOptions[0].status, "SUPPORTED");
  assert.equal(s.exploreOptions[1].status, "EXPLORE");
  assert.deepEqual(s.moreInfoOptions.map((o) => o.careerName).sort(), ["Security Analyst", "UX Designer"]);
  assert.ok(s.moreInfoOptions.every((o) => o.status === "MORE_INFORMATION_NEEDED"));
  // Options carry the existing engine numbers untouched.
  assert.equal(s.strongOptions[0].matchScore, 92);
  assert.equal(s.strongOptions[0].confidenceScore, 0.82);
  assert.equal(s.strongOptions[0].matchStrength, "strong");
});

/* --------------------- 3. pairing + VERIFIED / NOT VERIFIED ------------- */

test("3 · program pairing and VERIFIED vs NOT VERIFIED state", () => {
  const s = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("c1", "Python Developer")],
      programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
      verifiedOffersByProgram: { p1: [OFFER("p1", "Stanford")] },
    })
  );
  const o = s.strongOptions[0];
  assert.equal(o.program?.programId, "p1");
  assert.equal(o.program?.programName, "B.Tech Computer Science");
  assert.equal(o.program?.relationshipType, "PRIMARY");
  assert.equal(o.program?.verified, true);
  assert.equal(o.program?.verifiedInstitutionCount, 1);

  // Same pairing, but no verified institution offer → explicit NOT VERIFIED.
  const s2 = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("c1", "Python Developer")],
      programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
      verifiedOffersByProgram: {},
    })
  );
  const o2 = s2.strongOptions[0];
  assert.equal(o2.program?.verified, false);
  assert.equal(o2.program?.verifiedInstitutionCount, 0);
  // The NOT_VERIFIED status word appears in the pairing surface for the UI.
  assert.ok(s2.recommendedPrograms[0]?.verified === false);
});

/* ----------------------- 4. recommended programs ------------------------ */

test("4 · recommended programs: dedupe, cap, connections, preferred fallback", () => {
  const mappings = {
    c1: [PROGRAM("p1", "B.Tech Computer Science")],
    c2: [PROGRAM("p1", "B.Tech Computer Science"), PROGRAM("p9", "M.Tech Computer Science")],
    c3: [PROGRAM("p3", "B.S. Data Science")],
    c4: [PROGRAM("p4", "B.S. Cyber Security")],
    c5: [PROGRAM("p5", "B.Des Product Design")],
    c6: [PROGRAM("p6", "B.Sc Mathematics")],
    c7: [PROGRAM("p7", "B.Sc Physics")],
    c8: [PROGRAM("p8", "B.A. Economics")],
  };
  const s = buildDecisionCenter(
    baseInputs({
      careerMatches: [1, 2, 3, 4, 5, 6, 7, 8].map((i) =>
        MATCH(`c${i}`, `Career ${i}`, { score: 90 - i, strength: i === 1 ? "strong" : "moderate" })
      ),
      programMappings: mappings,
      shortlist: { careers: [], programs: ["p3"], universities: [] },
    })
  );
  // Dedupe: c1 and c2 share p1, so p1 appears once with both connections.
  const p1s = s.recommendedPrograms.filter((p) => p.programId === "p1");
  assert.equal(p1s.length, 1);
  const names = new Set(s.recommendedPrograms.map((p) => p.programId));
  assert.ok(s.recommendedPrograms.length <= 6, "cap at 6");
  assert.ok([...names].slice(0, 6).length <= 6);
  const p1 = p1s[0];
  assert.ok(p1.careerConnections.some((c) => c.careerId === "c1"));
  assert.ok(p1.careerConnections.some((c) => c.careerId === "c2"));
  // Saved program shortlist is reflected.
  assert.equal(s.recommendedPrograms.find((p) => p.programId === "p3")?.saved, true);

  // Preferred career outside the top matches still contributes its program.
  const s2 = buildDecisionCenter(
    baseInputs({
      preferredCareerId: "pref-9",
      preferredCareerName: "Robotics Engineer",
      careerMatches: [MATCH("c1", "Python Developer", { strength: "strong" })],
      programMappings: {
        c1: [PROGRAM("p1", "B.Tech Computer Science")],
        "pref-9": [PROGRAM("p10", "B.Tech Robotics")],
      },
    })
  );
  assert.ok(s2.recommendedPrograms.some((p) => p.programId === "p10"));
  assert.equal(s2.selectedPathway.careerId, "pref-9");
  assert.equal(s2.selectedPathway.careerName, "Robotics Engineer");
});

/* ------------------------ 5. institution options ------------------------ */

test("5 · institution options: verified-only, deterministic, saved flag", () => {
  const offers = {
    p1: [
      OFFER("p1", "Norwestern", { country: "United States" }),
      OFFER("p1", "Arizona Tech", { country: "United States", institutionKind: "INDIAN_INSTITUTION", country: null, state: "Gujarat" }),
    ],
  };
  const s = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("c1", "Python Developer")],
      programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
      verifiedOffersByProgram: offers,
      shortlist: { careers: [], programs: [], universities: ["inst-p1-Arizona Tech"] },
    })
  );
  assert.equal(s.institutionOptions.length, 2);
  // Deterministic sort by institution name.
  assert.deepEqual(s.institutionOptions.map((o) => o.institutionName), ["Arizona Tech", "Norwestern"]);
  const arizona = s.institutionOptions.find((o) => o.institutionName === "Arizona Tech");
  assert.equal(arizona?.institutionKind, "INDIAN_INSTITUTION");
  assert.equal(arizona?.country, null);
  assert.equal(arizona?.saved, true);

  // Program with no VERIFIED offers produces no institution options.
  const s2 = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("c1", "Python Developer")],
      programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
      verifiedOffersByProgram: {},
    })
  );
  assert.deepEqual(s2.institutionOptions, []);
});

/* ------------------------- 6. profile fit (Part 9) ---------------------- */

test("6 · 'Supported by your profile' is evidence-derived, never a percentage", () => {
  const s = buildDecisionCenter(
    baseInputs({
      careerMatches: [
        MATCH("c1", "Python Developer", { strength: "strong" }),
        MATCH("c2", "Security Analyst", { noneEvidence: true, strength: "strong" }),
      ],
    })
  );
  assert.equal(s.strongOptions[0].supportedByProfile, true);
  assert.equal(s.moreInfoOptions[0].supportedByProfile, false);
  // No invented numeric fit anywhere in the payload.
  const blob = JSON.stringify(s);
  assert.ok(!/"fitPct|fitPercent|fitScore"/.test(blob));
});

/* ---------------------- 7. pathway stage precedence --------------------- */

test("7 · pathway stage precedence", () => {
  const mk = (over = {}) =>
    baseInputs({
      careerMatches: [
        MATCH("c1", "Python Developer"),
        MATCH("c2", "Cloud Architect"),
        MATCH("c3", "Data Analyst"),
        MATCH("c4", "DevOps Engineer"),
      ],
      shortlist: { careers: ["c2"], programs: [], universities: [] },
      preferredCareerId: "c3",
      preferredCareerName: "Data Analyst",
      discussedCareerIds: ["c4"],
      roadmap: {
        exists: true,
        progress: 50,
        completedCount: 2,
        stepCount: 8,
        goalCareerId: "c3",
        goalCareerName: "Data Analyst",
        goalProgramId: null,
        goalProgramName: null,
        nextStep: { title: "Research entrance exams", category: "EXAM_PREP" },
      },
      ...over,
    });
  const s = buildDecisionCenter(mk());
  const byName = Object.fromEntries(
    [...s.strongOptions, ...s.exploreOptions, ...s.moreInfoOptions].map((o) => [o.careerName, o.stage])
  );
  // Preferred + roadmap goal → Selected Pathway (top precedence).
  assert.equal(byName["Data Analyst"], "Selected Pathway");
  // Discussed → next precedence.
  assert.equal(byName["DevOps Engineer"], "Discuss With Counselor");
  // Shortlisted.
  assert.equal(byName["Cloud Architect"], "Shortlisted");
  // Untouched.
  assert.equal(byName["Python Developer"], "Exploring");
  assert.equal(s.selectedPathway.pathwaySelected, true);
  assert.equal(s.selectedPathway.careerChosen, true);
});

/* ----------------------------- 8. gaps ---------------------------------- */

test("8 · information gaps are deterministic", () => {
  const gapIds = (s) => s.informationGaps.map((g) => g.id);
  // Empty profile → single funnel gap.
  assert.deepEqual(gapIds(buildDecisionCenter(baseInputs({ profileCompleteness: 0 }))), ["complete_profile"]);
  // Complete profile but no matches → add_match_evidence.
  assert.deepEqual(
    gapIds(buildDecisionCenter(baseInputs({ careerMatches: [], lowInformation: true }))),
    ["add_match_evidence"]
  );
  // Additive flags light up when applicable.
  const s = buildDecisionCenter(
    baseInputs({
      careerMatches: [],
      lowInformation: true,
      assessmentCompletedCount: 2,
      subjectsStudied: [],
      studyAbroad: "yes",
      targetCountries: [],
    })
  );
  assert.deepEqual(gapIds(s), [
    "add_match_evidence",
    "take_assessments",
    "subjects_needed",
    "destination_needed",
  ]);
  // Current-program gap fires when a UG student hasn't stated where they study.
  const s2 = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("c1", "Python Developer")],
      studyLevel: "UG",
      currentProgram: null,
      preferredCareerId: "c1",
      preferredCareerName: "Python Developer",
      shortlist: { careers: ["c1"], programs: [], universities: [] },
    })
  );
  assert.deepEqual(gapIds(s2), ["current_program_needed"]);
  // No career direction when matches exist.
  const s3 = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("c1", "Python Developer")],
      preferredCareerId: null,
    })
  );
  assert.deepEqual(gapIds(s3), ["select_pathway"]);
  // Every gap carries an actionable CTA when it exists.
  for (const g of [...gapIds(s), ...gapIds(s2), ...gapIds(s3)]) {
    const found = [s, s2, s3].map((x) => x.informationGaps).flat().find((x) => x.id === g);
    assert.ok(found?.action?.href, "gap should come with an action");
  }
});

/* -------------------------- 9. next decision ---------------------------- */

test("9 · next decision passthrough and fallback", () => {
  const s = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("c1", "Python Developer")],
      nextBestAction: { id: "select_pathway", category: "PATHWAY", label: "Select your preferred pathway", detail: "Pin the career direction.", href: "/career-matches" },
    })
  );
  assert.equal(s.nextDecision?.id, "select_pathway");
  assert.equal(s.nextDecision?.href, "/career-matches");
  const s2 = buildDecisionCenter(baseInputs({ nextBestAction: null }));
  assert.equal(s2.nextDecision?.id, "explore_matches");
});

/* --------------------------- 10. roadmap card --------------------------- */

test("10 · roadmap progress card", () => {
  const noRoadmap = buildDecisionCenter(baseInputs());
  assert.equal(noRoadmap.roadmapProgress.exists, false);
  assert.equal(noRoadmap.roadmapProgress.percent, 0);
  assert.equal(noRoadmap.roadmapProgress.nextStep, null);

  const s = buildDecisionCenter(
    baseInputs({
      preferredCareerId: "c1",
      careerMatches: [MATCH("c1", "Python Developer")],
      roadmap: {
        exists: true,
        progress: 62,
        completedCount: 5,
        stepCount: 8,
        goalCareerId: "c1",
        goalCareerName: "Python Developer",
        goalProgramId: "p1",
        goalProgramName: "B.Tech Computer Science",
        nextStep: { title: "Submit applications", category: "APPLICATION" },
      },
    })
  );
  assert.equal(s.roadmapProgress.exists, true);
  assert.equal(s.roadmapProgress.percent, 62);
  assert.equal(s.roadmapProgress.completedCount, 5);
  assert.equal(s.roadmapProgress.goalProgramName, "B.Tech Computer Science");
  assert.equal(s.roadmapProgress.nextStep?.title, "Submit applications");
  assert.equal(s.roadmapProgress.nextStep?.category, "APPLICATION");
  assert.equal(s.roadmapProgress.nextStep?.href, "/roadmap");
  // Selected pathway pulls the roadmap goal-program.
  assert.equal(s.selectedPathway.programName, "B.Tech Computer Science");
});

/* --------------------------- 11. parent summary ------------------------- */

test("11 · parent summary tone + destinations", () => {
  const goods = {
    p1: [
      OFFER("p1", "MIT", { country: "United States" }),
      OFFER("p1", "IIT Delhi", { institutionKind: "INDIAN_INSTITUTION", country: null, state: "Delhi" }),
    ],
  };
  const s = buildDecisionCenter(
    baseInputs({
      preferredCareerId: "c1",
      preferredCareerName: "Python Developer",
      careerMatches: [MATCH("c1", "Python Developer")],
      programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
      verifiedOffersByProgram: goods,
      shortlist: { careers: [], programs: [], universities: [] },
    })
  );
  assert.equal(s.parentSummary.careerArea, "Python Developer");
  assert.equal(s.parentSummary.possibleProgram, "B.Tech Computer Science");
  assert.equal(s.parentSummary.institutionOptionCount, 2);
  assert.deepEqual(s.parentSummary.destinations, ["India", "United States"]);
  // counselorAssigned + discussWithStudent (gaps present? none) — preferred set → helpful tone.
  assert.equal(s.parentSummary.counselorRecommendation.tone, "helpful");

  // discussWithStudent true (unresolved decision) → recommended tone.
  const s2 = buildDecisionCenter(
    baseInputs({
      preferredCareerId: "c1",
      preferredCareerName: "Python Developer",
      careerMatches: [MATCH("c1", "Python Developer")],
      unresolvedDecisionCount: 1,
      shortlist: { careers: ["c1"], programs: [], universities: [] },
    })
  );
  assert.equal(s2.parentSummary.counselorRecommendation.tone, "recommended");
});

/* -------------------------- 12. counselor brief ------------------------- */

test("12 · counselor brief reasons + discussWithStudent", () => {
  const s = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("c1", "Python Developer")],
      unresolvedDecisionCount: 1,
      shortlist: { careers: ["c1"], programs: [], universities: [] },
    })
  );
  assert.equal(s.counselorBrief.discussWithStudent, true);
  assert.ok(s.counselorBrief.reasons.some((r) => /pending counselor discussion/i.test(r)));
  assert.equal(s.counselorBrief.unresolvedDecisionCount, 1);
  assert.equal(s.counselorBrief.shortlistedCareerCount, 1);

  const calm = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("c1", "Python Developer")],
      preferredCareerId: "c1",
      preferredCareerName: "Python Developer",
    })
  );
  assert.ok(calm.counselorBrief.reasons.every((r) => !/pending counselor/i.test(r)));
  assert.equal(calm.counselorBrief.discussedCareerCount, 0);
});

/* -------------------- 13. medical + diploma distinctness ---------------- */

test("13 · MBBS vs BDS stays distinct; diploma isn't flattened to a degree", async () => {
  assert.ok(surgeonCareer && dentistryCareer, "need Surgeon + Dentistry careers");
  const surgeonPrograms = await getCareerPrograms(surgeonCareer.id);
  const dentalPrograms = await getCareerPrograms(dentistryCareer.id);
  assert.ok(surgeonPrograms && dentalPrograms, "both have curated programs");
  const surgeonNames = surgeonPrograms.map((p) => p.programName);
  const dentalNames = dentalPrograms.map((p) => p.programName);
  assert.ok(surgeonNames.some((n) => /MBBS/i.test(n)), "Surgeon maps to MBBS");
  assert.ok(!surgeonNames.some((n) => /BDS/i.test(n)), "Surgeon must not map to BDS");
  assert.ok(dentalNames.some((n) => /BDS/i.test(n)), "Dentistry maps to BDS");
  assert.ok(!dentalNames.some((n) => /MBBS/i.test(n)), "Dentistry must not map to MBBS");

  // The decision center surfaces mappings verbatim — no flattening.
  const s = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("surgeon", "Surgeon")],
      programMappings: { surgeon: [PROGRAM("mbbs", "MBBS (Bachelor of Medicine, Bachelor of Surgery)")] },
    })
  );
  assert.ok(/MBBS/i.test(s.strongOptions[0].program?.programName ?? ""));

  // Diploma (technical) is a distinct qualification level in the catalog.
  const diploma = await prisma.academicProgram.findFirst({
    where: { level: { contains: "Diploma", mode: "insensitive" }, isActive: true },
    select: { id: true, name: true, level: true },
  });
  const degree = await prisma.academicProgram.findFirst({
    where: { level: { contains: "B.E. or B.Tech", mode: "insensitive" }, isActive: true },
    select: { id: true, name: true, level: true },
  });
  // Whichever exists, the decision center never collapses them: it forwards the
  // exact levelled program names from the existing mappings (diploma ≠ degree).
  const diplomaProgram = diploma
    ? { programId: diploma.id, programName: diploma.name, level: diploma.level, category: "engineering", relationshipType: "PRIMARY", priority: 1 }
    : PROGRAM("dip-1", "Diploma in Mechanical Engineering");
  const s2 = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("mech", "Mechanical Technician")],
      programMappings: { mech: [diplomaProgram] },
    })
  );
  const p2 = s2.strongOptions[0].program;
  assert.ok(p2, "mechanical career should pair with a program");
  assert.ok(
    /Diploma/i.test(p2.level ?? "") || /Diploma/i.test(p2.programName ?? ""),
    "diploma program keeps its Diploma identity"
  );
  void degree;
});

/* ----------------------- 14. availability honesty ----------------------- */

test("14 · absent verification evidence → NOT VERIFIED, no offers", () => {
  const s = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("c1", "Python Developer")],
      programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
    })
  );
  assert.equal(s.recommendedPrograms[0]?.verified, false);
  assert.deepEqual(s.institutionOptions, []);
  assert.equal(s.parentSummary.institutionOptionCount, 0);
  const blob = JSON.stringify(s);
  assert.ok(!/Guaranteed|Best university for you|Perfect career/.test(blob));
});

/* --------------------------- 15. access control ------------------------- */

test("15 · role + profile guards at the lib level", async () => {
  assert.equal(await getDecisionCenter(counselorUser.id), null, "counselor role is rejected");
  assert.equal(await getDecisionCenter(noProfileStudent.id), null, "student without profile is rejected");
  assert.ok(await getDecisionCenter(emptyStudent.id) !== null, "plain student loads an empty-but-valid state");
  const plain = await getDecisionCenter(emptyStudent.id);
  assert.equal(plain?.strongOptions.length, 0, "nothing is strongly recommended for an empty profile");
  assert.equal(plain?.header.lowInformation, true, "low-information honesty preserved");
  // Any engine-listed careers stay in the honest "needs more information"
  // bucket — never presented as matches.
  assert.ok(
    (plain?.moreInfoOptions ?? []).every((o) => o.status === "MORE_INFORMATION_NEEDED")
  );
});

/* -------------------------- 16. analytics events ------------------------ */

test("16 · the 7 new decision-center events persist", async () => {
  const userId = emptyStudent.id;
  await recordProductEvent({ userId, event: "decision_center_viewed", meta: { group: "strong" } });
  await recordProductEvent({ userId, event: "career_option_opened", careerId: careerA?.id, meta: { group: "STRONG" } });
  await recordProductEvent({ userId, event: "program_option_opened", meta: { programId: "p1" } });
  await recordProductEvent({ userId, event: "institution_option_opened", meta: { institutionId: "inst-1" } });
  await recordProductEvent({ userId, event: "decision_shortlisted", meta: { itemType: "CAREER", itemId: "c1" } });
  await recordProductEvent({ userId, event: "pathway_selected", meta: { href: "/career-matches" } });
  await recordProductEvent({ userId, event: "counselor_review_clicked", meta: {} });
  const events = new Set(
    (
      await prisma.productEvent.findMany({
        where: {
          userId,
          event: {
            in: [
              "decision_center_viewed",
              "career_option_opened",
              "program_option_opened",
              "institution_option_opened",
              "decision_shortlisted",
              "pathway_selected",
              "counselor_review_clicked",
            ],
          },
        },
        select: { event: true },
      })
    ).map((r) => r.event)
  );
  assert.deepEqual([...events].sort(), [
    "career_option_opened",
    "counselor_review_clicked",
    "decision_center_viewed",
    "decision_shortlisted",
    "institution_option_opened",
    "pathway_selected",
    "program_option_opened",
  ]);
});

/* ---------------------------- 17. 360 block ----------------------------- */

test("17 · student 360 exposes the decision center (engine reused)", async () => {
  const s360 = await getStudent360(analyserStudent.id);
  assert.ok(s360);
  assert.ok(s360.decisionCenter, "decisionCenter block present");
  assert.equal(s360.journey?.careerMatchCount, s360.careerMatches.length, "engine runs once");
  assert.equal(
    s360.decisionCenter.strongOptions.length +
      s360.decisionCenter.exploreOptions.length +
      s360.decisionCenter.moreInfoOptions.length,
    s360.careerMatches.length,
    "all matches are bucketed, none dropped or invented"
  );
  assert.ok(Array.isArray(s360.decisionCenter.counselorBrief.reasons));
});

/* --------------------------- 18. determinism ---------------------------- */

test("18 · build + getDecisionCenter determinism (refresh/login)", async () => {
  const inputs = baseInputs({
    careerMatches: [MATCH("c1", "Python Developer"), MATCH("c2", "Cloud Architect", { strength: "moderate" })],
    programMappings: { c1: [PROGRAM("p1", "B.Tech Computer Science")] },
    verifiedOffersByProgram: { p1: [OFFER("p1", "MIT")] },
  });
  const a = buildDecisionCenter(inputs);
  const b = buildDecisionCenter(inputs);
  assert.equal(JSON.stringify(a), JSON.stringify(b));

  // DB-backed loader determinism over the same persisted rows.
  const matches = await getCareerMatches(analyserStudent.id, { limit: 5 });
  const d1 = await getDecisionCenter(analyserStudent.id, { careerMatches: matches.matches });
  const d2 = await getDecisionCenter(analyserStudent.id, { careerMatches: matches.matches });
  assert.ok(d1, "decision center must exist for analyser");
  assert.equal(JSON.stringify(d1), JSON.stringify(d2));
});

/* ------------------- 19. engine golden regression ----------------------- */

test("19 · engine output is byte-identical around a decision run", async () => {
  const beforeRun = await getCareerMatches(analyserStudent.id, { limit: 10 });
  assert.ok(beforeRun.matches.length > 0, "analyser must yield matches");
  const center = await getDecisionCenter(analyserStudent.id);
  assert.ok(center, "decision run over the engine must succeed");
  const afterRun = await getCareerMatches(analyserStudent.id, { limit: 10 });
  assert.equal(JSON.stringify(beforeRun.matches), JSON.stringify(afterRun.matches));
  // The center surfaces the engine numbers verbatim (no rescoring).
  const centerIds = [
    ...center.strongOptions,
    ...center.exploreOptions,
    ...center.moreInfoOptions,
  ].map((o) => o.careerId);
  const engineById = Object.fromEntries(afterRun.matches.map((m) => [m.careerId, m]));
  for (const o of [
    ...center.strongOptions,
    ...center.exploreOptions,
    ...center.moreInfoOptions,
  ]) {
    const m = engineById[o.careerId];
    if (!m) continue;
    assert.equal(o.matchScore, m.matchScore, `score for ${o.careerId} unchanged`);
    assert.equal(o.confidenceScore, m.confidenceScore, `confidence for ${o.careerId} unchanged`);
    assert.equal(o.matchStrength, m.matchStrength, `strength for ${o.careerId} unchanged`);
  }
  void centerIds;
});

/* -------------------------- 20. DB composition -------------------------- */

test("20 · DB-backed full composition", async () => {
  const c1 = careerA;
  assert.ok(c1);
  const matches = [{ careerId: c1.id, career: CARD(c1.id, c1.name), matchScore: 90, confidenceScore: 0.9, matchStrength: "strong", evidence: [{}], reasons: [], strengths: [] }];
  const s = await getDecisionCenter(analyserStudent.id, { careerMatches: matches });
  assert.ok(s);
  assert.equal(s.strongOptions.length, 1);
  assert.equal(s.strongOptions[0].careerId, c1.id);
  assert.ok(s.header.educationStageLabel);
  assert.ok(Array.isArray(s.informationGaps));
  // Strongly-matched career with evidence is never pushed into the
  // "needs more information" bucket.
  assert.equal(s.moreInfoOptions.length, 0);
});