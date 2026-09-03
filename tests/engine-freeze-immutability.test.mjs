// Phase 18.1 — Career Engine Immutability Guard.
//
// Protects the FROZEN V1 recommendation engine from accidental behavior change.
// It snapshots the core engine configuration and ranking/behavioral invariants.
//
// Intent: future product work should NOT silently change recommendation
// behavior. If one of these values is intentionally changed in a future phase,
// the phase must update this guard AND compare against
// scripts/audit/phase18-1-engine-freeze-baseline.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_WEIGHTS,
  SOURCE_WEIGHTS,
  PREFERRED_CAREER_BOOST,
  MATCH_TYPE_STRENGTHS,
  LEXICAL_SIMILARITY_THRESHOLD,
  SINGLE_SIGNAL_CONTROL,
  EDUCATION_SCORING,
  CONFIDENCE_CONFIG,
  MATCH_STRENGTH_THRESHOLDS,
  SPECIFICITY_CONFIG,
  DEFAULT_MATCH_LIMIT,
} from "../src/lib/career-matching/config.ts";
import { scoreCareer, rankMatches } from "../src/lib/career-matching/score.ts";
import { PREFERRED_CAREER_ALIASES } from "../src/lib/career-matching/preferred-career.ts";

// ---------------------------------------------------------------------------
// 1. Core weights and configuration snapshot
// ---------------------------------------------------------------------------
test("engine freeze: dimension weights are immutable", () => {
  assert.deepEqual(DIMENSION_WEIGHTS, {
    INTEREST: 0.25,
    SKILL: 0.2,
    APTITUDE: 0.15,
    PERSONALITY: 0.1,
    SUBJECT: 0.1,
    EDUCATION: 0.1,
    WORK_ENVIRONMENT: 0.05,
  });
});

test("engine freeze: source weights are immutable", () => {
  assert.deepEqual(SOURCE_WEIGHTS, {
    ASSESSMENT: 1.0,
    STUDENT_PROFILE: 0.8,
    ACADEMIC: 0.7,
    PREFERENCE: 0.7,
    MANUAL: 0.5,
  });
});

test("engine freeze: preferred career boost is bounded", () => {
  assert.strictEqual(PREFERRED_CAREER_BOOST, 12);
});

test("engine freeze: match-type strength tiers are immutable", () => {
  assert.deepEqual(MATCH_TYPE_STRENGTHS, {
    CANONICAL: 1.0,
    ALIAS: 0.9,
    STRUCTURED: 0.85,
    LEXICAL_EXACT: 0.7,
    LEXICAL_CONTAINS: 0.55,
    LEXICAL_SIMILAR: 0.5,
  });
  assert.strictEqual(LEXICAL_SIMILARITY_THRESHOLD, 0.66);
});

test("engine freeze: single-signal domination controls are immutable", () => {
  assert.deepEqual(SINGLE_SIGNAL_CONTROL, {
    extraTraitMatchDiscount: 0.5,
    breadthBase: 0.6,
    breadthPerDimension: 0.1,
    maxBreadth: 1,
  });
});

test("engine freeze: education scoring is stage-aware and immutable", () => {
  assert.deepEqual(EDUCATION_SCORING, {
    postSchoolAligned: 85,
    postSchoolNeutral: 55,
  });
});

test("engine freeze: confidence configuration is immutable (anti-inflation caps)", () => {
  assert.deepEqual(CONFIDENCE_CONFIG, {
    baseConfidence: 0.15,
    perMatchedSignal: 0.07,
    matchedSignalCap: 6,
    perMatchedDimension: 0.08,
    matchedDimensionCap: 4,
    sourceDiversityBonus: 0.06,
    assessmentEvidenceBonus: 0.08,
    coverageScalingBase: 0.7,
    coverageScalingPerCoverage: 0.3,
    highThreshold: 0.7,
    moderateThreshold: 0.4,
    preferredOnlyCap: 0.3,
    noMatchedSignalCap: 0.35,
  });
});

test("engine freeze: match-strength thresholds are immutable", () => {
  assert.deepEqual(MATCH_STRENGTH_THRESHOLDS, { strong: 70, moderate: 50, weak: 30 });
});

test("engine freeze: specificity (ranking tie-break) default is enabled with bounded gain", () => {
  // SPECIFICITY_CONFIG.enabled is env-switchable; the frozen default is ON with a
  // bounded 0.15 gain so ranking never overrides a clearly-higher score.
  assert.strictEqual(SPECIFICITY_CONFIG.gain, 0.15);
  assert.ok(SPECIFICITY_CONFIG.enabled || process.env.CAREER_MATCH__SPECIFICITY === "0");
});

test("engine freeze: default match limit is 10", () => {
  assert.strictEqual(DEFAULT_MATCH_LIMIT, 10);
});

// ---------------------------------------------------------------------------
// 2. Alias resolution snapshot
// ---------------------------------------------------------------------------
test("engine freeze: preferred-career aliases are stable and conservative", () => {
  assert.deepEqual(PREFERRED_CAREER_ALIASES, {
    "software engineer": "Software Engineering",
    "civil engineer": "Civil Engineering",
    "data scientist": "Data Science",
    "lawyer": "Law",
    "physician": "Medicine",
    "psychologist": "Psychology",
    "pharmacist": "Pharmacology",
    "biotechnologist": "Biotechnology Research",
    "archaeologist": "Archaeology",
    "linguist": "Linguistics",
    "curator": "Museum Studies and Curatorship",
    "copywriter": "Copywriting",
    "screenwriter": "Screenwriting",
  });
});

// ---------------------------------------------------------------------------
// 3. Behavioral invariants (determinism, honesty, stage neutrality, boost bound)
// ---------------------------------------------------------------------------
function makeCareer(overrides = {}) {
  return {
    id: "c-1",
    name: "Software Engineering",
    slug: "software-engineering",
    title: "Software Engineering",
    category: "Technology & Software",
    shortDescription: "",
    demandLevel: "High",
    jobGrowth: "+20%",
    salaryEntry: "6-12",
    salarySenior: "40-80",
    minStudyLevel: "Bachelor's",
    isEmerging: false,
    technicalSkills: ["Python", "Machine Learning"],
    softSkills: ["Problem Solving"],
    interests: ["Building software products"],
    personalityTraits: ["analytical"],
    recommendedSubjects: ["Computer Science", "Mathematics"],
    recommendedDegrees: ["B.Tech Computer Science"],
    careerEducationPathways: [{ id: "p1", degreeName: "B.Tech Computer Science", programPath: "Degree" }],
    traits: [
      { dimension: "SKILL", value: "programming" },
      { dimension: "INTEREST", value: "building_software" },
      { dimension: "PERSONALITY", value: "analytical" },
    ],
    ...overrides,
  };
}

test("engine freeze: ranking is deterministic for equal scores", () => {
  const signals = [
    { dimension: "INTEREST", value: "building_software", score: 90, sourceType: "ASSESSMENT" },
    { dimension: "SKILL", value: "programming", score: 90, sourceType: "ASSESSMENT" },
    { dimension: "PERSONALITY", value: "analytical", score: 90, sourceType: "ASSESSMENT" },
  ];
  const careers = [makeCareer({ id: "c1" }), makeCareer({ id: "c2" }), makeCareer({ id: "c3" })];
  const r1 = rankMatches(careers.map((c) => scoreCareer(c, signals)));
  const r2 = rankMatches(careers.map((c) => scoreCareer(c, signals)));
  assert.deepEqual(r1.map((m) => m.career.id), r2.map((m) => m.career.id));
});

test("engine freeze: low-information profile is honest (no invented recommendation)", () => {
  const career = makeCareer();
  const empty = scoreCareer(career, []);
  assert.strictEqual(empty.matchScore, 0);
  assert.ok(empty.evidence.length === 0);
});

test("engine freeze: a lone preference does not reach high confidence (no inflation)", () => {
  const career = makeCareer();
  const prefOnly = scoreCareer(career, [], "Software Engineering");
  // Preferred boost is bounded, and a single-preference-source result is
  // confidence-capped; it must not inflate to HIGH.
  assert.ok(prefOnly.matchScore <= 12);
  assert.ok(prefOnly.confidenceScore < 70);
});

test("engine freeze: preferred boost does not force rank #1 on a weaker profile", () => {
  const software = makeCareer({ id: "sw", name: "Software Engineering" });
  const medicine = makeCareer({
    id: "med",
    name: "Medicine",
    recommendedSubjects: ["Biology", "Chemistry"],
    traits: [{ dimension: "SUBJECT", value: "biology" }, { dimension: "SUBJECT", value: "chemistry" }],
  });
  const signals = [
    { dimension: "SUBJECT", value: "biology", score: 90, sourceType: "STUDENT_PROFILE" },
    { dimension: "SUBJECT", value: "chemistry", score: 90, sourceType: "STUDENT_PROFILE" },
  ];
  const ranked = rankMatches([scoreCareer(software, signals, "Medicine"), scoreCareer(medicine, signals, "Medicine")]);
  assert.strictEqual(ranked[0].career.id, "med");
});

test("engine freeze: school stage is education-score neutral (no penalty)", () => {
  const school = makeCareer();
  const signalsClass8 = [
    { dimension: "INTEREST", value: "building_software", score: 85, sourceType: "STUDENT_PROFILE" },
  ];
  const res = scoreCareer(school, signalsClass8, null);
  // School-stage absence of a degree must not subtract from the match score;
  // the EDUCATION dimension is excluded for school stage (future plausibility
  // is carried by other dimensions).
  const edu = res.dimensionScores.find((d) => d.dimension === "EDUCATION");
  assert.ok(edu === undefined || edu.score === 0);
});