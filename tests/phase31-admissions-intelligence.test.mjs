// Phase 31 — Admissions & Counselling Intelligence V1.
//
// Covers the Phase 31 list (22 areas):
//   1  status / readiness vocabulary
//   2  unknown vs not-verified semantics (UNKNOWN is first-class)
//   3  official-source registry integrity + official-only domains
//   4  determinism (byte-identical pure builders)
//   5  student isolation (self-scoped read surfaces only)
//   6  counselor authorization (authorized student only)
//   7  medical pathway distinctness (medicine/dentistry/pharmacy/nursing/physio)
//   8  diploma vs B.E./B.Tech distinction
//   9  no fabricated cutoffs/deadlines/probability/eligibility verdicts
//  10  Decision Center integration (admissionsGuidance field, reused engine)
//  11  Decision Pack integration (per-pathway admissions, parent-friendly)
//  12  Student 360 integration (counselor surface reads the same guidance)
//  13  analytics allowlist (4 admissions_* events student-firable)
//  14  protected catalog counts unchanged around guidance runs
//  15  frozen engine byte-identical around guidance runs
//  16  no application-submission surface anywhere
//  17  INFORMATION_MISSING state when no pathway exists
//  18  official-source links are official domains only
//  19  medical distinctness at the pack level (MBBS vs BDS preserved)
//  20  unknown wording + status-text-with-icon copy on the UI surfaces
//  21  readiness rules (READY vs NEEDS vs MISSING)
//  22  route/UI integration (nav + REAL_STUDENT_ROUTES + build)
//  23  counselling-process copy is specific but never over-certain (P3)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { buildDecisionCenter, getDecisionCenter } from "../src/lib/decision-center/center.ts";
import { composeDecisionPack } from "../src/lib/decision-pack/compose.ts";
import { getCareerMatches } from "../src/lib/career-matching/engine.ts";
import { recordProductEvent } from "../src/lib/analytics/record.ts";
import {
  buildAdmissionsGuidance,
  buildProgramAdmissionGuidance,
  PROGRAM_VERIFICATION_RANK,
  focusProgramAdmission,
} from "../src/lib/admissions-intelligence/guidance.ts";
import {
  OFFICIAL_SOURCES,
  getOfficialSource,
  isOfficialSourceUrl,
  resolveCitedSource,
} from "../src/lib/admissions-intelligence/sources.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

const READINESS_SET = new Set([
  "READY_TO_RESEARCH",
  "NEEDS_VERIFICATION",
  "INFORMATION_MISSING",
]);
const VERIFY_STATE_SET = new Set([
  "VERIFIED",
  "PARTIALLY_VERIFIED",
  "SOURCE_AVAILABLE",
  "NOT_VERIFIED",
  "UNKNOWN",
]);
const MODELS = [
  "career",
  "degree",
  "academicProgram",
  "program",
  "university",
  "indianInstitution",
  "subject",
  "careerEducationPathway",
  "careerProgramMapping",
];

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

const PROGRAM = (id, name, rel = "PRIMARY", level = "Degree", category = "engineering") => ({
  programId: id,
  programName: name,
  level,
  category,
  relationshipType: rel,
  priority: 1,
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

function readRel(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}
function readPath(p) {
  return readFileSync(join(process.cwd(), p), "utf8");
}

/* ---------------------------------- setup ------------------------------- */

let tenant, student, studentProfile, beforeCounts;

before(async () => {
  beforeCounts = {};
  for (const m of MODELS) beforeCounts[m] = await prisma[m].count();

  tenant = await prisma.tenant.create({
    data: { name: "PH31", slug: `ph31-${suffix}`, subdomain: `ph31-${suffix}` },
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
      tenantId: tenant.id,
      email: `ph31-${suffix}@test.local`,
      passwordHash: "x",
      role: "STUDENT",
      firstName: "Admissions",
      lastName: "Student",
    },
  });
  studentProfile = await prisma.studentProfile.create({
    data: { userId: student.id },
  });
});

after(async () => {
  if (studentProfile) await prisma.studentProfile.delete({ where: { userId: student.id } }).catch(() => {});
  if (student) await prisma.user.delete({ where: { id: student.id } }).catch(() => {});
  if (tenant) await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
  await prisma.$disconnect();
});

/* ------------------------------ pure helpers ----------------------------- */

function guidanceForPrograms(programs, opts = {}) {
  return buildAdmissionsGuidance({
    focusPrograms: programs,
    hasCareerDirection: opts.direction ?? true,
    counselorAssigned: opts.counselor ?? false,
  });
}

/* 1 · status / readiness vocabulary */
test("1 · readiness + verification vocabulary is closed and labelled", () => {
  const r1 = guidanceForPrograms([], { direction: false });
  assert.ok(READINESS_SET.has(r1.readiness));
  assert.ok(r1.readinessLabel.length > 0);
  assert.ok(r1.readinessReason.length > 0);

  const r2 = guidanceForPrograms([
    PROGRAM("p1", "B.E. in Mechanical Engineering", "PRIMARY", "B.E. or B.Tech"),
  ]);
  assert.ok(READINESS_SET.has(r2.readiness));
  for (const p of r2.focusPrograms) assert.ok(VERIFY_STATE_SET.has(p.verificationState));
  for (const p of r2.focusPrograms)
    for (const r of p.expectedRoutes) assert.ok(r.route.length > 0 && r.label.length > 0);
});

/* 2 · UNKNOWN vs NOT_VERIFIED stays distinct */
test("2 · UNKNOWN is first-class and never flips into No/not-applicable", () => {
  const unk = buildProgramAdmissionGuidance({ programId: "x1", programName: "Applied Bartending", level: null, category: null });
  assert.equal(unk.verificationState, "UNKNOWN");
  assert.ok(unk.unknownAspects.length > 0);
  assert.ok(unk.expectedRoutes[0].route === "UNKNOWN");
  assert.ok(unk.note.toLowerCase().includes("verify"));

  const business = buildProgramAdmissionGuidance({ programId: "x2", programName: "BBA (Bachelor of Business Administration)", level: "Degree", category: "business" });
  assert.equal(business.verificationState, "NOT_VERIFIED");
  assert.ok(business.officialSources.length === 0);
  assert.notEqual(business.expectedRoutes[0].route, "UNKNOWN");
});

/* 3 · source registry integrity */
test("3 · official-source registry is complete, official-only and stable", () => {
  assert.ok(OFFICIAL_SOURCES.length >= 15, "registry has breadth");
  const ids = new Set();
  for (const s of OFFICIAL_SOURCES) {
    ids.add(s.id);
    for (const k of ["id", "name", "domain", "canonicalUrl", "purpose", "sourceType", "jurisdiction"]) {
      assert.ok(s[k], `source ${s.id} missing ${k}`);
    }
    assert.ok(s.canonicalUrl.startsWith("https://"), `${s.id} must be https`);
    assert.equal(new URL(s.canonicalUrl).hostname.replace(/^www\./, ""), s.domain, `${s.id} domain matches url`);
    assert.equal(s.active, true, `${s.id} marked active`);
    assert.equal(typeof s.purpose, "string");
    assert.ok(s.purpose.length >= 40, `${s.id} purpose is descriptive`);
    assert.ok(!/\b(19|20)\d{2}\b/.test(s.purpose), `${s.id} purpose has no hardcoded year`);
  }
  assert.equal(ids.size, OFFICIAL_SOURCES.length, "ids unique");
  assert.equal(new Set(OFFICIAL_SOURCES.map((s) => s.domain)).size, OFFICIAL_SOURCES.length, "domains unique");
  // registry lookups
  assert.equal(getOfficialSource("nta")?.id, "nta");
  assert.equal(getOfficialSource("does-not-exist"), null);
  // medical-registry cited sources resolve to registry entries
  const cited = resolveCitedSource({ name: "National Medical Commission (NMC)", url: "https://www.nmc.org.in" });
  assert.equal(cited.id, "nmc");
  assert.ok(isOfficialSourceUrl("https://www.nta.ac.in"));
  assert.ok(isOfficialSourceUrl("https://jeemain.nta.nic.in"));
  assert.ok(!isOfficialSourceUrl("https://fake-exam-site.com"));
});

/* 4 · determinism */
test("4 · guidance builders are byte-identical on same inputs", () => {
  const prog = [PROGRAM("p1", "MBBS", "PRIMARY", "Professional Degree", "medicine")];
  const a = guidanceForPrograms(prog);
  const b = guidanceForPrograms(prog);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  const g1 = buildProgramAdmissionGuidance(PROGRAM("p1", "MBBS", "PRIMARY", "Professional Degree", "medicine"));
  const g2 = buildProgramAdmissionGuidance(PROGRAM("p1", "MBBS", "PRIMARY", "Professional Degree", "medicine"));
  assert.equal(JSON.stringify(g1), JSON.stringify(g2));
});

/* 5 · student isolation */
test("5 · read surfaces are self-scoped (no other-student ids, no new APIs)", () => {
  const page = readPath("src/app/(student)/admissions/page.tsx");
  assert.match(page, /fetch\("\/api\/student\/decision-center"\)/);
  assert.ok(!/\[id\]|\[userId\]|\[studentId\]/.test(page), "no dynamic student id segment in the student page");
  assert.ok(!page.includes("admissionsApi"), "no bespoke admissions api call");
  // decision-center API remains self-scoped (existing contract)
  const dcRoute = readPath("src/app/api/student/decision-center/route.ts");
  assert.match(dcRoute, /session\.user|\bsession\?\.user\b/);
  // no counselor-facing admissions mutation API was introduced
  assert.ok(!readPath("src/app/(counselor)/students/[id]/page.tsx").includes("admissionsGuidanceApi"));
});

/* 6 · counselor authorization */
test("6 · counselor 360 surfaces only authorized-student data", () => {
  const page = readPath("src/app/(counselor)/students/[id]/page.tsx");
  assert.match(page, /loadAuthorizedStudent/);
  const s360 = readPath("src/lib/counselor/student360.ts");
  assert.match(s360, /decisionCenter/);
  const client = readPath("src/app/(counselor)/students/[id]/student-360-client.tsx");
  assert.match(client, /decisionCenter\?\.admissionsGuidance/);
  assert.match(client, /Open Official Source/);
});

/* 7 · medical pathway distinctness */
test("7 · medicine/dentistry/pharmacy/nursing/physiotherapy stay distinct", () => {
  const cases = [
    ["Medicine profession (MBBS)", "medicine", "nmc", "NATIONAL_ENTRANCE"],
    ["Dentistry (BDS)", "dentistry", "dci", "NATIONAL_ENTRANCE"],
    ["Pharmacy", "pharmacy", "pci", null],
    ["Nursing (B.Sc Nursing)", "nursing", "inc", "NATIONAL_ENTRANCE"],
    ["Physiotherapy (BPT)", "physiotherapy", "ncahp", null],
  ];
  const ids = new Set();
  for (const [name, token, sourceId, nationalRoute] of cases) {
    const g = buildProgramAdmissionGuidance({ programId: token, programName: name, level: "Degree", category: null });
    ids.add(token);
    assert.equal(g.verificationState, "PARTIALLY_VERIFIED", `${token} verified from registry`);
    assert.ok(g.lastVerified, `${token} carries registry reviewed date`);
    assert.ok(g.officialSources.some((s) => s.id === sourceId), `${token} cites ${sourceId}`);
    if (nationalRoute) {
      assert.ok(g.expectedRoutes.some((r) => r.route === nationalRoute), `${token} national entrance route`);
    }
    assert.ok(g.relevantEntranceExams.length >= 1, `${token} has entrance guidance`);
    assert.ok(g.note.toLowerCase().includes("medical education registry"), `${token} registry-sourced`);
  }
  assert.equal(ids.size, cases.length, "all five distinct");
  // nursing: scope caveat present (never assume NEET applies)
  const nursing = buildProgramAdmissionGuidance({ programId: "nursing", programName: "Nursing (B.Sc Nursing)", level: "Degree", category: null });
  assert.match(nursing.relevantEntranceExams[0].context, /never assume NEET/i);
  // pharmacy is not claimed to share the medical national entrance
  const pharmacy = buildProgramAdmissionGuidance({ programId: "pharmacy", programName: "Pharmacy", level: "Degree", category: null });
  assert.ok(!pharmacy.expectedRoutes.some((r) => r.route === "CENTRAL_COUNSELLING"));
});

/* 8 · diploma vs B.E./B.Tech */
test("8 · diploma guidance never becomes an engineering-degree route", () => {
  const diploma = buildProgramAdmissionGuidance(PROGRAM("d1", "Diploma in Mechanical Engineering", "PRIMARY", "Diploma"));
  const degree = buildProgramAdmissionGuidance(PROGRAM("b1", "B.E. in Mechanical Engineering", "PRIMARY", "B.E. or B.Tech"));
  assert.equal(diploma.verificationState, "SOURCE_AVAILABLE");
  assert.equal(degree.verificationState, "SOURCE_AVAILABLE");
  assert.ok(!diploma.expectedRoutes.some((r) => r.route === "NATIONAL_ENTRANCE"), "diploma has no national-entrance claim");
  assert.ok(degree.expectedRoutes.some((r) => r.route === "NATIONAL_ENTRANCE"), "degree may use national route");
  assert.match(diploma.note, /separate from a B\.E\.\/B\.Tech/i);
  assert.notEqual(JSON.stringify(diploma), JSON.stringify(degree));
});

/* 9 · no fabricated facts */
test("9 · guidance never fabricates cutoffs/deadlines/probability/eligibility verdicts", () => {
  const programs = [
    PROGRAM("p1", "MBBS", "PRIMARY", "Professional Degree", "medicine"),
    PROGRAM("p2", "B.E. in Mechanical Engineering", "PRIMARY", "B.E. or B.Tech"),
    PROGRAM("p3", "LLB (Law)", "PRIMARY", "Professional Degree", "law"),
    PROGRAM("p4", "Diploma in Mechanical Engineering", "PRIMARY", "Diploma"),
    PROGRAM("p5", "MBA in Finance", "PRIMARY", "Master", "business"),
  ];
  const blob = JSON.stringify(guidanceForPrograms(programs));
  const blamed = /(?:cutoffs?|deadlines?|ranks?|percentile|probability|chances?|score|mark)[^",})]{0,25}\d/i;
  assert.ok(!blamed.test(blob), "no fabricated admission numbers");
  assert.ok(!/\b20\d{2}\b/.test(blob.replace(/\d{4}-\d{2}-\d{2}/g, "DATE")), "no hardcoded years in guidance output");
  assert.ok(!/you are eligible|you are guaranteed|guaranteed admission/i.test(blob), "no eligibility verdicts");
  // the honest phrasing exists instead
  assert.match(blob, /eligibility should be verified against the official criteria/i, "official-criteria phrasing present");
});

/* 10 · Decision Center integration */
test("10 · Decision Center carries admissionsGuidance without re-running the engine", () => {
  const center = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("mech", "Mechanical Engineer")],
      programMappings: { mech: [PROGRAM("b1", "B.E. in Mechanical Engineering", "PRIMARY", "B.E. or B.Tech")] },
    })
  );
  assert.ok(center.admissionsGuidance, "guidance present");
  assert.ok(READINESS_SET.has(center.admissionsGuidance.readiness));
  const ids = new Set(center.admissionsGuidance.focusPrograms.map((p) => p.programId));
  assert.ok(center.recommendedPrograms.every((p) => ids.has(p.programId)), "focus programs ⊆ recommended programs");
  const center2 = buildDecisionCenter(baseInputs({
    careerMatches: [MATCH("mech", "Mechanical Engineer")],
    programMappings: { mech: [PROGRAM("b1", "B.E. in Mechanical Engineering", "PRIMARY", "B.E. or B.Tech")] },
  }));
  assert.equal(JSON.stringify(center.admissionsGuidance), JSON.stringify(center2.admissionsGuidance), "deterministic");
  assert.ok(!center.decision_pack_deps, "no extra engine artifact leaked");
});

/* 11 · Decision Pack integration */
test("11 · pack carries per-pathway admissions + summary (parent-friendly)", () => {
  const center = buildDecisionCenter(
    baseInputs({
      careerMatches: [MATCH("sur", "Surgeon")],
      programMappings: { sur: [{ ...PROGRAM("mbbs", "MBBS", "PRIMARY", "Professional Degree"), category: "medicine" }] },
    })
  );
  const pack = composeDecisionPack({
    student: {
      id: "u1", firstName: "Aisha", lastName: "Khan",
      gradeLevel: null, studyLevel: null, educationStageLabel: null,
      targetCountry: null, preferredIntake: null, preferredYear: null,
      currentProgram: null, state: null,
    },
    assessments: { completed: [], remaining: [], completedCount: 0, total: 5 },
    careerMatches: [MATCH("sur", "Surgeon")],
    center,
    catalog: [],
    careerNameById: {},
    programNameById: {},
  });
  assert.ok(pack.admissionsSummary, "summary present");
  assert.ok(READINESS_SET.has(pack.admissionsSummary.readiness));
  const programRows = pack.educationPathways.filter((r) => r.kind === "PROGRAM");
  assert.ok(programRows.length > 0);
  for (const r of programRows) {
    assert.ok(r.admissions, `pathway ${r.programName} has admissions`);
    assert.ok(r.admissions.routes.length > 0);
    assert.ok(r.admissions.note.length > 0);
    assert.ok(r.admissions.officialSources.length > 0);
    for (const s of r.admissions.officialSources) assert.ok(s.url.startsWith("https://"));
  }
  const sick = (r) =>
    /\[\w+\]|\[\w+:\w+\]|matchScore|fitPct|confidenceScore/.test(JSON.stringify(r.admissions));
  assert.ok(programRows.every((r) => !sick(r)), "no internal trace or score leakage");
  const pack2 = composeDecisionPack({
    student: {
      id: "u1", firstName: "Aisha", lastName: "Khan",
      gradeLevel: null, studyLevel: null, educationStageLabel: null,
      targetCountry: null, preferredIntake: null, preferredYear: null,
      currentProgram: null, state: null,
    },
    assessments: { completed: [], remaining: [], completedCount: 0, total: 5 },
    careerMatches: [MATCH("sur", "Surgeon")],
    center,
    catalog: [],
    careerNameById: {},
    programNameById: {},
  });
  assert.equal(JSON.stringify(pack), JSON.stringify(pack2), "pack byte-identical");
});

/* 12 · Student 360 integration (covered statically + via lib) */
test("12 · counselor surface derives guidance from the authorized decision center", () => {
  const s360 = readRel("src/lib/counselor/student360.ts");
  assert.match(s360, /getDecisionCenter\(studentUserId, \{ careerMatches \}\)/);
  assert.match(s360, /decisionCenter,/);

  const client = readPath("src/app/(counselor)/students/[id]/student-360-client.tsx");
  assert.match(client, /\{\s*key:\s*"admissions"/);
  assert.match(client, /AdmissionsTab/);
  assert.match(client, /tab === "admissions" && <AdmissionsTab/);
  const admTab = client.slice(client.indexOf("function AdmissionsTab"), client.indexOf("function UniversitiesTab"));
  assert.ok(!admTab.includes("<form"), "no submission form on the admissions tab");
});

/* 13 · analytics allowlist */
test("13 · the 4 admissions events are allowlisted and student-firable", async () => {
  const record = readRel("src/lib/analytics/record.ts");
  const client = readRel("src/lib/analytics/client.ts");
  const eventsRoute = readRel("src/app/api/student/analytics/events/route.ts");
  const events = [
    "admissions_guidance_viewed",
    "admissions_source_opened",
    "admissions_action_opened",
    "admissions_verify_clicked",
  ];
  for (const e of events) {
    assert.ok(record.includes(e), `record.ts allows ${e}`);
    assert.ok(client.includes(e), `client.ts allows ${e}`);
    assert.ok(eventsRoute.includes(e), `events route allows ${e}`);
  }
  // persistence smoke: record one event server-side.
  // Count is scoped to THIS test user: parallel test files also insert
  // productEvent rows into the shared dev DB, so a global count is racy.
  const scope = { userId: student.id };
  const before = await prisma.productEvent.count({ where: scope });
  await recordProductEvent({ userId: student.id, event: "admissions_guidance_viewed", meta: { source: "unit-test" } });
  const after = await prisma.productEvent.count({ where: scope });
  assert.equal(after, before + 1);
});

/* 14 · protected counts */
test("14 · guidance runs leave protected catalog counts untouched", async () => {
  const before = {};
  for (const m of MODELS) before[m] = await prisma[m].count();
  // exercise pure builders + a real decision-center load
  guidanceForPrograms([PROGRAM("p1", "MBBS", "PRIMARY", "Professional Degree", "medicine")]);
  buildProgramAdmissionGuidance(PROGRAM("x", "Unknown Program", "PRIMARY", null));
  const dc = await getDecisionCenter(student.id, {});
  if (dc) {
    assert.ok(dc.admissionsGuidance, "decision center has guidance");
    void JSON.stringify(dc);
  }
  const after = {};
  for (const m of MODELS) after[m] = await prisma[m].count();
  assert.deepEqual(after, before);
  assert.deepEqual(after, beforeCounts);
});

/* 15 · engine frozen around guidance */
test("15 · career engine output is byte-identical around guidance runs", async () => {
  const m1 = await getCareerMatches(student.id, { limit: 10 });
  guidanceForPrograms([PROGRAM("p1", "MBBS", "PRIMARY", "Professional Degree", "medicine")]);
  await getDecisionCenter(student.id, {});
  const m2 = await getCareerMatches(student.id, { limit: 10 });
  assert.equal(JSON.stringify(m1.matches), JSON.stringify(m2.matches));
});

/* 16 · no application submission surface */
test("16 · no application/registration/payment form exists anywhere", () => {
  const page = readPath("src/app/(student)/admissions/page.tsx");
  assert.ok(!/<form/.test(page), "no form on admissions page");
  assert.ok(!/upload|payment|register for exam|apply now/i.test(page), "no submission copy");
  assert.ok(!/accept="application|enctype="multipart/.test(page));
  const view = readPath("src/components/decision-pack/decision-pack-view.tsx");
  assert.ok(!/<form/.test(view), "no form in pack view");
  const client = readPath("src/app/(counselor)/students/[id]/student-360-client.tsx");
  const formPost = client.match(/<form[^>]*action=[^>]*>/g) ?? [];
  for (const f of formPost) assert.ok(!/apply|application/i.test(f), "no submission form");
  assert.ok(!readRel("src/lib/admissions-intelligence/guidance.ts").includes("prisma"), "kernel has no DB access");
});

/* 17 · INFORMATION_MISSING state */
test("17 · no pathway => INFORMATION_MISSING with in-app next action", () => {
  const g = guidanceForPrograms([], { direction: false });
  assert.equal(g.readiness, "INFORMATION_MISSING");
  assert.ok(g.missingInformation.length > 0);
  assert.ok(g.nextActions.length > 0);
  assert.ok(g.nextActions.every((a) => a.href.startsWith("/")));
  const directed = guidanceForPrograms([], { direction: true });
  assert.equal(directed.readiness, "INFORMATION_MISSING");
  assert.ok(directed.nextActions.every((a) => a.href.startsWith("/")));
});

/* 18 · official-source links */
test("18 · every surfaced source link is an official domain", () => {
  const programs = [
    PROGRAM("p1", "MBBS", "PRIMARY", "Professional Degree", "medicine"),
    PROGRAM("p2", "B.E. in Mechanical Engineering", "PRIMARY", "B.E. or B.Tech"),
    PROGRAM("p3", "LLB (Law)", "PRIMARY", "Professional Degree", "law"),
  ];
  const g = guidanceForPrograms(programs);
  for (const s of g.officialSources) {
    assert.ok(isOfficialSourceUrl(s.canonicalUrl), `${s.id} is official`);
  }
  for (const s of g.focusPrograms.flatMap((p) => p.officialSources)) {
    assert.ok(isOfficialSourceUrl(s.canonicalUrl), `focus-program ${s.id} official`);
  }
  for (const a of g.nextActions) {
    if (!a.href.startsWith("/")) assert.ok(isOfficialSourceUrl(a.href), `action ${a.id} official`);
  }
});

/* 19 · medical distinctness at pack level */
test("19 · MBBS vs BDS preserved through guidance + pack", () => {
  const surCenter = buildDecisionCenter(baseInputs({
    careerMatches: [MATCH("sur", "Surgeon")],
    programMappings: { sur: [{ ...PROGRAM("mbbs", "Medicine (MBBS)", "PRIMARY", "Professional Degree"), category: "medicine" }] },
  }));
  const dentCenter = buildDecisionCenter(baseInputs({
    careerMatches: [MATCH("dent", "Dentistry")],
    programMappings: { dent: [{ ...PROGRAM("bds", "Dentistry (BDS)", "PRIMARY", "Professional Degree"), category: "dentistry" }] },
  }));
  const surG = surCenter.admissionsGuidance.focusPrograms[0];
  const dentG = dentCenter.admissionsGuidance.focusPrograms[0];
  assert.match(surG.programName, /MBBS/i);
  assert.match(dentG.programName, /BDS/i);
  assert.notEqual(JSON.stringify(surG), JSON.stringify(dentG), "distinct guidance");
  assert.ok(surG.officialSources.some((s) => s.id === "nmc"));
  assert.ok(dentG.officialSources.some((s) => s.id === "dci"));
  assert.ok(!dentG.officialSources.some((s) => s.id === "nmc"), "BDS cites DCI, not NMC");
});

/* 20 · UI copy: unknown wording + status-with-icon */
test("20 · UI surfaces use honest copy and status text with icons", () => {
  const page = readPath("src/app/(student)/admissions/page.tsx");
  assert.match(page, /What's still unknown/);
  assert.match(page, /official criteria/);
  assert.match(page, /never inferred/);
  assert.match(page, /readinessLabel/);
  assert.match(page, /CheckCircle2|AlertTriangle|Info/);
  assert.match(page, /Verify on official source/);
  const dcPage = readPath("src/app/(student)/decision-center/page.tsx");
  assert.match(dcPage, /Admissions readiness/);
  assert.match(dcPage, /admissionsGuidance\.readiness/);
  const packView = readPath("src/components/decision-pack/decision-pack-view.tsx");
  assert.match(packView, /Admissions &next steps|Admissions &amp; next steps/);
  assert.match(packView, /admissionsSummary\.readinessLabel/);
});

/* 21 · readiness rules */
test("21 · readiness reflects route confidence (READY vs NEEDS vs MISSING)", () => {
  const ready = guidanceForPrograms([PROGRAM("b1", "B.E. in Mechanical Engineering", "PRIMARY", "B.E. or B.Tech")]);
  assert.equal(ready.readiness, "READY_TO_RESEARCH");
  const needs = guidanceForPrograms([PROGRAM("d9", "Diploma in Interior Design", "PRIMARY", "Diploma", null)]);
  assert.equal(needs.readiness, "NEEDS_VERIFICATION");
  const missing = guidanceForPrograms([]);
  assert.equal(missing.readiness, "INFORMATION_MISSING");
  assert.ok(PROGRAM_VERIFICATION_RANK.NOT_VERIFIED < PROGRAM_VERIFICATION_RANK.SOURCE_AVAILABLE);
});

/* 22 · route/UI integration */
test("22 · nav, route guard, decision-pack loader and build all agree", () => {
  const nav = readRel("src/components/layout/nav-config.ts");
  assert.match(nav, /href:\s*"\/admissions"/);
  assert.match(nav, /DoorOpen/);
  const navTest = readRel("tests/navigation.test.mjs");
  assert.match(navTest, /"\/admissions"/);
  assert.ok(focusProgramAdmission(guidanceForPrograms([PROGRAM("p1", "MBBS", "PRIMARY", "Professional Degree", "medicine")]), "p1"), "focus lookup works");
  assert.equal(focusProgramAdmission(guidanceForPrograms([]), "nope"), null);
  const loader = readRel("src/lib/decision-pack/loader.ts");
  assert.match(loader, /composeDecisionPack/);
});

/* 23 · counselling-process copy is specific but never over-certain (P3) */
test("23 · counselling process text reflects MCC, notified AYUSH, national JEE, and CUET variability", () => {
  const med = buildProgramAdmissionGuidance({ programId: "medicine", programName: "Medicine (MBBS)", level: "Degree", category: null });
  assert.match(med.counsellingProcess, /Medical Counselling Committee \(MCC\)/i, "MBBS cites MCC by name");
  assert.match(med.counsellingProcess, /All-India quota|state counselling authority/i, "MBBS covers AIQ + state");
  const dent = buildProgramAdmissionGuidance({ programId: "dentistry", programName: "Dentistry (BDS)", level: "Degree", category: null });
  assert.match(dent.counsellingProcess, /Medical Counselling Committee \(MCC\)/i, "BDS cites MCC by name");

  for (const name of ["Ayurveda (BAMS)", "Homeopathy (BHMS)"]) {
    const ay = buildProgramAdmissionGuidance({ programId: name.toLowerCase(), programName: name, level: "Degree", category: null });
    assert.ok(ay.counsellingProcess, `${name} has counselling guidance`);
    assert.match(ay.counsellingProcess, /notified counselling authority/i, `${name} hedges on notified authority`);
    assert.match(ay.counsellingProcess, /domicile/i, `${name} mentions domicile rules`);
    assert.match(ay.relevantEntranceExams[0].context, /NEET-UG/i, `${name} references NEET-UG`);
  }

  const eng = buildProgramAdmissionGuidance({ programId: "en1", programName: "B.E. in Mechanical Engineering", level: "Degree", category: "engineering" });
  assert.match(eng.counsellingProcess, /national joint-seat-allocation/i, "B.E. hedges with national seat-allocation wording");
  assert.match(eng.counsellingProcess, /outside the national round/i, "B.E. cites non-national routes");

  const law = buildProgramAdmissionGuidance({ programId: "law1", programName: "Bachelor of Laws (LL.B.)", level: "Degree", category: "law" });
  assert.match(law.counsellingProcess, /Never assume every CUET university follows one identical process/i, "CUET variability is explicit");
});