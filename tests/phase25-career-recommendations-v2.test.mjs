import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { getCareerMatches, sanitizeCareerMatch } from "../src/lib/career-matching/engine.ts";
import { scoreCareer } from "../src/lib/career-matching/score.ts";
import {
  matchStrengthLabel,
  confidenceHeading,
  confidenceExplanation,
  whyThisMatches,
  whatIsMissing,
  developmentAreas,
  nextActions,
} from "../src/lib/recommendations/explainability.ts";
import { PREFERRED_CAREER_BOOST } from "../src/lib/career-matching/config.ts";
import { recordProductEvent } from "../src/lib/analytics/record.ts";
import { getCareerPrograms } from "../src/lib/career-program.ts";
import { getStudent360 } from "../src/lib/counselor/student360.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let tenant, studentLow, studentRich, analyticsUser;
let storedCareerTraits = [];

before(async () => {
  tenant = await prisma.tenant.create({
    data: { name: "PH25", slug: `ph25-${suffix}`, subdomain: `ph25-${suffix}` },
  });

  const mkUser = async (tag) =>
    prisma.user.create({
      data: {
        email: `ph25-${tag}-${suffix}@x.com`,
        passwordHash: "x",
        firstName: "PH25",
        lastName: tag,
        role: "STUDENT",
        tenantId: tenant.id,
      },
    });

  studentLow = await mkUser("low");
  await prisma.studentProfile.create({ data: { userId: studentLow.id } });

  studentRich = await mkUser("rich");
  await prisma.studentProfile.create({ data: { userId: studentRich.id } });
  analyticsUser = await mkUser("ana");

  // Seed a deterministic career-profile for the "rich" student from real traits
  // so the engine produces meaningful, reproducible evidence.
  const src = await prisma.career.findFirst({
    where: { isActive: true, traits: { some: {} } },
    select: { traits: { select: { dimension: true, value: true } } },
  });
  const selected = [];
  const dimsWanted = ["INTEREST", "SUBJECT", "WORK_ENVIRONMENT"];
  for (const dim of dimsWanted) {
    const hit = (src?.traits ?? []).find((t) => t.dimension === dim);
    if (hit) selected.push({ dimension: hit.dimension, value: hit.value });
  }
  if (selected.length === 0 && src?.traits?.length) {
    selected.push(...src.traits.slice(0, 3).map((t) => ({ dimension: t.dimension, value: t.value })));
  }
  storedCareerTraits = selected;

  const profile = await prisma.studentCareerProfile.create({ data: { studentId: studentRich.id } });
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
  const userIds = [studentLow.id, studentRich.id, analyticsUser.id];
  await prisma.productEvent.deleteMany({ where: { userId: { in: userIds } } });
  const cpIds = (
    await prisma.studentCareerProfile.findMany({
      where: { studentId: { in: userIds } },
      select: { id: true },
    })
  ).map((p) => p.id);
  if (cpIds.length) await prisma.studentCareerSignal.deleteMany({ where: { profileId: { in: cpIds } } });
  await prisma.studentCareerProfile.deleteMany({ where: { studentId: { in: userIds } } });
  await prisma.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Fixture helpers for the PURE goldens (fixed candidate + fixed signals)
// ---------------------------------------------------------------------------

const GOLDEN_CAREER = {
  id: "golden-career-001",
  name: "Golden Analytical Profession",
  slug: "golden",
  title: "Golden Analytical Profession",
  category: "Analytics",
  subcategory: null,
  shortDescription: "test",
  demandLevel: "High",
  jobGrowth: "High",
  salaryEntry: "8,00,000",
  salarySenior: "20,00,000",
  minStudyLevel: null,
  isEmerging: false,
  technicalSkills: [],
  softSkills: [],
  interests: ["Analytical"],
  personalityTraits: [],
  recommendedDegrees: [],
  recommendedSubjects: ["Mathematics"],
  traits: [
    { dimension: "INTEREST", value: "Analytical", weight: 1 },
    { dimension: "SUBJECT", value: "Mathematics", weight: 1 },
    { dimension: "WORK_ENVIRONMENT", value: "Analytical environment", weight: 1 },
  ],
};

const GOLDEN_SIGNALS = [
  { dimension: "INTEREST", value: "Analytical", score: 100, confidence: 1, sourceType: "STUDENT_PROFILE", sourceAssessment: null },
  { dimension: "SUBJECT", value: "Mathematics", score: 100, confidence: 1, sourceType: "STUDENT_PROFILE", sourceAssessment: null },
];

const PREF = {
  careerId: GOLDEN_CAREER.id,
  careerName: GOLDEN_CAREER.name,
  resolved: true,
  source: "id",
  fallbackAllowed: false,
};

function mkMatch(overrides = {}) {
  return {
    careerId: "c1",
    career: {
      id: "c1",
      name: "Analytics Engineer",
      slug: "analytics-engineer",
      title: "Analytics Engineer",
      category: "Technology",
      shortDescription: null,
      demandLevel: "High",
      salaryEntry: "10,00,000",
      isEmerging: false,
    },
    matchScore: 64,
    confidenceScore: 41,
    matchStrength: "moderate",
    dimensionScores: [],
    strengths: [],
    developmentAreas: [],
    missingEvidence: [],
    verifiedGaps: [],
    reasons: [],
    sourceSummary: [],
    preferenceBoost: false,
    evidence: [],
    matchTypes: [],
    confidenceDetail: {
      score: 0.41,
      level: "MODERATE",
      factors: { matchedSignals: 2, dimensionsMatched: 2, sourceDiversity: 1, assessmentEvidence: false, coverage: 0.28, cappedLow: false },
    },
    supportedDimensions: 0,
    trace: {
      careerId: "c1",
      totalScore: 64,
      confidence: 0.41,
      supportedDimensions: [],
      weakDimensions: [],
      unsupportedDimensions: [],
      matchedSignals: 2,
      matchTypes: ["CANONICAL"],
      preferredCareerMatch: false,
      preferredCareerSource: null,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Part 3 — plain-language match score / strength labels (pure)
// ---------------------------------------------------------------------------

test("P1: match strength labels never read as a verdict and never claim probability", () => {
  assert.equal(matchStrengthLabel("strong"), "Strong match");
  assert.equal(matchStrengthLabel("moderate"), "Good match");
  assert.equal(matchStrengthLabel("weak"), "Developing match");
  assert.equal(matchStrengthLabel("development_area"), "Developing match");
  assert.equal(matchStrengthLabel("missing_evidence"), "Limited evidence");
  for (const tier of ["strong", "moderate", "weak", "development_area", "missing_evidence"]) {
    const label = matchStrengthLabel(tier);
    assert.ok(!/probability|%|accurate/i.test(label), `no probability/% wording: ${label}`);
  }
});

// ---------------------------------------------------------------------------
// Part 4 — confidence headings with meaning (pure)
// ---------------------------------------------------------------------------

test("P2: confidence headings and explanations are fixed, meaningful, non-statistical", () => {
  assert.equal(confidenceHeading("HIGH"), "High confidence");
  assert.equal(confidenceHeading("MODERATE"), "Moderate confidence");
  assert.equal(confidenceHeading("LOW"), "Low confidence");
  assert.equal(
    confidenceExplanation("HIGH"),
    "Multiple relevant evidence areas support this recommendation."
  );
  assert.equal(
    confidenceExplanation("MODERATE"),
    "Some useful evidence supports this recommendation, but more information could improve it."
  );
  assert.equal(
    confidenceExplanation("LOW"),
    "Limited profile information is available, so treat this as an early directional suggestion."
  );
  for (const level of ["HIGH", "MODERATE", "LOW"]) {
    assert.ok(!/^\d+%$/.test(confidenceExplanation(level)));
    assert.ok(!/probability/i.test(confidenceExplanation(level)));
  }
});

// ---------------------------------------------------------------------------
// Part 8 — why this matches (pure, evidence-grounded only)
// ---------------------------------------------------------------------------

test("P3: whyThisMatches surfaces preference first, strength evidence next, never invents", () => {
  const match = mkMatch({
    preferenceBoost: true,
    reasons: [
      { type: "strength", dimension: "INTEREST", text: "Your interest in Analytical aligns" },
      { type: "missing_evidence", dimension: "WORK_ENVIRONMENT", text: "No work env data" },
    ],
    strengths: ["Strong interest alignment"],
    evidence: [{ dimension: "INTEREST", studentValue: "Analytical", careerTraitValue: "Analytical", strength: 1, matchType: "CANONICAL", sourceType: "STUDENT_PROFILE" }],
  });
  const out = whyThisMatches(match, 4);
  assert.equal(out[0], "You selected this career (or a related field) as a preference");
  assert.ok(out.includes("Your interest in Analytical aligns"));
  assert.ok(!out.some((o) => o.includes("no work env")), "missing-evidence reasons are not 'why matches'");
});

test("P3b: whyThisMatches is bounded, dedupes, and returns [] when there is no evidence", () => {
  const repeated = mkMatch({
    strengths: ["A", "B", "C", "D", "E", "F", "A"],
    reasons: [{ type: "strength", dimension: "SUBJECT", text: "A" }],
    evidence: [{ dimension: "SUBJECT", studentValue: "Math", careerTraitValue: "Mathematics", strength: 1, matchType: "ALIAS", sourceType: "STUDENT_PROFILE" }],
  });
  const out = whyThisMatches(repeated, 4);
  assert.ok(out.length <= 4);
  assert.equal(new Set(out).size, out.length, "dedupes");
  assert.equal(whyThisMatches(mkMatch(), 4).length, 0, "no invention");
});

// ---------------------------------------------------------------------------
// Part 10 / 14 — missing evidence + development areas (pure phrasing)
// ---------------------------------------------------------------------------

test("P4: whatIsMissing maps missing-evidence reasons to per-dimension phrases", () => {
  const match = mkMatch({
    reasons: [
      { type: "missing_evidence", dimension: "APTITUDE", text: "engine note" },
      { type: "missing_evidence", dimension: "SUBJECT", text: "engine note 2" },
    ],
    missingEvidence: ["No work environment data available"],
  });
  const out = whatIsMissing(match, 4);
  assert.ok(out.includes("Aptitude evidence is not yet available"));
  assert.ok(out.includes("Subject evidence is incomplete"));
  assert.ok(out.includes("No work environment data available"));
  assert.equal(out.length, 3);
});

test("P5: development areas are growth-framed and never judge the student", () => {
  const match = mkMatch({
    reasons: [
      { type: "development_area", dimension: "APTITUDE", text: "Profile evidence in the Aptitude area is present but does not align" },
    ],
    developmentAreas: ["Engineering: profile evidence present but not aligned"],
  });
  const out = developmentAreas(match, 4);
  for (const item of out) {
    assert.ok(!/\bweak(ness|er)?\b|\bnot (good|strong)\b/i.test(item), `no judgment wording: ${item}`);
    assert.ok(item.toLowerCase().includes("develop") || item.toLowerCase().includes("strengthen"), `growth phrasing: ${item}`);
  }
});

test("P5b: developmentAreas respects max and merges engine strings without duplication", () => {
  const match = mkMatch({
    reasons: [
      { type: "development_area", dimension: "SUBJECT", text: "a" },
      { type: "development_area", dimension: "INTEREST", text: "b" },
    ],
    developmentAreas: ["one", "two", "three", "four"],
  });
  const out = developmentAreas(match, 4);
  assert.ok(out.length <= 4);
  assert.equal(new Set(out).size, out.length);
});

// ---------------------------------------------------------------------------
// Part 9 — action plan from real gaps only (pure)
// ---------------------------------------------------------------------------

test("P6: nextActions is driven only by actual missing dimensions", () => {
  const match = mkMatch({
    reasons: [
      { type: "missing_evidence", dimension: "SUBJECT", text: "" },
      { type: "missing_evidence", dimension: "APTITUDE", text: "" },
      { type: "missing_evidence", dimension: "PERSONALITY", text: "" },
    ],
  });
  const actions = nextActions(match);
  const labels = actions.map((a) => a.label);
  assert.ok(labels.some((l) => l.includes("subjects")));
  const aptitude = actions.find((a) => a.assessmentKind === "intelligences");
  const personality = actions.find((a) => a.assessmentKind === "personality");
  assert.ok(aptitude, "aptitude assessment action present");
  assert.ok(personality, "personality assessment action present");
  assert.equal(actions[actions.length - 1].label, "Explore programs and pathway options");
  assert.ok(actions.length <= 4);
});

test("P6b: nextActions links profile CTAs to the right destinations", () => {
  const match = mkMatch({
    reasons: [
      { type: "missing_evidence", dimension: "EDUCATION", text: "" },
      { type: "missing_evidence", dimension: "WORK_ENVIRONMENT", text: "" },
    ],
  });
  const actions = nextActions(match);
  const edu = actions.find((a) => a.label.includes("qualification"));
  const env = actions.find((a) => a.label.includes("work-environment"));
  assert.equal(edu?.href, "/career-preferences");
  assert.equal(env?.href, "/career-profile");
});

test("P6c: explore step always survives even when many gaps exist", () => {
  const match = mkMatch({
    reasons: [
      { type: "missing_evidence", dimension: "EDUCATION", text: "" },
      { type: "missing_evidence", dimension: "SUBJECT", text: "" },
      { type: "missing_evidence", dimension: "APTITUDE", text: "" },
      { type: "missing_evidence", dimension: "PERSONALITY", text: "" },
    ],
  });
  const actions = nextActions(match);
  assert.equal(actions.length, 4);
  assert.equal(actions[actions.length - 1].label, "Explore programs and pathway options");
});

// ---------------------------------------------------------------------------
// Parts 16/21 — golden regression: engine numbers are pinned and unmodified.
// Captured from the FROZEN engine on 2026-09-09; do not "fix" these — a diff
// means the engine changed, not that the test is wrong.
// ---------------------------------------------------------------------------

test("G1: pure golden scoring — meaningful signals", () => {
  const r = scoreCareer(GOLDEN_CAREER, GOLDEN_SIGNALS, null);
  assert.equal(r.matchScore, 64);
  assert.equal(r.confidenceScore, 41);
  assert.equal(r.matchStrength, "moderate");
  assert.equal(r.supportedDimensions, 2);
  assert.equal(r.evidence.length, 2);
  assert.equal(r.preferenceBoost, false);
});

test("G2: preferred-career boost is exactly PREFERRED_CAREER_BOOST and flips strength", () => {
  const base = scoreCareer(GOLDEN_CAREER, GOLDEN_SIGNALS, null);
  const boosted = scoreCareer(GOLDEN_CAREER, GOLDEN_SIGNALS, PREF);
  assert.equal(boosted.matchScore - base.matchScore, PREFERRED_CAREER_BOOST);
  assert.equal(PREFERRED_CAREER_BOOST, 12);
  assert.equal(boosted.matchScore, 76);
  assert.equal(boosted.preferenceBoost, true);
  assert.equal(boosted.matchStrength, "strong");
});

test("G3: preferred resolution for a different career boosts nothing", () => {
  const other = scoreCareer(GOLDEN_CAREER, GOLDEN_SIGNALS, {
    careerId: "another-career",
    careerName: "Other",
    resolved: true,
    source: "id",
    fallbackAllowed: false,
  });
  assert.equal(other.matchScore, 64);
  assert.equal(other.preferenceBoost, false);
});

test("G4: no profile signals yet — score 0, missing_evidence, honest gaps", () => {
  const r = scoreCareer(GOLDEN_CAREER, [], null);
  assert.equal(r.matchScore, 0);
  assert.equal(r.matchStrength, "missing_evidence");
  assert.equal(r.evidence.length, 0);
  assert.equal(r.confidenceScore, 11);
  assert.ok(r.missingEvidence.length >= 3);
});

// ---------------------------------------------------------------------------
// Parts 5/21 — engine low-information + meaningful states over the DB path
// ---------------------------------------------------------------------------

test("A1: near-empty profile surfaces the low-information state (not an arbitrary ranking)", async () => {
  const res = await getCareerMatches(studentLow.id, { limit: 10 });
  assert.equal(res.lowInformation, true);
  assert.equal(res.topMatchStrength, "missing_evidence");
  for (const m of res.matches) {
    assert.equal(m.matchScore, 0);
  }
  assert.ok(res.disclaimer, "no-assessment disclaimer present");
});

test("A2: seeded profile produces meaningful, sorted matches", async () => {
  if (storedCareerTraits.length === 0) {
    assert.ok(true, "no career traits in fixture DB; skipping");
    return;
  }
  const res = await getCareerMatches(studentRich.id, { limit: 10 });
  assert.equal(res.lowInformation, false);
  assert.ok(res.matches.length > 0);
  const scores = res.matches.map((m) => m.matchScore);
  assert.ok(scores[0] > 0, "top match has evidence-backed score");
  assert.ok(res.matches[0].evidence.length > 0, "top match carries real evidence");
  for (let i = 1; i < scores.length; i++) {
    assert.ok(scores[i - 1] >= scores[i], "ranked descending");
  }
});

test("A3: student-facing API shape strips the trace but keeps explainability detail", async () => {
  const res = await getCareerMatches(studentRich.id, { limit: 5 });
  if (res.matches.length === 0) return assert.ok(true, "skip");
  const cleaned = sanitizeCareerMatch(res.matches[0]);
  assert.ok(!("trace" in cleaned), "trace stripped for students");
  assert.ok(Array.isArray(cleaned.evidence));
  assert.ok(cleaned.confidenceDetail && "level" in cleaned.confidenceDetail);
  assert.ok(Array.isArray(cleaned.reasons));
  assert.ok(Array.isArray(cleaned.dimensionScores));
});

test("A4: matching is deterministic — two runs produce identical top-5", async () => {
  const a = await getCareerMatches(studentRich.id, { limit: 5 });
  const b = await getCareerMatches(studentRich.id, { limit: 5 });
  assert.deepEqual(
    a.matches.map((m) => [m.careerId, m.matchScore]),
    b.matches.map((m) => [m.careerId, m.matchScore])
  );
});

// ---------------------------------------------------------------------------
// Part 12 — counselor 360 keeps the full trace (counselors may inspect it)
// ---------------------------------------------------------------------------

test("C1: counselor student-360 returns full career-match trace for the counselor", async () => {
  const s360 = await getStudent360(studentRich.id);
  assert.ok(s360, "student360 exists");
  const matches = s360?.careerMatches ?? [];
  if (matches.length === 0) return assert.ok(true, "skip when no matches");
  assert.ok(matches[0].trace, "trace present for the counselor");
  assert.ok(matches[0].dimensionScores, "dimension scores present");
  assert.ok(Array.isArray(matches[0].evidence));
});

// ---------------------------------------------------------------------------
// Parts 14/15 — medical & diploma rendering safety (data integrity)
// ---------------------------------------------------------------------------

test("M1: distinct degrees are stored per medical career — never a fabricated MBBS for all", async () => {
  const med = await prisma.career.findFirst({ where: { isActive: true, name: "Medicine" }, select: { id: true } });
  const dent = await prisma.career.findFirst({ where: { isActive: true, name: "Dentistry" }, select: { id: true } });
  const rows = async (id) =>
    id
      ? prisma.careerEducationPathway.findMany({
          where: { careerId: id, type: "DEGREE_PATHWAY", priority: "PRIMARY", degree: { isNot: null } },
          select: { degree: { select: { name: true } } },
        })
      : Promise.resolve([]);
  const [medRows, dentRows] = await Promise.all([rows(med?.id ?? null), rows(dent?.id ?? null)]);
  const medPrimary = medRows.map((r) => r.degree.name);
  const dentPrimary = dentRows.map((r) => r.degree.name);
  assert.ok(medPrimary.some((n) => n.startsWith("MBBS")), `Medicine primary is MBBS (got ${medPrimary.join(",")})`);
  assert.ok(dentPrimary.some((n) => n.startsWith("BDS")), `Dentistry primary is BDS (got ${dentPrimary.join(",")})`);
  assert.notDeepEqual(medPrimary, dentPrimary, "different stored degrees across healthcare careers");
});

test("M2: rendered degree labels always come from real stored names (no placeholders)", async () => {
  const rows = await prisma.careerEducationPathway.findMany({
    where: { type: "DEGREE_PATHWAY", degree: { isNot: null } },
    select: { degree: { select: { name: true } } },
    take: 500,
  });
  for (const r of rows) {
    assert.ok(typeof r.degree.name === "string" && r.degree.name.trim().length > 0, "degree name non-empty");
    assert.notEqual(r.degree.name.trim().toLowerCase(), "degree", "no generic fallback label");
  }
});

test("M3: diploma pathways keep an informative, self-describing label (never mislabelled as an engineering degree)", async () => {
  const rows = await prisma.careerEducationPathway.findMany({
    where: { type: "DEGREE_PATHWAY", degree: { name: { contains: "Diploma" } } },
    select: { degree: { select: { name: true } } },
    take: 500,
  });
  for (const r of rows) {
    const name = r.degree.name.toLowerCase();
    assert.ok(name.includes("diploma"), `diploma label is self-describing: ${r.degree.name}`);
    assert.ok(!/^(b\.?e|b\.?tech|be)$/.test(name.trim()), `not collapsed to an engineering degree: ${r.degree.name}`);
  }
});

// ---------------------------------------------------------------------------
// Part 13 — recommendations connect to programs via the existing mapping data
// ---------------------------------------------------------------------------

test("PR1: top matched careers map to real academic programs", async () => {
  const res = await getCareerMatches(studentRich.id, { limit: 1 });
  if (res.matches.length === 0) return assert.ok(true, "skip");
  const programs = await getCareerPrograms(res.matches[0].careerId);
  if (!programs || programs.length === 0) return assert.ok(true, "skip when no program mappings exist for this career");
  assert.ok(programs.length > 0);
  for (const p of programs) {
    assert.ok(typeof p.programName === "string" && p.programName.length > 0);
  }
});

// ---------------------------------------------------------------------------
// Part 18 — privacy-safe product analytics persistence (no raw answers)
// ---------------------------------------------------------------------------

test("AN1: product events persist coarse recommendation interactions", async () => {
  await recordProductEvent({
    userId: analyticsUser.id,
    event: "career_detail_opened",
    careerId: "c1",
    careerSlug: "analytics-engineer",
    careerName: "Analytics Engineer",
    meta: { from: "recommendation" },
  });
  const rows = await prisma.productEvent.findMany({ where: { userId: analyticsUser.id } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].event, "career_detail_opened");
  assert.equal(rows[0].tenantId, tenant.id);
  assert.equal(rows[0].careerSlug, "analytics-engineer");
  assert.deepEqual(rows[0].meta, { from: "recommendation" });
});

test("AN2: product events store null meta when omitted", async () => {
  await recordProductEvent({ userId: analyticsUser.id, event: "recommendation_viewed" });
  const row = await prisma.productEvent.findFirst({
    where: { userId: analyticsUser.id, event: "recommendation_viewed" },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(row);
  assert.equal(row.meta, null);
});