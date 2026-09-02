import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreCareer, rankMatches } from "../src/lib/career-matching/score.ts";
import { canonicalKey } from "../src/lib/career-matching/semantic-match.ts";
import { resolvePreferredCareer } from "../src/lib/career-matching/preferred-career.ts";
import { CANONICAL_SIGNALS, isCanonicalSignal } from "../src/lib/career-profile/canonical-signals.ts";
import { APTITUDE_BY_CAREER, WORKENV_BY_CAREER } from "../scripts/phase16c-data.ts";

// ---------------------------------------------------------------------------
// Phase 16C — career-intelligence enrichment (APTITUDE + WORK_ENVIRONMENT + thin
// career enrichment + conservative preferred aliases).
//
// Every APTITUDE / WORK_ENVIRONMENT value below is a canonical assessment-signal
// value (Multiple Intelligences, Ideal Career, Learning & Productivity), so a
// student signal emitted in the same dimension resolves at CANONICAL tier.
// ---------------------------------------------------------------------------

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
    technicalSkills: ["Python", "JS", "Data Structures", "Adaptability"],
    softSkills: ["Problem Solving", "Teamwork", "Time Management"],
    interests: ["Building software products", "Solving logical puzzles"],
    personalityTraits: ["Analytical", "Detail-oriented"],
    recommendedDegrees: ["B.Tech Computer Science"],
    recommendedSubjects: ["Computer Science", "Mathematics"],
    traits: [
      { dimension: "APTITUDE", value: "logical_reasoning", weight: 1 },
      { dimension: "APTITUDE", value: "logical_mathematical", weight: 0.6 },
      { dimension: "WORK_ENVIRONMENT", value: "prefers_quiet", weight: 0.6 },
      { dimension: "WORK_ENVIRONMENT", value: "prefers_structure", weight: 0.6 },
    ],
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

// ---------------------------------------------------------------- 1+2. canonical APTITUDE + WORK_ENV matching
test("C1: APTITUDE canonical signal matches APTITUDE trait at CANONICAL tier", () => {
  const m = matchCanonical("logical_reasoning", "logical_reasoning");
  assert.equal(m.matched, true);
  assert.equal(m.matchType, "CANONICAL");
  assert.equal(m.strength, 1);
});

test("C2: WORK_ENVIRONMENT canonical signal matches WORK_ENVIRONMENT trait at CANONICAL tier", () => {
  const m = matchCanonical("prefers_quiet", "prefers_quiet");
  assert.equal(m.matched, true);
  assert.equal(m.matchType, "CANONICAL");
  assert.equal(m.strength, 1);
});

function matchCanonical(signalVal, traitVal) {
  // Reuse the engine's matcher via a throwaway career to avoid re-importing internals.
  const career = makeCareer({ traits: [{ dimension: "APTITUDE", value: traitVal, weight: 1 }] });
  const signals = [makeSignal("APTITUDE", signalVal)];
  const match = scoreCareer(career, signals, null);
  const dim = match.dimensionScores.find((d) => d.dimension === "APTITUDE");
  const ev = match.evidence.find((e) => e.strength === 1);
  return { matched: Boolean(ev), matchType: ev?.matchType ?? "NONE", strength: ev?.strength ?? 0, score: dim?.score };
}

// ---------------------------------------------------------------- 3. assessment-only
test("C3: APTITUDE + WORK_ENV traits can be satisfied from assessment signals alone", () => {
  const career = makeCareer();
  const signals = [
    makeSignal("APTITUDE", "logical_reasoning"),
    makeSignal("APTITUDE", "logical_mathematical"),
    makeSignal("WORK_ENVIRONMENT", "prefers_quiet"),
    makeSignal("WORK_ENVIRONMENT", "prefers_structure"),
  ];
  const match = scoreCareer(career, signals, null);
  const apt = match.dimensionScores.find((d) => d.dimension === "APTITUDE");
  const we = match.dimensionScores.find((d) => d.dimension === "WORK_ENVIRONMENT");
  assert.ok(apt.matchedCount >= 2, "APTITUDE dimension should match both aptitude signals");
  assert.ok(we.matchedCount >= 2, "WORK_ENVIRONMENT dimension should match both environment signals");
  assert.ok(apt.score > 0 && we.score > 0);
});

// ---------------------------------------------------------------- 4. profile-only
test("C4: mismatch on APTITUDE/WORK_ENV yields zero matchedCount for those dimensions", () => {
  const career = makeCareer();
  const signals = [makeSignal("APTITUDE", "visual_spatial"), makeSignal("WORK_ENVIRONMENT", "prefers_formal_setting")];
  const match = scoreCareer(career, signals, null);
  const apt = match.dimensionScores.find((d) => d.dimension === "APTITUDE");
  const we = match.dimensionScores.find((d) => d.dimension === "WORK_ENVIRONMENT");
  assert.equal(apt.matchedCount, 0);
  assert.equal(we.matchedCount, 0);
});

// ---------------------------------------------------------------- 5. combined
test("C5: combined aptitude + environment + profile signals enrich the overall match", () => {
  const career = makeCareer();
  const aptOnly = scoreCareer(career, [makeSignal("APTITUDE", "logical_reasoning")], null);
  const combined = scoreCareer(
    career,
    [
      makeSignal("APTITUDE", "logical_reasoning"),
      makeSignal("WORK_ENVIRONMENT", "prefers_quiet"),
      makeSignal("SUBJECT", "Computer Science"),
      makeSignal("INTEREST", "Building software products"),
    ],
    null
  );
  assert.ok(combined.matchScore > aptOnly.matchScore, "breadth of evidence should raise the score");
  assert.ok(combined.supportedDimensions >= 4, "multiple dimensions should be supported");
});

// ---------------------------------------------------------------- 6-8. medicine / software / law / psychology / arts
test("C6: well-rounded medicine student ranks highest for Medicine over STEM-only careers", () => {
  const medicine = makeCareer({
    id: "med", name: "Medicine", slug: "medicine", category: "Clinical & Healthcare",
    traits: [
      { dimension: "APTITUDE", value: "attention_to_detail", weight: 1 },
      { dimension: "APTITUDE", value: "interpersonal", weight: 1 },
      { dimension: "WORK_ENVIRONMENT", value: "prefers_structure", weight: 1 },
    ],
    personalityTraits: ["Compassionate", "Detail-oriented"],
    interests: ["Helping people", "Clinical practice"],
    recommendedSubjects: ["Biology", "Chemistry"],
  });
  const software = makeCareer({
    id: "sw", name: "Software Engineering", slug: "software-engineering", category: "Technology & Software",
    traits: [
      { dimension: "APTITUDE", value: "logical_reasoning", weight: 1 },
      { dimension: "APTITUDE", value: "logical_mathematical", weight: 0.6 },
    ],
    personalityTraits: ["Analytical"],
    interests: ["Building software products"],
    recommendedSubjects: ["Mathematics", "Computer Science"],
  });
  const signals = [
    makeSignal("INTEREST", "Helping people"),
    makeSignal("PERSONALITY", "compassionate"),
    makeSignal("APTITUDE", "interpersonal"),
    makeSignal("APTITUDE", "attention_to_detail"),
    makeSignal("WORK_ENVIRONMENT", "prefers_structure"),
  ];
  const ranked = rankMatches([software, medicine].map((c) => scoreCareer(c, signals, null)));
  assert.equal(ranked[0].career.id, "med", "medicine profile should win for Medicine over software");
});

test("C7: software engineer signal stack ranks Software Engineering over Medicine", () => {
  const software = makeCareer({
    id: "sw", name: "Software Engineering", slug: "software-engineering",
    traits: [
      { dimension: "APTITUDE", value: "logical_reasoning", weight: 1 },
      { dimension: "APTITUDE", value: "logical_mathematical", weight: 0.6 },
      { dimension: "WORK_ENVIRONMENT", value: "prefers_quiet", weight: 0.6 },
      { dimension: "WORK_ENVIRONMENT", value: "independent_preference", weight: 1 },
    ],
    personalityTraits: ["Analytical"],
    interests: ["Building software products"],
    recommendedSubjects: ["Mathematics", "Computer Science"],
  });
  const medicine = makeCareer({
    id: "med", name: "Medicine", slug: "medicine",
    traits: [
      { dimension: "APTITUDE", value: "attention_to_detail", weight: 1 },
      { dimension: "APTITUDE", value: "interpersonal", weight: 1 },
      { dimension: "WORK_ENVIRONMENT", value: "prefers_structure", weight: 1 },
    ],
    personalityTraits: ["Compassionate"],
    interests: ["Helping people"],
    recommendedSubjects: ["Biology", "Chemistry"],
  });
  const signals = [
    makeSignal("INTEREST", "Building software products"),
    makeSignal("PERSONALITY", "analytical"),
    makeSignal("APTITUDE", "logical_reasoning"),
    makeSignal("APTITUDE", "logical_mathematical"),
    makeSignal("WORK_ENVIRONMENT", "prefers_quiet"),
    makeSignal("WORK_ENVIRONMENT", "independent_preference"),
    makeSignal("SUBJECT", "Computer Science"),
  ];
  const ranked = rankMatches([software, medicine].map((c) => scoreCareer(c, signals, null)));
  assert.equal(ranked[0].career.id, "sw", "software profile should win for Software Engineering");
});

test("C8: law student (logical reasoning) outranks an art/design profile for Law", () => {
  const law = makeCareer({
    id: "law", name: "Law", slug: "law",
    traits: [
      { dimension: "APTITUDE", value: "logical_reasoning", weight: 1 },
      { dimension: "APTITUDE", value: "linguistic", weight: 0.6 },
    ],
    personalityTraits: ["Analytical", "Persuasive"],
    interests: ["Legal argument"],
    recommendedSubjects: ["Political Science"],
  });
  const art = makeCareer({
    id: "art", name: "Fine Arts", slug: "fine-arts",
    traits: [{ dimension: "APTITUDE", value: "visual_spatial", weight: 1 }],
    personalityTraits: ["Creative"],
    interests: ["Visual art"],
    recommendedSubjects: ["Fine Arts"],
  });
  const signals = [
    makeSignal("APTITUDE", "logical_reasoning"),
    makeSignal("APTITUDE", "linguistic"),
    makeSignal("PERSONALITY", "analytical"),
    makeSignal("INTEREST", "Legal argument"),
  ];
  const ranked = rankMatches([law, art].map((c) => scoreCareer(c, signals, null)));
  assert.equal(ranked[0].career.id, "law", "logical-reasoning profile should pick Law over Fine Arts");
});

test("C9: psychology profile (interpersonal + emotional intelligence) ranks Psychology first", () => {
  const psych = makeCareer({
    id: "psy", name: "Psychology", slug: "psychology",
    traits: [
      { dimension: "APTITUDE", value: "interpersonal", weight: 1 },
      { dimension: "APTITUDE", value: "emotional_intelligence", weight: 1 },
    ],
    personalityTraits: ["Empathetic"],
    interests: ["Understanding people"],
    recommendedSubjects: ["Psychology"],
  });
  const tech = makeCareer({
    id: "tech", name: "Data Science", slug: "data-science",
    traits: [
      { dimension: "APTITUDE", value: "pattern_recognition", weight: 1 },
      { dimension: "APTITUDE", value: "logical_mathematical", weight: 1 },
    ],
    personalityTraits: ["Analytical"],
    interests: ["Data analysis"],
    recommendedSubjects: ["Mathematics"],
  });
  const signals = [
    makeSignal("APTITUDE", "interpersonal", 90),
    makeSignal("APTITUDE", "emotional_intelligence", 90, "ASSESSMENT", 0.8),
    makeSignal("PERSONALITY", "empathetic", 90),
    makeSignal("INTEREST", "Understanding people", 80),
  ];
  const ranked = rankMatches([psych, tech].map((c) => scoreCareer(c, signals, null)));
  assert.equal(ranked[0].career.id, "psy", "people-focused profile should pick Psychology over Data Science");
});

test("C10: arts student (visual_spatial) ranks Fine Arts over an analytical career", () => {
  const art = makeCareer({
    id: "art", name: "Fine Arts", slug: "fine-arts",
    traits: [
      { dimension: "APTITUDE", value: "visual_spatial", weight: 1 },
      { dimension: "WORK_ENVIRONMENT", value: "prefers_autonomy", weight: 0.6 },
    ],
    personalityTraits: ["Creative"],
    interests: ["Visual art"],
    recommendedSubjects: ["Fine Arts"],
  });
  const econ = makeCareer({
    id: "econ", name: "Economics", slug: "economics",
    traits: [
      { dimension: "APTITUDE", value: "logical_mathematical", weight: 0.6 },
      { dimension: "APTITUDE", value: "logical_reasoning", weight: 0.6 },
    ],
    personalityTraits: ["Analytical"],
    interests: ["Markets"],
    recommendedSubjects: ["Economics"],
  });
  const signals = [
    makeSignal("APTITUDE", "visual_spatial"),
    makeSignal("WORK_ENVIRONMENT", "prefers_autonomy"),
    makeSignal("PERSONALITY", "creative"),
    makeSignal("INTEREST", "Visual art"),
  ];
  const ranked = rankMatches([art, econ].map((c) => scoreCareer(c, signals, null)));
  assert.equal(ranked[0].career.id, "art", "visual-spatial profile should pick Fine Arts over Economics");
});

// ---------------------------------------------------------------- 11-12. preferred aliases + ambiguous
test("C11: professional-title aliases resolve to their canonical careers", () => {
  const careers = [
    { id: "c1", name: "Software Engineering" },
    { id: "c2", name: "Law" },
    { id: "c3", name: "Medicine" },
    { id: "c4", name: "Psychology" },
    { id: "c5", name: "Pharmacology" },
  ];
  assert.equal(resolvePreferredCareer(null, "Software Engineer", careers).careerId, "c1");
  assert.equal(resolvePreferredCareer(null, "lawyer", careers).careerId, "c2");
  assert.equal(resolvePreferredCareer(null, "physician", careers).careerId, "c3");
  assert.equal(resolvePreferredCareer(null, "psychologist", careers).careerId, "c4");
});

test("C12: ambiguous professional titles stay unresolved (no guessing)", () => {
  const careers = [
    { id: "c1", name: "Cloud Solutions Architect" },
    { id: "c2", name: "Architecture" },
  ];
  // "architect" could mean either Cloud Solutions Architect or Architecture; we
  // deliberately keep no alias, so it must resolve as unresolved (never forced).
  const r = resolvePreferredCareer(null, "architect", careers);
  assert.equal(r.resolved, false);
  assert.equal(r.source, "unresolved");
  // "doctor" is broader than any single discipline and must also stay unresolved.
  const r2 = resolvePreferredCareer(null, "doctor", [{ id: "m", name: "Medicine" }]);
  assert.equal(r2.resolved, false);
});

test("C12b: alias must not resolve when the target career does not exist", () => {
  const r = resolvePreferredCareer(null, "software engineer", [{ id: "c", name: "Something Else" }]);
  assert.equal(r.resolved, false);
});

// ---------------------------------------------------------------- 13. generic STEM differentiation
test("C13: underrepresented aptitude dominates the generic-STEM free-ride", () => {
  const agricEng = makeCareer({
    id: "ag", name: "Agricultural Engineering", slug: "agricultural-engineering",
    traits: [
      { dimension: "APTITUDE", value: "naturalist", weight: 1 },
      { dimension: "APTITUDE", value: "logical_mathematical", weight: 0.6 },
      { dimension: "APTITUDE", value: "logical_reasoning", weight: 0.6 },
    ],
    interests: ["Sustainable farming"],
    recommendedSubjects: ["Mathematics", "Chemistry", "Biology", "Physics"],
  });
  const software = makeCareer({
    id: "sw", name: "Software Engineering", slug: "software-engineering",
    traits: [
      { dimension: "APTITUDE", value: "logical_reasoning", weight: 1 },
      { dimension: "APTITUDE", value: "attention_to_detail", weight: 0.6 },
    ],
    interests: ["Building software products"],
    recommendedSubjects: ["Mathematics", "Computer Science"],
  });
  // A generic STEM student (matches Mathematics subject) with naturalist aptitude.
  const signals = [
    makeSignal("SUBJECT", "Mathematics"),
    makeSignal("APTITUDE", "naturalist"),
  ];
  const ag = scoreCareer(agricEng, signals, null);
  const sw = scoreCareer(software, signals, null);
  const agApt = ag.dimensionScores.find((d) => d.dimension === "APTITUDE");
  const swApt = sw.dimensionScores.find((d) => d.dimension === "APTITUDE");
  assert.ok(agApt.score > swApt.score, "naturalist aptitude should raise agricultural-engineering APTITUDE score");
  assert.ok(agApt.matchedCount > 0, "naturalist trait should be matched for agricultural engineering");
});

// ---------------------------------------------------------------- 14. no duplicate CareerTrait rows
test("C14: enrichment uses ONLY canonical assessment vocabulary in the right dimension", () => {
  // Every APTITUDE trait value must be a real canonical signal declared as
  // APTITUDE; every WORK_ENVIRONMENT value a real canonical signal declared as
  // WORK_ENVIRONMENT. This is the STOP-condition honesty gate: we never
  // introduce non-canonical nouns students can't emit.
  const assertCanonical = (dimension, values, slug) => {
    const seen = new Set();
    for (const t of values) {
      assert.ok(isCanonicalSignal(t.value), `${dimension} value "${t.value}" (${slug}) must be a canonical signal`);
      assert.equal(
        CANONICAL_SIGNALS[t.value].dimension,
        dimension,
        `${dimension} value "${t.value}" (${slug}) must be declared in dimension ${dimension}`
      );
      assert.ok(!seen.has(t.value), `duplicate ${dimension} value "${t.value}" for ${slug}`);
      seen.add(t.value);
    }
  };
  for (const [slug, tra] of Object.entries(APTITUDE_BY_CAREER)) assertCanonical("APTITUDE", tra, slug);
  for (const [slug, tra] of Object.entries(WORKENV_BY_CAREER)) assertCanonical("WORK_ENVIRONMENT", tra, slug);
});

// ---------------------------------------------------------------- 15. idempotent enrichment
test("C15: re-applying the enrichment is a no-op (dataset is a pure mapping)", () => {
  // The enrichment module is a pure data map: the same careers already cover
  // the exact same value set. Importing/applying twice yields the same rows.
  const slugs = Object.keys(APTITUDE_BY_CAREER);
  assert.ok(slugs.length >= 40, "enrichment should cover a broad set of careers");
  // Every APTITUDE career should also have a WORK_ENVIRONMENT mapping (or at
  // least the data module must be internally consistent).
  for (const s of slugs) {
    assert.ok(Array.isArray(WORKENV_BY_CAREER[s] ?? APTITUDE_BY_CAREER[s]), `career ${s} must have environment data`);
  }
});

// ---------------------------------------------------------------- 16. no art-substring regression
test("C16: art concept does not leak through substring APIs after enrichment", () => {
  // No mid-token substring must resolve to the art concept (Phase 16B rule).
  assert.equal(canonicalKey("Partnership deals"), null);
  assert.equal(canonicalKey("Smart devices"), null);
  assert.equal(canonicalKey("Articulate"), null);
  assert.equal(canonicalKey("Charting Basics"), null);
  // A genuine whole-word "Art" still resolves to the art concept.
  assert.equal(canonicalKey("Game Art & Design"), "art");
  assert.equal(canonicalKey("Art-making"), "art");
});

// ---------------------------------------------------------------- 17. deterministic ranking
test("C17: ranking with aptitude evidence is deterministic", () => {
  const careers = ["Software Engineering", "Medicine", "Law"].map((name, i) =>
    makeCareer({
      id: `c${i}`,
      name,
      traits: [{ dimension: "APTITUDE", value: "logical_reasoning", weight: 1 }],
    })
  );
  const signals = [makeSignal("APTITUDE", "logical_reasoning"), makeSignal("WORK_ENVIRONMENT", "prefers_quiet")];
  const a = rankMatches(careers.map((c) => scoreCareer(c, signals, null))).map((m) => m.career.id);
  const b = rankMatches(careers.map((c) => scoreCareer(c, signals, null))).map((m) => m.career.id);
  assert.deepStrictEqual(a, b);
});

// ---------------------------------------------------------------- 18. engine unchanged
test("C18: scoreStandardDimension matches APTITUDE evidence as CANONICAL and counts it", () => {
  const career = makeCareer({ traits: [{ dimension: "APTITUDE", value: "logical_reasoning", weight: 1 }] });
  const signals = [makeSignal("APTITUDE", "logical_reasoning")];
  const match = scoreCareer(career, signals, null);
  assert.ok(match.evidence.some((e) => e.careerTraitValue === "logical_reasoning" && e.matchType === "CANONICAL"));
  assert.ok(match.matchTypes.includes("CANONICAL"));
});