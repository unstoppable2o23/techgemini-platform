import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSubmission, isFullyAnswered } from "../src/lib/career-profile/validate-submission.ts";
import bankData from "../src/data/stream-selector.json" with { type: "json" };

const bank = bankData;
const ids = Object.keys(bank).sort((a, b) => Number(a) - Number(b));
const q1 = ids[0];
const q1opts = Object.values(bank[q1].options).map((o) => String(o.id));

function fullAnswers() {
  const answers = {};
  for (const id of ids) {
    const opts = Object.values(bank[id].options).sort((a, b) => Number(a.id) - Number(b.id));
    answers[id] = String(opts[0].id);
  }
  return answers;
}

test("valid full submission passes", () => {
  const result = validateSubmission(bank, fullAnswers());
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(Object.keys(result.answers).length, 76);
});

test("rejects non-object answers", () => {
  assert.equal(validateSubmission(bank, null).ok, false);
  assert.equal(validateSubmission(bank, "string").ok, false);
  assert.equal(validateSubmission(bank, [1, 2]).ok, false);
  assert.equal(validateSubmission(bank, {}).ok, false);
});

test("rejects unknown question id", () => {
  const answers = fullAnswers();
  answers["999999"] = q1opts[0];
  const result = validateSubmission(bank, answers);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /Unknown question/);
});

test("rejects option that does not belong to the question", () => {
  const otherQ = ids[5];
  const otherOpt = Object.values(bank[otherQ].options)[0].id;
  const answers = fullAnswers();
  answers[q1] = String(otherOpt);
  const result = validateSubmission(bank, answers);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /does not belong/);
});

test("rejects invalid or empty question bank", () => {
  assert.equal(validateSubmission({}, fullAnswers()).ok, false);
});

test("rejects empty-string option values", () => {
  const answers = fullAnswers();
  answers[q1] = "";
  const result = validateSubmission(bank, answers);
  assert.equal(result.ok, false);
});

test("isFullyAnswered detects partial submissions", () => {
  const partial = fullAnswers();
  delete partial[ids[10]];
  assert.equal(isFullyAnswered(bank, partial), false);
  assert.equal(isFullyAnswered(bank, fullAnswers()), true);
});
