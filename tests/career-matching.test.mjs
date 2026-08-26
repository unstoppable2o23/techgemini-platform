import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreCareer, rankMatches } from "../src/lib/career-matching/score.ts";

function makeCareer(overrides = {}) {
  return {
    id: "test-career-1",
    name: "Software Engineer",
    slug: "software-engineer",
    title: "Software Engineer",
    category: "Technology & Software",
    shortDescription: "Builds software",
    demandLevel: "High",
    jobGrowth: "+20%",
    salaryEntry: "6-12 LPA",
    salarySenior: "40-80 LPA",
    minStudyLevel: "Bachelor's",
    isEmerging: false,
    technicalSkills: ["Python", "JavaScript", "Data Structures"],
    softSkills: ["Problem Solving", "Team Collaboration"],
    interests: ["Building software products", "Solving logical puzzles"],
    personalityTraits: ["Analytical", "Detail-oriented"],
    recommendedDegrees: ["B.Tech Computer Science"],
    recommendedSubjects: ["Computer Science", "Mathematics"],
    traits: [],
    ...overrides,
  };
}

function makeSignal(dimension, value, score = 80, sourceType = "ASSESSMENT", confidence = 0.8) {
  return {
    dimension,
    value,
    score,
    confidence,
    sourceType,
    sourceAssessment: sourceType === "ASSESSMENT" ? "personality" : null,
  };
}

test("CASE 1: No assessments, rich StudentProfile produces recommendations", () => {
  const career = makeCareer();
  const signals = [
    makeSignal("INTEREST", "Building software products", 80, "STUDENT_PROFILE"),
    makeSignal("EDUCATION", "Computer Science", 90, "ACADEMIC"),
    makeSignal("SUBJECT", "Computer Science", 85, "ACADEMIC"),
  ];
  const match = scoreCareer(career, signals, null);
  assert.ok(match.matchScore > 0, "matchScore should be > 0");
  assert.ok(match.matchScore <= 100);
  assert.ok(match.confidenceScore > 0 && match.confidenceScore < 100);
  assert.ok(match.reasons.length > 0);
});

test("CASE 2: No assessments, minimal StudentProfile produces lower-confidence matches", () => {
  const career = makeCareer();
  const signals = [
    makeSignal("INTEREST", "Building software products", 70, "STUDENT_PROFILE"),
  ];
  const match = scoreCareer(career, signals, null);
  assert.ok(match.matchScore > 0);
  assert.ok(match.confidenceScore < 70, "confidence should be lower with minimal data");
});

test("CASE 3: Full assessments produce assessment-driven recommendations", () => {
  const career = makeCareer();
  const signals = [
    makeSignal("PERSONALITY", "analytical", 85),
    makeSignal("PERSONALITY", "introversion", 70),
    makeSignal("APTITUDE", "logical_mathematical", 90),
    makeSignal("SKILL", "Python", 85),
    makeSignal("INTEREST", "Building software products", 90),
    makeSignal("SUBJECT", "Computer Science", 88),
    makeSignal("EDUCATION", "B.Tech Computer Science", 80),
  ];
  const match = scoreCareer(career, signals, null);
  assert.ok(match.matchScore > 50, "assessment-driven score should be substantial");
  assert.ok(match.confidenceScore >= 70, "confidence should be high with full assessment data");
  assert.ok(match.sourceSummary.includes("Psychometric assessment"));
});

test("CASE 4: Full assessments + rich profile produce multi-source recommendations", () => {
  const career = makeCareer();
  const signals = [
    makeSignal("PERSONALITY", "analytical", 85),
    makeSignal("APTITUDE", "logical_mathematical", 90),
    makeSignal("INTEREST", "Building software products", 90),
    makeSignal("SUBJECT", "Computer Science", 88),
    makeSignal("SKILL", "Python", 85),
    makeSignal("INTEREST", "Building software products", 95, "STUDENT_PROFILE"),
    makeSignal("SUBJECT", "Computer Science", 90, "ACADEMIC"),
  ];
  const match = scoreCareer(career, signals, null);
  assert.ok(match.matchScore > 40);
  assert.ok(match.sourceSummary.length >= 2, "multiple sources should be reflected");
});

test("CASE 5: Only one assessment produces partial evidence", () => {
  const career = makeCareer();
  const signals = [makeSignal("PERSONALITY", "analytical", 80)];
  const match = scoreCareer(career, signals, null);
  assert.ok(match.matchScore > 0, "should have some score");
  assert.ok(match.confidenceScore < 80, "confidence should be moderate");
});

test("CASE 6: Preferred career boosts score but doesn't force 100%", () => {
  const career = makeCareer();
  const signals = [makeSignal("PERSONALITY", "extraversion", 30)];
  const withoutPref = scoreCareer(career, signals, null);
  const withPref = scoreCareer(career, signals, "Software Engineer");
  assert.ok(withPref.matchScore > withoutPref.matchScore, "preference should boost score");
  assert.ok(withPref.matchScore < 100, "preference alone should not force 100%");
  assert.equal(withPref.preferenceBoost, true);
  assert.ok(withPref.reasons.some((r) => r.type === "preference_boost"));
});

test("CASE 7: Strong skill mismatch shows development area", () => {
  const career = makeCareer({
    technicalSkills: ["Advanced Quantum Physics", "Nanotechnology"],
    personalityTraits: ["Highly Academic"],
    interests: ["Quantum research"],
  });
  const signals = [
    makeSignal("SKILL", "Creative Writing", 90),
    makeSignal("INTEREST", "Creative Writing", 90),
  ];
  const match = scoreCareer(career, signals, null);
  assert.ok(match.developmentAreas.length > 0, "should show development areas");
});

test("CASE 8: Missing personality data does not create artificial penalty", () => {
  const career = makeCareer();
  const signals = [
    makeSignal("INTEREST", "Building software products", 85, "STUDENT_PROFILE"),
    makeSignal("SKILL", "Python", 80, "STUDENT_PROFILE"),
  ];
  const match = scoreCareer(career, signals, null);
  const personalityDim = match.dimensionScores.find((d) => d.dimension === "PERSONALITY");
  assert.ok(personalityDim);
  assert.equal(personalityDim.matchedCount, 0);
  assert.ok(
    match.missingEvidence.some((e) => e.toLowerCase().includes("personality")),
    "should report missing personality evidence"
  );
  assert.ok(match.matchScore > 0);
});

test("CASE 9: Duplicate evidence is controlled", () => {
  const career = makeCareer();
  const signals = [
    makeSignal("INTEREST", "Building software products", 80, "ASSESSMENT", 0.9),
    makeSignal("INTEREST", "Building software products", 80, "STUDENT_PROFILE", 0.7),
  ];
  const match = scoreCareer(career, signals, null);
  const single = scoreCareer(career, [signals[0]], null);
  assert.ok(match.matchScore >= single.matchScore, "duplicate should not decrease score");
  assert.ok(match.matchScore <= 100, "score should be capped at 100");
});

test("CASE 10: Two equal scores produce deterministic ranking", () => {
  const career1 = makeCareer({ id: "a", name: "Alpha Career", slug: "alpha" });
  const career2 = makeCareer({ id: "b", name: "Beta Career", slug: "beta" });
  const signals = [makeSignal("INTEREST", "Building software products", 80)];
  const match1 = scoreCareer(career1, signals, null);
  const match2 = scoreCareer(career2, signals, null);
  match2.matchScore = match1.matchScore;
  match2.confidenceScore = match1.confidenceScore;
  const ranked = rankMatches([match2, match1]);
  assert.equal(ranked[0].career.name, "Alpha Career");
  assert.equal(ranked[1].career.name, "Beta Career");
});

test("CASE 11: Career with no traits does not crash", () => {
  const career = makeCareer({ traits: [], technicalSkills: [], softSkills: [], interests: [], personalityTraits: [] });
  const signals = [makeSignal("INTEREST", "Building software products", 80)];
  const match = scoreCareer(career, signals, null);
  assert.equal(match.matchScore, 0);
});

test("CASE 12: No active careers produces safe empty response", () => {
  const ranked = rankMatches([]);
  assert.deepEqual(ranked, []);
});

test("rankMatches sorts by matchScore desc, then confidenceScore desc, then name", () => {
  const careerA = makeCareer({ id: "a", name: "Alpha" });
  const careerB = makeCareer({ id: "b", name: "Beta" });
  const careerC = makeCareer({ id: "c", name: "Gamma" });

  const m1 = scoreCareer(careerA, [makeSignal("INTEREST", "test")], null);
  m1.matchScore = 70; m1.confidenceScore = 80;
  const m2 = scoreCareer(careerB, [makeSignal("INTEREST", "test")], null);
  m2.matchScore = 85; m2.confidenceScore = 60;
  const m3 = scoreCareer(careerC, [makeSignal("INTEREST", "test")], null);
  m3.matchScore = 70; m3.confidenceScore = 90;

  const ranked = rankMatches([m1, m2, m3]);
  assert.equal(ranked[0].career.name, "Beta");
  assert.equal(ranked[1].career.name, "Gamma");
  assert.equal(ranked[2].career.name, "Alpha");
});

test("match score is always 0-100", () => {
  const career = makeCareer();
  const signals = [];
  for (let i = 0; i < 50; i++) {
    signals.push(makeSignal("INTEREST", "signal" + i, 100, "ASSESSMENT"));
    signals.push(makeSignal("SKILL", "Python", 100, "ASSESSMENT"));
  }
  const match = scoreCareer(career, signals, "Software Engineer");
  assert.ok(match.matchScore >= 0 && match.matchScore <= 100);
  assert.ok(match.confidenceScore >= 0 && match.confidenceScore <= 100);
});
