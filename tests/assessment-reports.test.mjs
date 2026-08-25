import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport, questionsFor } from "../src/lib/tests.ts";

// Build a valid full answer map for a bank (first option of every question)
function answerAll(kind) {
  const bank = questionsFor(kind);
  const answers = {};
  for (const q of Object.values(bank)) {
    const opts = Object.values(q.options).sort((a, b) => Number(a.id) - Number(b.id));
    answers[String(q.id)] = String(opts[0].id);
  }
  return answers;
}

test("buildReport produces a stream report", () => {
  const report = buildReport("stream", answerAll("stream"));
  assert.equal(report.kind, "stream");
  assert.equal(report.rows.length, 4);
  assert.ok(report.recommendedStream);
  for (const row of report.rows) assert.ok(row.max > 0);
});

test("buildReport produces an ideal report", () => {
  const report = buildReport("ideal", answerAll("ideal"));
  assert.equal(report.kind, "ideal");
  assert.ok(report.domains.length >= 7);
  assert.ok(report.strengths.length >= 1);
});

test("buildReport produces a personality report with a 4-letter type", () => {
  const report = buildReport("personality", answerAll("personality"));
  assert.equal(report.kind, "personality");
  assert.match(report.type, /^[EI][SN][TF][JP]$/);
  assert.equal(report.rows.length, 4);
});

test("buildReport produces an intelligences report", () => {
  const report = buildReport("intelligences", answerAll("intelligences"));
  assert.equal(report.kind, "intelligences");
  assert.equal(report.rows.length, 9);
  assert.equal(typeof report.emotionalIntelligence, "number");
});

test("buildReport produces a learning report", () => {
  const report = buildReport("learning", answerAll("learning"));
  assert.equal(report.kind, "learning");
  assert.equal(report.groups.length, 3);
  const totalDims = report.groups.reduce((n, g) => n + g.rows.length, 0);
  assert.equal(totalDims, 16);
});
