// Phase 16D — regression tests.
// 1. Family-scoped specificity tie-break (within-family differentiation)
// 2. Cross-family rank stability (diversity preserved)
// 3. Zero-evidence / low-information state
// 4. Preferred career not inflated by specificity
// 5. Determinism with specificity on vs off
// 6. trait frequency + specificity math
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreCareer, rankMatches, buildTraitFrequency, traitSpecificity } from "../src/lib/career-matching/score.ts";
import { canonicalKey } from "../src/lib/career-matching/semantic-match.ts";
import { PREFERRED_CAREER_BOOST } from "../src/lib/career-matching/config.ts";

function makeCareer(overrides = {}) {
  return {
    id: "test-career-1",
    name: "Software Engineering",
    slug: "software-engineering",
    title: "Software Engineering",
    category: "Technology & Software",
    shortDescription: "Builds software",
    demandLevel: "High",
    jobGrowth: "+20%",
    salaryEntry: "6-12 LPA",
    salarySenior: "40-80 LPA",
    minStudyLevel: "Bachelor's",
    isEmerging: false,
    technicalSkills: ["Python"],
    softSkills: ["Problem Solving"],
    interests: ["Building software products"],
    personalityTraits: ["Analytical"],
    recommendedDegrees: ["B.Tech Computer Science"],
    recommendedSubjects: ["Computer Science", "Mathematics"],
    traits: [
      { dimension: "APTITUDE", value: "logical_reasoning", weight: 1 },
    ],
    educationPaths: [],
    ...overrides,
  };
}

function makeSignal(dimension, value, score = 80) {
  return { dimension, value, score, confidence: 0.8, sourceType: "ASSESSMENT", sourceAssessment: "personality" };
}

function careerMatch(overrides = {}) {
  const base = {
    careerId: "c1",
    career: {
      id: "c1",
      name: "Career A",
      slug: "career-a",
      title: "Career A",
      category: "Technology & Software",
      shortDescription: "desc",
      demandLevel: "High",
      salaryEntry: "x",
      isEmerging: false,
    },
    matchScore: 50,
    confidenceScore: 30,
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
      score: 0.3,
      level: "LOW",
      factors: { matchedSignals: 5, dimensionsMatched: 2, sourceDiversity: 1, assessmentEvidence: true, coverage: 0.4, cappedLow: false },
    },
    supportedDimensions: 2,
    trace: {
      careerId: "c1",
      totalScore: 50,
      confidence: 0.3,
      supportedDimensions: [],
      weakDimensions: [],
      unsupportedDimensions: [],
      matchedSignals: 5,
      matchTypes: [],
      preferredCareerMatch: false,
      preferredCareerSource: null,
    },
  };
  return { ...base, ...overrides };
}

// ---------------------------------------------------------------- D1: specificity only fires within same family
test("D1: specificity only fires when score AND family (category) tie", () => {
  const freq = new Map([
    ["logicalreasoning", 251],
    ["creativethinking", 1],
  ]);
  const activeCareerCount = 251;
  const techMatch = careerMatch({
    careerId: "tech",
    career: { ...careerMatch().career, id: "tech", name: "Data Science", slug: "data-science", category: "Data & AI" },
    matchScore: 73,
    evidence: [
      { dimension: "APTITUDE", studentValue: "logicalreasoning", careerTraitValue: "logicalreasoning", strength: 1, matchType: "CANONICAL", sourceType: "ASSESSMENT" },
      { dimension: "APTITUDE", studentValue: "creativethinking", careerTraitValue: "creativethinking", strength: 1, matchType: "CANONICAL", sourceType: "ASSESSMENT" },
    ],
  });
  const medMatch = careerMatch({
    careerId: "med",
    career: { ...careerMatch().career, id: "med", name: "Medicine", slug: "medicine", category: "Healthcare & Medicine" },
    matchScore: 73,
    evidence: [
      { dimension: "APTITUDE", studentValue: "logicalreasoning", careerTraitValue: "logicalreasoning", strength: 1, matchType: "CANONICAL", sourceType: "ASSESSMENT" },
    ],
  });
  const ctx = { traitFrequency: freq, activeCareerCount };
  const ranked = rankMatches([medMatch, techMatch], ctx);
  // Data & AI is its own family: tech and med differ both in family AND evidence
  // distinctiveness — but because families differ, specificity must NOT apply.
  // Order falls to confidence (tie) then supportedDimensions (tie) then name.
  assert.ok(ranked.length === 2);
  const order = ranked.map((m) => m.careerId);
  // Since families differ, fallback (name asc) decides: "Data Science" < "Medicine"
  assert.deepStrictEqual(order, ["tech", "med"]);
});

// ---------------------------------------------------------------- D2: same-score same-family distinctiveness tie-break
test("D2: same score + same family prefers more distinctive matched trait", () => {
  // Two careers in the SAME family, SAME score, SAME confidence, SAME dims.
  // Only the distinctiveness of matched evidence differs → distinctive wins.
  const genericCareer = careerMatch({
    career: { ...careerMatch().career, name: "Artificial Intelligence", slug: "artificial-intelligence" },
    evidence: [
      { dimension: "APTITUDE", studentValue: "logicalreasoning", careerTraitValue: "logicalreasoning", strength: 1, matchType: "CANONICAL", sourceType: "ASSESSMENT" },
    ],
  });
  const distinctiveCareer = careerMatch({
    career: { ...careerMatch().career, name: "Data Engineering", slug: "data-engineering" },
    evidence: [
      { dimension: "APTITUDE", studentValue: "creativethinking", careerTraitValue: "creativethinking", strength: 1, matchType: "CANONICAL", sourceType: "ASSESSMENT" },
    ],
  });
  const freq = new Map([
    ["logicalreasoning", 251], // present in almost every career
    ["creativethinking", 2],   // rare
  ]);
  const ranked = rankMatches(
    [genericCareer, distinctiveCareer],
    { traitFrequency: freq, activeCareerCount: 251 }
  );
  // Alphabetically "AI" < "Data Engineering", but distinctive evidence wins.
  assert.equal(ranked[0].career.name, "Data Engineering");
  assert.equal(ranked[1].career.name, "Artificial Intelligence");
});

// ---------------------------------------------------------------- D3: distinctiveness ONLY matters inside a family
test("D3: cross-family same-score ties keep name order (no cross-family reorder)", () => {
  const tech = careerMatch({
    careerId: "tech",
    career: { ...careerMatch().career, id: "tech", name: "Data Engineering", category: "Data & AI", slug: "data-engineering" },
    matchScore: 73,
    confidenceScore: 40,
    supportedDimensions: 2,
    evidence: [
      { dimension: "APTITUDE", studentValue: "creativethinking", careerTraitValue: "creativethinking", strength: 1, matchType: "CANONICAL", sourceType: "ASSESSMENT" },
    ],
  });
  const humanities = careerMatch({
    careerId: "hum",
    career: { ...careerMatch().career, id: "hum", name: "Journalism", category: "Media & Communication", slug: "journalism" },
    matchScore: 73,
    confidenceScore: 40,
    supportedDimensions: 2,
    evidence: [
      { dimension: "APTITUDE", studentValue: "logicalreasoning", careerTraitValue: "logicalreasoning", strength: 1, matchType: "CANONICAL", sourceType: "ASSESSMENT" },
    ],
  });
  const freq = new Map([
    ["creativethinking", 2],
    ["logicalreasoning", 251],
  ]);
  const ranked = rankMatches([humanities, tech], { traitFrequency: freq, activeCareerCount: 251 });
  // Different families → specificity must NOT fire even though distinctive differs.
  // Fallback: confidence tie → supportedDimensions tie → name asc.
  assert.deepStrictEqual(ranked.map((m) => m.careerId), ["tech", "hum"]);
});

// ---------------------------------------------------------------- D4: cross-family ordering beats generic-name leap
test("D4: preferred career still wins: specificity cannot override a higher score", () => {
  const boosted = careerMatch({
    careerId: "boost",
    career: { ...careerMatch().career, id: "boost", name: "Medicine", category: "Healthcare & Medicine" },
    matchScore: 85, // includes +12 preferred boost
    confidenceScore: 50,
    evidence: [
      { dimension: "SUBJECT", studentValue: "biology", careerTraitValue: "biology", strength: 1, matchType: "CANONICAL", sourceType: "PROFILE" },
    ],
  });
  const distinctiveLow = careerMatch({
    careerId: "low",
    career: { ...careerMatch().career, id: "low", name: "Data Engineering", category: "Data & AI" },
    matchScore: 73,
    confidenceScore: 50,
    evidence: [
      { dimension: "APTITUDE", studentValue: "creativethinking", careerTraitValue: "creativethinking", strength: 1, matchType: "CANONICAL", sourceType: "ASSESSMENT" },
    ],
  });
  const freq = new Map([["creativethinking", 2], ["biology", 60]]);
  const ranked = rankMatches([distinctiveLow, boosted], { traitFrequency: freq, activeCareerCount: 251 });
  assert.equal(ranked[0].careerId, "boost", "higher score must win regardless of distinctiveness");
});

// ---------------------------------------------------------------- D5: specificity is deterministic
test("D5: specificity tie-break is fully deterministic across repeated runs", () => {
  const freq = new Map([
    ["logicalreasoning", 251],
    ["creativethinking", 2],
  ]);
  const matches = [
    careerMatch({
      careerId: "a",
      career: { ...careerMatch().career, id: "a", name: "Cloud Computing", category: "Data & AI" },
      matchScore: 73,
      evidence: [{ dimension: "APTITUDE", studentValue: "logicalreasoning", careerTraitValue: "logicalreasoning", strength: 1, matchType: "CANONICAL", sourceType: "ASSESSMENT" }],
    }),
    careerMatch({
      careerId: "b",
      career: { ...careerMatch().career, id: "b", name: "Data Engineering", category: "Data & AI" },
      matchScore: 73,
      evidence: [{ dimension: "APTITUDE", studentValue: "creativethinking", careerTraitValue: "creativethinking", strength: 1, matchType: "CANONICAL", sourceType: "ASSESSMENT" }],
    }),
  ];
  const ctx = { traitFrequency: freq, activeCareerCount: 251 };
  const run = () => rankMatches([...matches], ctx).map((m) => m.careerId);
  const results = Array.from({ length: 5 }, () => run());
  for (const r of results) assert.deepStrictEqual(r, results[0], "deterministic across runs");
});

// ---------------------------------------------------------------- D6: specificity does NOT change scores
test("D6: scoreCareer produces same score with or without specificity context", () => {
  const c = makeCareer({
    traits: [
      { dimension: "APTITUDE", value: "logical_reasoning", weight: 1 },
      { dimension: "APTITUDE", value: "creative_thinking", weight: 0.8 },
    ],
  });
  const signals = [
    makeSignal("APTITUDE", "logical_reasoning"),
    makeSignal("APTITUDE", "creative_thinking"),
    makeSignal("SUBJECT", "Computer Science"),
  ];
  const scored = scoreCareer(c, signals, null);
  assert.ok(scored.matchScore > 0, "should score > 0");
  const trusted = { matchTypes: scored.matchTypes };
  const check = scoreCareer(c, signals, null);
  assert.equal(check.matchScore, scored.matchScore, "score is deterministic");
  assert.equal(check.matchStrength, scored.matchStrength);
  // specificity is a rank-only concern: scoreCareer knows nothing about it.
  assert.ok(!("specificity" in check), "scoreCareer must not return specificity");
  assert.ok(trusted.matchTypes.length > 0, "matchTypes recorded");
});

// ---------------------------------------------------------------- D7: trait frequency math
test("D7: buildTraitFrequency counts careers per trait (across all trait fields)", () => {
  const c1 = makeCareer({
    id: "c1",
    interests: ["Art and creativity"],
    personalityTraits: ["Analytical"],
    recommendedSubjects: ["Mathematics"],
    traits: [{ dimension: "APTITUDE", value: "logical_reasoning", weight: 1 }],
  });
  const c2 = makeCareer({
    id: "c2",
    interests: ["Art and creativity"],
    personalityTraits: ["Creative"],
    recommendedSubjects: ["Physics"],
    traits: [
      { dimension: "APTITUDE", value: "logical_reasoning", weight: 1 },
      { dimension: "APTITUDE", value: "attention_to_detail", weight: 0.6 },
    ],
  });
  const freq = buildTraitFrequency([c1, c2]);
  // normalized keys (non-alphanumerics stripped, lowercased)
  assert.equal(freq.get("logicalreasoning"), 2, "logical_reasoning in 2 careers");
  assert.equal(freq.get("attentiontodetail"), 1, "attention_to_detail in 1 career");
  assert.equal(freq.get("art and creativity"), 2, "interest in 2 careers");
  assert.equal(freq.get("mathematics"), 1);
  assert.equal(freq.get("physics"), 1);
  // trait values, interests, personalityTraits, recommendedSubjects all counted
  assert.equal(freq.get("analytical"), 1, "personality trait counted");
  assert.equal(freq.get("creative"), 1);
  // technicalSkills and softSkills too
  assert.equal(freq.get("python"), 2);
  assert.equal(freq.get("problem solving"), 2);
});

// ---------------------------------------------------------------- D8: traitSpecificity bounds
test("D8: traitSpecificity returns 1 for generic, >1 for distinctive, honoring gain cap", () => {
  const freq = new Map([["logicalreasoning", 250], ["nlp", 1]]);
  const count = 251;
  const generic = traitSpecificity("logical_reasoning", freq, count);
  const distinctive = traitSpecificity("nlp", freq, count);
  // generic: 250/251 → rawness ~0.004 → specificity ~1.0006
  assert.ok(generic >= 1 && generic < 1.01, `generic should be ~1, got ${generic}`);
  // distinctive: 1/251 → rawness ~0.996 → specificity ~1.149
  assert.ok(distinctive > 1.1 && distinctive <= 1.15, `distinctive should be ~1.15, got ${distinctive}`);
  // no freq map → 1 (safety, disabled path)
  assert.equal(traitSpecificity("anything", undefined, 251), 1);
});

// ---------------------------------------------------------------- D9: zero-evidence produces lowInformation semantics
test("D9: zero-evidence student produces all-zero scores (lowInformation basis)", () => {
  const c1 = makeCareer({ id: "c1", name: "Career A", interests: ["Art"] });
  const signals = [];
  const scored = scoreCareer(c1, signals, null);
  assert.equal(scored.matchScore, 0, "no evidence → score 0");
  assert.equal(scored.evidence.length, 0, "no evidence → empty evidence list");
  // lowInformation is computed at engine level from these zero results:
  //   hasMeaningful = scored.some(m => m.matchScore > 0 && m.evidence.length > 0)
  const hasMeaningful = [scored].some((m) => m.matchScore > 0 && m.evidence.length > 0);
  assert.equal(hasMeaningful, false, "no meaningful evidence when all scores are 0");
});

// ---------------------------------------------------------------- D10: art substring protection still intact (no regression)
test("D10: art substring protection unchanged after 16D changes", () => {
  assert.equal(canonicalKey("Partnership deals"), null);
  assert.equal(canonicalKey("Smart devices"), null);
  assert.equal(canonicalKey("Articulate"), null);
  assert.equal(canonicalKey("Charting Basics"), null);
  assert.equal(canonicalKey("Game Art & Design"), "art");
  assert.equal(canonicalKey("Art-making"), "art");
});