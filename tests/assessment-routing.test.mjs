import { test } from "node:test";
import assert from "node:assert/strict";
import { questionsFor } from "../src/lib/tests.ts";

const EXPECTED = {
  stream: { min: 70, sampleDomain: 173 },
  ideal: { min: 170, sampleDomain: 166 },
  personality: { min: 30, sampleDomain: 1 },
  intelligences: { min: 50, sampleDomain: 1 },
  learning: { min: 60, sampleDomain: 1 },
};

for (const [kind, spec] of Object.entries(EXPECTED)) {
  test(`questionsFor("${kind}") routes to the ${kind} question bank`, () => {
    const bank = questionsFor(kind);
    const ids = Object.keys(bank);
    assert.ok(
      ids.length >= spec.min,
      `${kind} bank has ${ids.length} questions, expected >= ${spec.min}`
    );
    const first = bank[ids[0]];
    assert.ok(first.question || first.options, `${kind} bank has content`);
    for (const q of Object.values(bank)) {
      assert.ok(q.options && Object.keys(q.options).length >= 2, `${kind}: question without options`);
    }
  });
}

test("learning assessment does NOT fall through to the intelligences bank", () => {
  const learning = questionsFor("learning");
  const intelligences = questionsFor("intelligences");
  const learnIds = Object.keys(learning).sort();
  const intIds = Object.keys(intelligences).sort();
  assert.notDeepEqual(learnIds, intIds, "learning and intelligences banks must differ");
  assert.ok(learnIds.length >= 60, "learning bank should have ~69 questions");
});

test("all five banks are distinct from each other", () => {
  const kinds = ["stream", "ideal", "personality", "intelligences", "learning"];
  const idSets = kinds.map((k) => Object.keys(questionsFor(k)).sort().join(","));
  assert.equal(new Set(idSets).size, 5, "two banks share the same question id set");
});
