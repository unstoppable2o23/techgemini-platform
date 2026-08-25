import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeStreamResult,
  normalizePersonalityResult,
  normalizeIntelligencesResult,
  normalizeLearningResult,
  normalizeIdealResult,
  buildStudentCareerProfile,
} from "../src/lib/career-intelligence.ts";

const streamReport = {
  kind: "stream",
  rows: [
    { key: "1", label: "Humanities", score: 30, max: 57 },
    { key: "2", label: "Science", score: 45, max: 57 },
    { key: "3", label: "Commerce", score: 12, max: 57 },
    { key: "4", label: "Arts", score: 57, max: 57 },
  ],
  recommendedStream: "Arts",
};

const personalityReport = {
  kind: "personality",
  type: "INTJ",
  rows: [
    { key: "1", first: { label: "Extraversion", count: 3 }, second: { label: "Introversion", count: 6 } },
    { key: "2", first: { label: "Sensing", count: 9 }, second: { label: "Intuition", count: 0 } },
    { key: "3", first: { label: "Thinking", count: 5 }, second: { label: "Feeling", count: 4 } },
    { key: "4", first: { label: "Judging", count: 2 }, second: { label: "Perceiving", count: 7 } },
  ],
};

const intelligencesReport = {
  kind: "intelligences",
  rows: [
    { key: "1", label: "Bodily-Kinesthetic", score: 42, max: 42 },
    { key: "2", label: "Visual-Spatial", score: 21, max: 42 },
    { key: "3", label: "Musical", score: 30, max: 42 },
  ],
  emotionalIntelligence: 21,
};

const learningReport = {
  kind: "learning",
  groups: [
    {
      name: "Sensory Preferences",
      rows: [
        { abbrev: "VIS", label: "Visual", score: 75 },
        { abbrev: "AUD", label: "Auditory", score: 40 },
      ],
    },
  ],
};

const idealReport = {
  kind: "ideal",
  domains: [
    { key: "166", label: "Self Identification", score: 20, max: 40 },
  ],
  strengths: [{ label: "Trait 274", pct: 80 }],
};

test("normalizeStreamResult produces 0-100 interest dimensions", () => {
  const out = normalizeStreamResult(streamReport);
  assert.equal(out["interest.humanities"], 53);
  assert.equal(out["interest.arts"], 100);
  assert.equal(out["interest.commerce"], 21);
  for (const v of Object.values(out)) assert.ok(v >= 0 && v <= 100);
});

test("normalizePersonalityResult splits poles to complementary percentages", () => {
  const out = normalizePersonalityResult(personalityReport);
  assert.equal(out["personality.extraversion"], 33);
  assert.equal(out["personality.introversion"], 67);
  assert.equal(out["personality.sensing"], 100);
  assert.equal(out["personality.intuition"], 0);
  assert.equal(out["personality.thinking"] + out["personality.feeling"], 100);
});

test("normalizeIntelligencesResult scales to 0-100 including EI", () => {
  const out = normalizeIntelligencesResult(intelligencesReport);
  assert.equal(out["intelligence.bodily-kinesthetic"], 100);
  assert.equal(out["intelligence.visual-spatial"], 50);
  assert.equal(out["intelligence.musical"], 71);
  assert.equal(out["intelligence.emotional"], 50);
});

test("normalizeLearningResult clamps to 0-100", () => {
  const out = normalizeLearningResult(learningReport);
  assert.equal(out["learning.vis"], 75);
  assert.equal(out["learning.aud"], 40);
});

test("normalizeIdealResult maps domains and strengths", () => {
  const out = normalizeIdealResult(idealReport);
  assert.equal(out["aptitude.self identification"], 50);
  assert.equal(out["aptitude.trait.trait 274"], 80);
});

test("buildStudentCareerProfile aggregates all available kinds", () => {
  const profile = buildStudentCareerProfile({
    stream: streamReport,
    personality: personalityReport,
    intelligences: intelligencesReport,
    learning: learningReport,
    ideal: idealReport,
  });
  assert.deepEqual(profile.available.sort(), [
    "ideal",
    "intelligences",
    "learning",
    "personality",
    "stream",
  ]);
  assert.equal(profile.personalityType, "INTJ");
  assert.equal(profile.recommendedStream, "Arts");
  assert.equal(profile.emotionalIntelligence, 21);
  assert.ok(Object.keys(profile.dimensions).length >= 20);
});

test("buildStudentCareerProfile handles empty results", () => {
  const profile = buildStudentCareerProfile({});
  assert.deepEqual(profile.available, []);
  assert.deepEqual(profile.dimensions, {});
  assert.equal(profile.personalityType, null);
  assert.equal(profile.recommendedStream, null);
  assert.equal(profile.emotionalIntelligence, null);
});
