import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreCareer } from "../src/lib/career-matching/score.ts";
import { detectEducationStage } from "../src/lib/career-matching/score.ts";
import { matchSignal } from "../src/lib/career-matching/semantic-match.ts";

function makeCareer(overrides = {}) {
  return {
    id: "harden-career",
    name: "Data Engineer",
    slug: "data-engineer",
    title: "Data Engineer",
    category: "Data & AI",
    shortDescription: "Builds data pipelines",
    demandLevel: "High",
    jobGrowth: "+18%",
    salaryEntry: "8-16 LPA",
    salarySenior: "40-80 LPA",
    minStudyLevel: "Bachelor's",
    isEmerging: false,
    technicalSkills: ["Python", "SQL"],
    softSkills: ["Problem Solving"],
    interests: ["Building data products"],
    personalityTraits: ["Analytical"],
    recommendedDegrees: ["B.Tech Computer Science"],
    recommendedSubjects: ["Computer Science", "Mathematics"],
    traits: [],
    educationPaths: [],
    ...overrides,
  };
}

function sig(dimension, value, score = 80, sourceType = "ASSESSMENT", confidence = 0.8) {
  return {
    dimension,
    value,
    score,
    confidence,
    sourceType,
    sourceAssessment: sourceType === "ASSESSMENT" ? "personality" : null,
  };
}

// ---------------------------------------------------------------- truthful match tiers
test("H1: alias-map and embedded-phrase matches are ALIAS tier (0.9), never CANONICAL", () => {
  const aliasStudent = matchSignal("analytical", [{ value: "Analytical Rigour", weight: 1 }]);
  assert.equal(aliasStudent.matched, true);
  assert.equal(aliasStudent.matchType, "ALIAS");
  assert.equal(aliasStudent.strength, 0.9);

  const embedded = matchSignal("logical_mathematical", [
    { value: "Logical Mathematical Intelligence", weight: 1 },
  ]);
  assert.equal(embedded.matchType, "ALIAS");
  assert.equal(embedded.strength, 0.9);

  const directBoth = matchSignal("analytical", [{ value: "Analytical", weight: 1 }]);
  assert.equal(directBoth.matchType, "CANONICAL");
  assert.equal(directBoth.strength, 1);
});

test("H2: canonical student key vs canonical career key stays CANONICAL", () => {
  const m = matchSignal("Computer Science", [{ value: "Computer Science", weight: 1 }]);
  assert.equal(m.matchType, "CANONICAL");
  assert.equal(m.strength, 1);
});

// ---------------------------------------------------------------- education stage detection
test("H3: school study levels (Class 8-12) classify as SCHOOL, not POST_SCHOOL", () => {
  const signals = [sig("EDUCATION", "study_level:Class 8", 100, "STUDENT_PROFILE")];
  assert.equal(detectEducationStage(signals), "SCHOOL");
  const g = [sig("EDUCATION", "grade_level:CLASS_12", 100, "ACADEMIC")];
  assert.equal(detectEducationStage(g), "SCHOOL");
  const h = [sig("EDUCATION", "highest_education:Grade 12 / High School", 100, "ACADEMIC")];
  assert.equal(detectEducationStage(h), "SCHOOL");
});

test("H4: post-school study levels classify as POST_SCHOOL", () => {
  assert.equal(
    detectEducationStage([sig("EDUCATION", "study_level:B.Tech Computer Science", 100, "STUDENT_PROFILE")]),
    "POST_SCHOOL"
  );
  assert.equal(
    detectEducationStage([sig("EDUCATION", "study_level:Year 1 Undergraduate", 100, "STUDENT_PROFILE")]),
    "POST_SCHOOL"
  );
  assert.equal(
    detectEducationStage([sig("EDUCATION", "highest_education:Master's Degree", 100, "ACADEMIC")]),
    "POST_SCHOOL"
  );
  assert.equal(
    detectEducationStage([sig("EDUCATION", "study_level:MBBS NEET UG", 100, "STUDENT_PROFILE")]),
    "POST_SCHOOL"
  );
});

test("H5: planned/future study levels do NOT classify as POST_SCHOOL", () => {
  assert.equal(
    detectEducationStage([sig("EDUCATION", "study_level:planning to take B.Tech", 100, "STUDENT_PROFILE")]),
    "UNKNOWN"
  );
  assert.equal(
    detectEducationStage([sig("EDUCATION", "study_level:hoping to pursue a Master's", 100, "STUDENT_PROFILE")]),
    "UNKNOWN"
  );
});

test("H6: POST_SCHOOL wins when both stages present; no evidence is UNKNOWN", () => {
  assert.equal(
    detectEducationStage([
      sig("EDUCATION", "highest_education:Grade 12 / High School", 100, "ACADEMIC"),
      sig("EDUCATION", "study_level:Year 1 Undergraduate", 100, "STUDENT_PROFILE"),
    ]),
    "POST_SCHOOL"
  );
  assert.equal(detectEducationStage([]), "UNKNOWN");
});

// ---------------------------------------------------------------- school education is score-neutral
test("H7: school student's declared stage is score-neutral (no baseline inflation)", () => {
  const career = makeCareer();
  const withStage = scoreCareer(career, [
    sig("EDUCATION", "grade_level:CLASS_10", 100, "ACADEMIC"),
    sig("SUBJECT", "Computer Science", 90, "ACADEMIC"),
  ], null);
  const withoutStage = scoreCareer(career, [
    sig("SUBJECT", "Computer Science", 90, "ACADEMIC"),
  ], null);
  const edu = withStage.dimensionScores.find((d) => d.dimension === "EDUCATION");
  assert.equal(edu.score, 0, "school education must not add a generic baseline");
  assert.equal(edu.matchedCount, 0);
  assert.equal(
    withStage.matchScore,
    withoutStage.matchScore,
    "declaring a school stage must not change the score versus no education evidence"
  );
  assert.ok(
    !withStage.reasons.some((r) => r.dimension === "EDUCATION"),
    "school stage must produce no education reasons"
  );
});

test("H8: subject evidence is not double-counted from school stage", () => {
  const career = makeCareer();
  const school = scoreCareer(career, [
    sig("EDUCATION", "grade_level:CLASS_8", 100, "ACADEMIC"),
    sig("SUBJECT", "Computer Science", 90, "ACADEMIC"),
  ], null);
  const onlySubject = scoreCareer(career, [sig("SUBJECT", "Computer Science", 90, "ACADEMIC")], null);
  assert.equal(school.matchScore, onlySubject.matchScore, "school education must not double-count SUBJECT");
});

// ---------------------------------------------------------------- verified-gap tightening
test("H9: mixed aligned+non-aligned evidence shows alignment, never a gap for the missing trait", () => {
  // Student has Mathematics + Programming; career wants Mathematics + Research.
  const career = makeCareer({
    traits: [
      { dimension: "SUBJECT", value: "Mathematics", weight: 1 },
      { dimension: "SUBJECT", value: "Research", weight: 1 },
    ],
  });
  const r = scoreCareer(career, [
    sig("SUBJECT", "Mathematics", 90, "ASSESSMENT"),
    sig("SUBJECT", "Programming", 85, "ASSESSMENT"),
  ], null);
  const subj = r.dimensionScores.find((d) => d.dimension === "SUBJECT");
  assert.ok(subj.matchedCount > 0, "Mathematics must align");
  assert.ok(
    !r.verifiedGaps.some((g) => /subject/i.test(g)),
    "a partial genotype match must NOT be reported as a verified gap"
  );
});

test("H10: reliable non-aligned evidence with zero alignment is a VERIFIED_GAP", () => {
  const career = makeCareer({
    technicalSkills: ["Advanced Quantum Physics"],
    softSkills: [],
    interests: ["Quantum research"],
  });
  const r = scoreCareer(career, [sig("SKILL", "Creative Writing", 95, "ASSESSMENT")], null);
  assert.ok(r.verifiedGaps.some((g) => /skill/i.test(g)), "reliable conflicting SKILL should be a verified gap");
  assert.ok(r.developmentAreas.some((a) => /skill/i.test(a)), "gaps also surface as development areas");
});

test("H11: weak non-aligned evidence is a DEVELOPMENT_AREA, not a verified gap", () => {
  const career = makeCareer({
    technicalSkills: ["Advanced Quantum Physics"],
    softSkills: [],
    interests: ["Quantum research"],
  });
  const r = scoreCareer(career, [sig("SKILL", "Creative Writing", 40, "STUDENT_PROFILE")], null);
  assert.ok(
    !r.verifiedGaps.some((g) => /skill/i.test(g)),
    "weak/self-reported non-aligned evidence must not be a verified gap"
  );
  assert.ok(
    r.developmentAreas.some((a) => /skill/i.test(a)),
    "weak non-aligned evidence should still be a development area"
  );
});

// ---------------------------------------------------------------- score saturation
test("H12: matchScore and confidenceScore never exceed 100; single-signal breadth control holds", () => {
  const strong = scoreCareer(makeCareer(), [
    sig("INTEREST", "Building data products", 100, "ASSESSMENT"),
    sig("SKILL", "Python", 100, "ASSESSMENT"),
    sig("SUBJECT", "Computer Science", 100, "ACADEMIC"),
    sig("PERSONALITY", "Analytical", 100, "ASSESSMENT"),
  ], null);
  assert.ok(strong.matchScore <= 100, `matchScore must be <=100, got ${strong.matchScore}`);
  assert.ok(strong.confidenceScore <= 100, `confidenceScore must be <=100, got ${strong.confidenceScore}`);

  const one = scoreCareer(makeCareer(), [sig("INTEREST", "Building data products", 100, "ASSESSMENT")], null);
  assert.ok(one.matchScore < strong.matchScore, "a single dimension must not dominate a broad profile");
  assert.ok(one.confidenceScore < 45, "single signal must cap confidence");
});

test("H13: behaviour is deterministic across repeated calls", () => {
  const inputs = [
    sig("INTEREST", "Building data products", 80, "ASSESSMENT"),
    sig("SKILL", "Python", 85, "STUDENT_PROFILE"),
  ];
  const a = scoreCareer(makeCareer(), inputs, null);
  const b = scoreCareer(makeCareer(), inputs, null);
  assert.equal(a.matchScore, b.matchScore);
  assert.equal(a.confidenceScore, b.confidenceScore);
  assert.deepEqual(a.evidence.map((e) => `${e.dimension}:${e.strength}`), b.evidence.map((e) => `${e.dimension}:${e.strength}`));
});

// ---------------------------------------------------------------- evidence tiers / edge profiles
test("H14: empty profile yields an empty-but-safe result", () => {
  const r = scoreCareer(makeCareer(), [], null);
  assert.equal(r.matchScore, 0);
  assert.equal(r.evidence.length, 0);
  assert.equal(r.matchStrength, "missing_evidence");
});

test("H15: profile-only signals work (no assessments, no gaps fabricated)", () => {
  const r = scoreCareer(makeCareer(), [
    sig("SKILL", "Python", 80, "STUDENT_PROFILE"),
    sig("SUBJECT", "Mathematics", 85, "ACADEMIC"),
  ], null);
  assert.ok(r.matchScore > 0);
  assert.ok(!r.verifiedGaps.some((g) => /skill/i.test(g)), "aligned skill must not be a gap");
});

test("H16: assessment-only signals work", () => {
  const r = scoreCareer(makeCareer(), [sig("INTEREST", "Building data products", 85, "ASSESSMENT")], null);
  assert.ok(r.matchScore > 0);
  assert.ok(r.confidenceDetail.factors.assessmentEvidence === true);
});

test("H17: repeated identical signals are deduplicated (cannot inflate scores)", () => {
  const repeated = [
    sig("SKILL", "Python", 90, "ASSESSMENT"),
    sig("SKILL", "Python", 90, "ASSESSMENT"),
    sig("SKILL", "Python", 90, "STUDENT_PROFILE"),
  ];
  const single = [sig("SKILL", "Python", 90, "ASSESSMENT")];
  const a = scoreCareer(makeCareer(), repeated, null);
  const b = scoreCareer(makeCareer(), single, null);
  assert.equal(a.matchScore, b.matchScore, "repeated identical signals must not inflate score");
  assert.equal(
    a.trace.matchedSignals,
    b.trace.matchedSignals,
    "repeated identical signals must count once for confidence"
  );
});

// ---------------------------------------------------------------- legacy preferred-career fallback
test("H18: preferred 'AI' does not half-boost every AI-category career", () => {
  const aiCareer = makeCareer({ name: "Machine Learning Engineer", category: "AI & Technology" });
  const other = makeCareer({ name: "Data Engineer", category: "Data & AI" });
  const ai = scoreCareer(aiCareer, [], "AI");
  const data = scoreCareer(other, [], "AI");
  assert.equal(ai.preferenceBoost, false, "category containment must not boost AI careers");
  assert.equal(data.preferenceBoost, false, "substring preferred must not boost");
});

test("H19: exact normalized name equality boosts", () => {
  const career = makeCareer({ name: "Data Engineer" });
  const r = scoreCareer(career, [], "Data Engineer");
  assert.equal(r.preferenceBoost, true);
  assert.equal(r.trace.preferredCareerSource, "unresolved", "legacy string scoring keeps the raw unresolved source");
});

test("H20: ambiguous legacy preferred (id authoritative) never falls back", () => {
  // A resolver already produced a definitive canonical resolution.
  const pref = { resolved: true, careerId: "some-other-career", careerName: "Data Engineer", fallbackAllowed: false, source: "id" };
  const career = makeCareer({ name: "Data Engineer" });
  const r = scoreCareer(career, [], pref);
  assert.equal(r.preferenceBoost, false, "canonical id resolution to another career must not boost via name");
});

test("H21: exact title equality boosts legacy fallback", () => {
  const career = makeCareer({ name: "Data Engineer", title: "Data Engineering Specialist" });
  const r = scoreCareer(career, [], "Data Engineering Specialist");
  assert.equal(r.preferenceBoost, true);
  assert.equal(r.trace.preferredCareerSource, "unresolved", "legacy string scoring keeps the raw unresolved source");
});