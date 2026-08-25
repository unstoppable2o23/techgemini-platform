import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAssessmentReport } from "../src/lib/career-profile/normalize.ts";
import { buildReport, questionsFor } from "../src/lib/tests.ts";
import { CANONICAL_SIGNALS, canonicalizeCareerTraitValue } from "../src/lib/career-profile/canonical-signals.ts";

function answerAll(kind, pick) {
  const bank = questionsFor(kind);
  const answers = {};
  for (const q of Object.values(bank)) {
    const opts = Object.values(q.options).sort((a, b) => Number(a.id) - Number(b.id));
    const idx = pick === "last" ? opts.length - 1 : 0;
    answers[String(q.id)] = String(opts[idx].id);
  }
  return answers;
}

const source = { assignmentId: "test-assignment-1", version: "1.0" };

test("stream report normalizes into SUBJECT + INTEREST signals", () => {
  const report = buildReport("stream", answerAll("stream"));
  const { signals, primaryInterests } = normalizeAssessmentReport("stream", report, source);
  assert.ok(signals.length > 0);
  const subjects = signals.filter((s) => s.dimension === "SUBJECT");
  assert.ok(subjects.length >= 3, "stream should map to subject signals");
  const interests = signals.filter((s) => s.dimension === "INTEREST");
  assert.ok(interests.some((s) => s.value.startsWith("stream_")));
  assert.ok(primaryInterests.length >= 1);
  for (const s of signals) {
    assert.equal(s.sourceAssessment, "stream");
    assert.equal(s.sourceAssignmentId, "test-assignment-1");
    assert.ok(s.score >= 0 && s.score <= 100);
  }
});

test("ideal report normalizes into aptitude/interest signals", () => {
  const report = buildReport("ideal", answerAll("ideal"));
  const { signals } = normalizeAssessmentReport("ideal", report, source);
  assert.ok(signals.length >= 7, "one signal per ideal domain");
  assert.ok(signals.some((s) => s.value === "logical_reasoning"));
  assert.ok(signals.some((s) => s.value === "pattern_recognition"));
  for (const s of signals) assert.equal(s.sourceAssessment, "ideal");
});

test("personality report normalizes into 8 poles + trait aliases", () => {
  const report = buildReport("personality", answerAll("personality"));
  const { signals } = normalizeAssessmentReport("personality", report, source);
  const poles = signals.filter((s) =>
    ["extraversion", "introversion", "sensing", "intuition", "thinking", "feeling", "judging", "perceiving"].includes(s.value)
  );
  assert.equal(poles.length, 8);
  assert.ok(signals.some((s) => s.value === "analytical"));
  const typeSignal = report.type;
  assert.match(typeSignal, /^[EI][SN][TF][JP]$/);
});

test("intelligences report normalizes into 9 aptitudes + EI", () => {
  const report = buildReport("intelligences", answerAll("intelligences"));
  const { signals } = normalizeAssessmentReport("intelligences", report, source);
  const aptitudes = signals.filter((s) => s.dimension === "APTITUDE");
  assert.equal(aptitudes.length, 10); // 9 intelligences + EI
  assert.ok(signals.some((s) => s.value === "emotional_intelligence"));
});

test("learning report normalizes into skills + work-environment preferences", () => {
  const report = buildReport("learning", answerAll("learning"));
  const { signals } = normalizeAssessmentReport("learning", report, source);
  const skills = signals.filter((s) => s.dimension === "SKILL");
  const env = signals.filter((s) => s.dimension === "WORK_ENVIRONMENT");
  assert.ok(skills.length >= 4, "4 learning modalities");
  assert.ok(env.length >= 10, "environment + mindset preferences");
});

test("unknown assessment kind normalizes to empty signals", () => {
  const { signals } = normalizeAssessmentReport("unknown", { kind: "stream", rows: [] }, source);
  assert.deepEqual(signals, []);
});

test("canonical signal registry is well-formed", () => {
  for (const [value, meta] of Object.entries(CANONICAL_SIGNALS)) {
    assert.match(value, /^[a-z_]+$/, `signal ${value} must be snake_case`);
    assert.ok(meta.dimension, `signal ${value} needs a dimension`);
    assert.ok(meta.description.length > 5, `signal ${value} needs a description`);
  }
  assert.ok(Object.keys(CANONICAL_SIGNALS).length >= 50, "vocabulary too small");
});

test("CareerTrait values map onto the canonical vocabulary", () => {
  // these strings exist in the Phase 2 career enrichment data
  const careerTraitValues = [
    "Analytical",
    "Empathetic",
    "Organised",
    "Detail-oriented",
    "Persistent",
    "Creative",
    "Practical",
    "Hands-on",
  ];
  for (const v of careerTraitValues) {
    const canonical = canonicalizeCareerTraitValue(v);
    assert.ok(canonical, `CareerTrait value "${v}" has no canonical alias`);
    assert.ok(CANONICAL_SIGNALS[canonical], `canonical value ${canonical} not in registry`);
  }
});
