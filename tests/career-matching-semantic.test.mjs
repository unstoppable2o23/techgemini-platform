import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreCareer, rankMatches } from "../src/lib/career-matching/score.ts";
import { matchSignal, stripSignalPrefix, canonicalKey, describeValue } from "../src/lib/career-matching/semantic-match.ts";
import { computeConfidence } from "../src/lib/career-matching/confidence.ts";
import { resolvePreferredCareer, legacyPreferredReference } from "../src/lib/career-matching/preferred-career.ts";
import { sanitizeCareerMatch } from "../src/lib/career-matching/engine.ts";

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
    educationPaths: [],
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

// ---------------------------------------------------------------- semantic tiers
test("T1: canonical concept matching outweighs text similarity", () => {
  const m = matchSignal("Computer Science", [{ value: "Computer Science", weight: 1 }]);
  assert.equal(m.matched, true);
  assert.equal(m.matchType, "CANONICAL");
  assert.equal(m.strength, 1);
});

test("T2: canonical embedded vocab (Logical Mathematical Intelligence) matches canonical key", () => {
  const m = matchSignal("logical_mathematical", [{ value: "Logical Mathematical Intelligence", weight: 1 }]);
  assert.equal(m.matched, true);
  assert.equal(m.matchType, "CANONICAL");
  assert.equal(canonicalKey("logical_mathematical"), "logical_mathematical");
});

test("T3: explicit alias map normalizes Analytical Rigour onto the canonical concept", () => {
  const m = matchSignal("analytical", [{ value: "Analytical Rigour", weight: 1 }]);
  assert.equal(m.matched, true);
  assert.equal(m.matchType, "CANONICAL", "alias-map terms resolve to the canonical concept, not a soft tier");
  assert.equal(m.strength, 1);
});

test("T4: structured synonym tier (coding vs programming)", () => {
  const m = matchSignal("coding", [{ value: "Programming", weight: 1 }]);
  assert.equal(m.matched, true);
  assert.equal(m.matchType, "STRUCTURED");
  assert.equal(m.strength, 0.85);
});

test("T5: lexical exact wording is the WEAKEST positive tier", () => {
  const m = matchSignal("Problem Solving", [{ value: "Problem Solving", weight: 1 }]);
  assert.equal(m.matched, true);
  assert.equal(m.matchType, "LEXICAL");
  assert.equal(m.strength, 0.7);
});

test("T6: false lexical similarity — AI Engineer vs AI Ethics Researcher must NOT match", () => {
  const m = matchSignal("AI Engineer", [{ value: "AI Ethics Researcher", weight: 1 }]);
  assert.equal(m.matched, false);
  assert.equal(m.matchType, "NONE");
});

test("T7: data analysis / analytical thinking / statistics are NOT conflated", () => {
  const analytical = matchSignal("Data Analysis", [{ value: "Analytical Thinking", weight: 1 }]);
  assert.equal(analytical.matched, false, "data analysis must not map to analytical thinking");
  const stats = matchSignal("Statistics", [{ value: "Statistical Methods", weight: 1 }]);
  assert.equal(stats.matched, false, "statistics must not map to statistical methods by substring");
});

test("T8: prefix stripping exposes the underlying concept for matching", () => {
  assert.equal(stripSignalPrefix("subject_studied:Computer Science"), "Computer Science");
  assert.equal(stripSignalPrefix("grade_level:CLASS_10"), "CLASS_10");
  const m = matchSignal("subject_enjoyed:Mathematics", [{ value: "Mathematics", weight: 1 }]);
  assert.equal(m.matched, true);
  assert.equal(m.matchType, "CANONICAL");
});

test("T9: describeValue returns canonical key when one exists", () => {
  const d = describeValue("Computer Science");
  assert.equal(d.canonicalKey, "computer_science");
  assert.equal(d.stripped, "Computer Science");
});

// ---------------------------------------------------------------- preferred career resolution
test("T10: resolvePreferredCareer uses canonical id first", () => {
  const careers = [
    { id: "c1", name: "Software Engineer" },
    { id: "c2", name: "Machine Learning Engineering" },
  ];
  const r = resolvePreferredCareer("c2", "Software Engineer", careers);
  assert.equal(r.resolved, true);
  assert.equal(r.source, "id");
  assert.equal(r.careerId, "c2");
});

test("T11: legacy name resolves exactly", () => {
  const careers = [{ id: "c1", name: "Medicine" }];
  const r = resolvePreferredCareer(null, "Medicine", careers);
  assert.equal(r.resolved, true);
  assert.equal(r.source, "name_exact");
});

test("T12: invalid id is recorded unresolved and never guessed", () => {
  const careers = [{ id: "c1", name: "Medicine" }];
  const r = resolvePreferredCareer("nope", "Medicine", careers);
  assert.equal(r.resolved, false);
  assert.equal(r.source, "unresolved");
  assert.equal(r.fallbackAllowed, false, "id input must never fall back to text guessing");
});

test("T13: unresolved legacy name keeps fallback matching allowed", () => {
  const careers = [{ id: "c1", name: "Medicine" }];
  const r = resolvePreferredCareer(null, "Medicine", careers);
  assert.equal(r.resolved, true);
  const r2 = resolvePreferredCareer(null, "Something Else Entirely", careers);
  assert.equal(r2.resolved, false);
  assert.equal(r2.fallbackAllowed, true);
});

// ---------------------------------------------------------------- preferred-career scoring behaviour
test("T14: canonical preferred career id boosts ONLY the canonical career", () => {
  const careerA = makeCareer({ id: "a", name: "Software Engineer" });
  const careerB = makeCareer({ id: "b", name: "Senior Software Engineer", category: "Technology & Software" });
  const signals = [makeSignal("INTEREST", "Building software products", 80, "STUDENT_PROFILE")];
  const pref = { careerId: "a", careerName: "Software Engineer", resolved: true, source: "id", fallbackAllowed: false };

  const matchA = scoreCareer(careerA, signals, pref);
  const matchB = scoreCareer(careerB, signals, pref);

  assert.equal(matchA.preferenceBoost, true, "canonical career must be boosted");
  assert.equal(matchB.preferenceBoost, false, "similar-named career must NOT inherit the preferred boost");
});

test("T15: legacy string preferred career still boosts (back-compat)", () => {
  const career = makeCareer();
  const signals = [makeSignal("PERSONALITY", "extraversion", 30)];
  const withPref = scoreCareer(career, signals, "Software Engineer");
  assert.equal(withPref.preferenceBoost, true);
  assert.ok(withPref.reasons.some((r) => r.type === "preference_boost"));
});

test("T16: legacyPreferredReference helper produces a fallback reference", () => {
  const ref = legacyPreferredReference("Medicine");
  assert.equal(ref.resolved, false);
  assert.equal(ref.fallbackAllowed, true);
  assert.equal(ref.careerName, "Medicine");
});

// ---------------------------------------------------------------- confidence cases A-D
test("T17: confidence case A — diverse reliable evidence is HIGH", () => {
  const c = computeConfidence({
    matchedSignals: 8,
    dimensionsMatched: 6,
    careerTraitDimensions: 6,
    sourceTypeCount: 3,
    assessmentEvidence: true,
    singlePreferenceSignal: false,
    anyMatch: true,
  });
  assert.ok(c.score >= 0.7, `expected high confidence, got ${c.score}`);
  assert.equal(c.level, "HIGH");
});

test("T18: confidence case B — preferred career alone is capped LOW", () => {
  const single = computeConfidence({
    matchedSignals: 1,
    dimensionsMatched: 1,
    careerTraitDimensions: 5,
    sourceTypeCount: 1,
    assessmentEvidence: false,
    singlePreferenceSignal: true,
    anyMatch: true,
  });
  assert.ok(single.score <= 0.3, `preferred-career-only must be low, got ${single.score}`);
  assert.equal(single.level, "LOW");
});

test("T19: confidence case C — many repeated signals in one dimension stay LOW/MODERATE", () => {
  const c = computeConfidence({
    matchedSignals: 1,
    dimensionsMatched: 1,
    careerTraitDimensions: 6,
    sourceTypeCount: 3,
    assessmentEvidence: false,
    singlePreferenceSignal: false,
    anyMatch: true,
  });
  assert.ok(c.score < 0.7, `single-dimension repetition must not be high, got ${c.score}`);
});

test("T20: confidence case D — assessment + profile diversity is high", () => {
  const c = computeConfidence({
    matchedSignals: 6,
    dimensionsMatched: 5,
    careerTraitDimensions: 5,
    sourceTypeCount: 2,
    assessmentEvidence: true,
    singlePreferenceSignal: false,
    anyMatch: true,
  });
  assert.ok(c.score >= 0.7, `expected high, got ${c.score}`);
  assert.equal(c.level, "HIGH");
});

test("T21: preferred-only signal via scoring is capped by confidence guard", () => {
  const career = makeCareer({ interests: ["Building software products"] });
  const signals = [makeSignal("INTEREST", "Building software products", 100, "PREFERENCE")];
  const match = scoreCareer(career, signals, null);
  assert.equal(match.preferenceBoost, false);
  assert.ok(match.confidenceScore <= 30, `cap expected <=30, got ${match.confidenceScore}`);
});

// ---------------------------------------------------------------- single-signal domination
test("T22: a well-rounded profile outranks one perfect dimension", () => {
  const career = makeCareer({
    interests: ["Building software products", "Coding products", "Shipping products"],
    personalityTraits: ["Analytical"],
    recommendedSubjects: ["Computer Science", "Mathematics"],
    technicalSkills: ["Python"],
  });
  const single = scoreCareer(
    career,
    [makeSignal("INTEREST", "Building software products", 100, "ASSESSMENT")],
    null
  );
  const multi = scoreCareer(
    career,
    [
      makeSignal("INTEREST", "Building software products", 80, "ASSESSMENT"),
      makeSignal("PERSONALITY", "analytical", 90, "ASSESSMENT"),
      makeSignal("SUBJECT", "Computer Science", 85, "ACADEMIC"),
      makeSignal("SKILL", "Python", 80, "ASSESSMENT"),
    ],
    null
  );
  assert.ok(single.matchScore <= 70, `single-dimension must be breadth-capped, got ${single.matchScore}`);
  assert.ok(multi.matchScore > single.matchScore, "breadth should win over a single dimension");
});

// ---------------------------------------------------------------- evidence separation
test("T23: subjects create SUBJECT evidence, not SKILL/APTITUDE", () => {
  const career = makeCareer({
    traits: [],
    technicalSkills: ["Mathematics"],
    interests: [],
    recommendedSubjects: ["Mathematics"],
  });
  // Force aptitudes via explicit traits to prove gating.
  career.traits.push({ dimension: "APTITUDE", value: "Mathematics", weight: 1 });
  const signals = [makeSignal("SUBJECT", "Mathematics", 90, "ACADEMIC")];
  const match = scoreCareer(career, signals, null);
  const subj = match.dimensionScores.find((d) => d.dimension === "SUBJECT");
  const skill = match.dimensionScores.find((d) => d.dimension === "SKILL");
  const apt = match.dimensionScores.find((d) => d.dimension === "APTITUDE");
  assert.ok(subj.matchedCount > 0, "Mathematics subject must match SUBJECT traits");
  assert.equal(skill.matchedCount, 0, "subject evidence must not leak into SKILL");
  assert.equal(apt.matchedCount, 0, "subject evidence must not leak into APTITUDE");
});

test("T24: career field mapping feeds the intended dimensions", () => {
  const career = makeCareer({
    technicalSkills: ["Python"],
    softSkills: ["Teamwork"],
    interests: ["AI research"],
    personalityTraits: ["Analytical"],
    recommendedSubjects: ["Mathematics"],
    recommendedDegrees: ["B.Tech Computer Science"],
  });
  const signals = [
    makeSignal("SKILL", "Python", 85, "ASSESSMENT"),
    makeSignal("INTEREST", "AI research", 80, "ASSESSMENT"),
    makeSignal("PERSONALITY", "analytical", 90, "ASSESSMENT"),
    makeSignal("SUBJECT", "Mathematics", 80, "ACADEMIC"),
  ];
  const match = scoreCareer(career, signals, null);
  for (const dim of ["SKILL", "INTEREST", "PERSONALITY", "SUBJECT"]) {
    const d = match.dimensionScores.find((x) => x.dimension === dim);
    assert.ok(d.matchedCount > 0, `${dim} should have matched`);
  }
});

// ---------------------------------------------------------------- stage-aware education
test("T25: school student is NOT penalized for future degree requirements", () => {
  const career = makeCareer({
    recommendedDegrees: ["B.Tech Computer Science"],
    technicalSkills: ["Python"],
    recommendedSubjects: ["Computer Science"],
  });
  const signals = [
    makeSignal("EDUCATION", "grade_level:CLASS_10", 100, "ACADEMIC"),
    makeSignal("SUBJECT", "Computer Science", 90, "ACADEMIC"),
  ];
  const match = scoreCareer(career, signals, null);
  const edu = match.dimensionScores.find((d) => d.dimension === "EDUCATION");
  assert.equal(edu.score, 70, "school stage should earn the plausible-baseline education score");
  assert.ok(
    match.reasons.some((r) => r.dimension === "EDUCATION" && /future step/i.test(r.text)),
    "school education reason should talk about a future pathway"
  );
  assert.ok(!match.developmentAreas.some((a) => /education/i.test(a)), "no education penalty for a school student");
  assert.ok(match.matchScore > 0, "school student should still get a real score");
});

test("T26: college stage aligned degree earns aligned education score", () => {
  const career = makeCareer({ recommendedDegrees: ["B.Tech Computer Science"] });
  const signals = [
    makeSignal("EDUCATION", "study_level:B.Tech Computer Science", 100, "STUDENT_PROFILE"),
    makeSignal("INTEREST", "Building software products", 80, "ASSESSMENT"),
  ];
  const match = scoreCareer(career, signals, null);
  const edu = match.dimensionScores.find((d) => d.dimension === "EDUCATION");
  assert.equal(edu.score, 85, "aligned college education should score the aligned baseline");
  assert.ok(edu.matchedCount > 0);
});

test("T27: college stage with divergent degree is NOT a verified gap", () => {
  const career = makeCareer({ recommendedDegrees: ["MBBS Medicine"] });
  const signals = [
    makeSignal("EDUCATION", "study_level:B.Com", 100, "STUDENT_PROFILE"),
    makeSignal("INTEREST", "Helping people", 80, "ASSESSMENT"),
  ];
  const match = scoreCareer(career, signals, null);
  const edu = match.dimensionScores.find((d) => d.dimension === "EDUCATION");
  assert.equal(edu.score, 55, "divergent-but-possible education should be neutral, not penalising");
  assert.ok(
    match.reasons.some((r) => r.dimension === "EDUCATION" && r.evidenceType === "DEVELOPMENT_AREA"),
    "education divergence should be surfaced as a development area, never a verified gap"
  );
});

test("T28: unknown education stage reports MISSING_EVIDENCE, not a gap", () => {
  const career = makeCareer({ recommendedDegrees: ["B.Tech Computer Science"] });
  const signals = [makeSignal("INTEREST", "Building software products", 80, "ASSESSMENT")];
  const match = scoreCareer(career, signals, null);
  const edu = match.dimensionScores.find((d) => d.dimension === "EDUCATION");
  assert.equal(edu.score, 0);
  assert.ok(
    match.reasons.some((r) => r.dimension === "EDUCATION" && r.evidenceType === "MISSING_EVIDENCE")
  );
});

// ---------------------------------------------------------------- explanations
test("T29: reasons carry structured evidenceType metadata", () => {
  const career = makeCareer({ personalityTraits: ["Analytical"] });
  const signals = [makeSignal("INTEREST", "Building software products", 80, "STUDENT_PROFILE")];
  const match = scoreCareer(career, signals, null);
  assert.ok(
    match.reasons.some((r) => r.dimension === "PERSONALITY" && r.evidenceType === "MISSING_EVIDENCE"),
    "personality with no data should be MISSING_EVIDENCE"
  );
});

test("T30: verified gap only appears with reliable conflicting evidence", () => {
  const career = makeCareer({
    technicalSkills: ["Advanced Quantum Physics"],
    softSkills: [],
    interests: ["Quantum research"],
  });
  const signals = [
    makeSignal("SKILL", "Creative Writing", 95, "ASSESSMENT"),
    makeSignal("INTEREST", "Creative Writing", 95, "ASSESSMENT"),
  ];
  const match = scoreCareer(career, signals, null);
  assert.ok(
    match.reasons.some((r) => r.evidenceType === "VERIFIED_GAP"),
    "reliable assessment evidence that does not align should be a VERIFIED_GAP"
  );
  assert.ok(match.verifiedGaps.length > 0);
  assert.ok(match.developmentAreas.length > 0, "gaps also surface as development areas");
});

// ---------------------------------------------------------------- match trace + sanitize
test("T31: matches expose structured evidence, matchTypes and an internal trace", () => {
  const career = makeCareer();
  const signals = [
    makeSignal("INTEREST", "Building software products", 90, "ASSESSMENT"),
    makeSignal("SUBJECT", "Computer Science", 88, "ACADEMIC"),
  ];
  const match = scoreCareer(career, signals, null);
  assert.ok(match.evidence.length > 0, "evidence list should be populated");
  assert.ok(match.evidence.every((e) => e.careerTraitValue && e.strength > 0));
  assert.ok(match.matchTypes.includes("CANONICAL") || match.matchTypes.includes("LEXICAL"));
  assert.ok(match.trace.careerId === career.id);
  assert.ok(match.trace.matchedSignals === new Set(match.evidence.map((e) => stripSignalPrefix(e.studentValue).toLowerCase())).size);
  assert.equal(match.trace.preferredCareerMatch, false);
});

test("T32: sanitizeCareerMatch strips the internal trace from student-facing results", () => {
  const career = makeCareer();
  const signals = [makeSignal("INTEREST", "Building software products", 90, "ASSESSMENT")];
  const match = scoreCareer(career, signals, null);
  const sanitized = sanitizeCareerMatch(match);
  assert.equal(sanitized.trace, undefined);
  assert.ok(sanitized.matchScore >= 0);
});

// ---------------------------------------------------------------- determinism
test("T33: tie-break uses score, confidence, supported dimensions, then name/id", () => {
  const mk = (id, name) => {
    const m = scoreCareer(makeCareer({ id, name }), [makeSignal("INTEREST", "Building software products", 80)], null);
    m.matchScore = 70;
    m.confidenceScore = 80;
    m.supportedDimensions = 1;
    return m;
  };
  const a = mk("a", "Alpha");
  const b = mk("b", "Beta");
  const c = mk("c", "Gamma");
  c.supportedDimensions = 2;
  const ranked = rankMatches([a, c, b]);
  assert.equal(ranked[0].career.name, "Gamma", "more supported dimensions should win the tie");
  assert.equal(ranked[1].career.name, "Alpha", "name asc secondary tie-break");
  assert.equal(ranked[2].career.name, "Beta");
});

test("T34: scoring is deterministic across repeated identical runs", () => {
  const career = makeCareer();
  const signals = [
    makeSignal("INTEREST", "Building software products", 85, "ASSESSMENT"),
    makeSignal("SUBJECT", "Computer Science", 90, "ACADEMIC"),
    makeSignal("PERSONALITY", "analytical", 80, "ASSESSMENT"),
  ];
  const a = scoreCareer(career, signals, "Software Engineer");
  const b = scoreCareer(career, signals, "Software Engineer");
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
});