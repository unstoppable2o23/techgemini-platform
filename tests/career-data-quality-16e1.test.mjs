import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { scoreCareer } from "../src/lib/career-matching/score.ts";
import { resolvePreferredCareer, PREFERRED_CAREER_ALIASES } from "../src/lib/career-matching/preferred-career.ts";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Phase 16E.1 — Career Expansion Audit & Reconciliation V1
//
// Data-quality regression tests for the 289-career catalogue. Covers:
//   1. Unique names / slugs
//   2. Required metadata presence
//   3. Valid category / family values
//   4. Canonical APTITUDE / WORK_ENVIRONMENT vocabulary
//   5. No duplicate CareerTrait rows
//   6. Valid education taxonomy (no legacy malformed patterns)
//   7. Alias uniqueness and ambiguity
//   8. Preferred resolution correctness
//   9. No substring-alias false-positives
//  10. No "art" false-positive in subject matching
//  11. School-stage neutrality (LOW_INFO profiles)
//  12. Deterministic ranking
//  13. shortDescription presence
// ---------------------------------------------------------------------------

const CANONICAL_APTITUDE = new Set([
  "logical_reasoning", "logical_mathematical", "pattern_recognition",
  "attention_to_detail", "visual_spatial", "linguistic", "interpersonal",
  "intrapersonal", "naturalist", "emotional_intelligence", "bodily_kinesthetic",
]);

const CANONICAL_WORKENV = new Set([
  "collaborative_preference", "independent_preference", "prefers_structure",
  "prefers_autonomy", "prefers_quiet", "prefers_formal_setting", "self_driven",
]);

const VALID_CATEGORIES = new Set([
  "Agriculture", "Architecture & Planning", "Business & Management",
  "Data & AI", "Design & Creative", "Education", "Engineering",
  "Environment & Sustainability", "Finance & Accounting",
  "Government & Public Services", "Healthcare & Medicine",
  "Hospitality & Tourism", "Humanities", "Law", "Life Sciences",
  "Logistics & Supply Chain", "Manufacturing", "Marketing & Advertising",
  "Media & Communication", "Psychology & Social Sciences", "Sales",
  "Sports & Fitness", "Technology & Software",
]);

const LEGACY_MALFORMED_PATTERNS = [
  /ANY\s+degree/i,
  /BCA\/MCA/i,
  /B\.Tech\/B\.E\./i,
];

const EXCLUDED_ALIASES = new Set(["doctor", "architect", "accountant", "management consultant"]);

// ========== 1. Unique names / slugs ==========

test("1: all career names are unique (case-insensitive)", async () => {
  const careers = await prisma.career.findMany({ select: { name: true } });
  const seen = new Map();
  for (const c of careers) {
    const key = c.name.toLowerCase().trim();
    assert.ok(!seen.has(key), `duplicate career name "${c.name}" (also "${seen.get(key)}")`);
    seen.set(key, c.name);
  }
});

test("2: all career slugs are unique", async () => {
  const careers = await prisma.career.findMany({ select: { slug: true, name: true } });
  const seen = new Map();
  for (const c of careers) {
    assert.ok(!seen.has(c.slug), `duplicate slug "${c.slug}" (careers: "${seen.get(c.slug)}" and "${c.name}")`);
    seen.set(c.slug, c.name);
  }
});

// ========== 2. Required metadata ==========

test("3: every active career has required metadata fields", async () => {
  const careers = await prisma.career.findMany({ where: { isActive: true } });
  for (const c of careers) {
    assert.ok(c.name && c.name.trim(), `${c.id} missing name`);
    assert.ok(c.slug && c.slug.trim(), `${c.name} missing slug`);
    assert.ok(c.title && c.title.trim(), `${c.name} missing title`);
    assert.ok(c.category && c.category.trim(), `${c.name} missing category`);
    assert.ok(c.introduction && c.introduction.trim(), `${c.name} missing introduction`);
    assert.ok(c.shortDescription && c.shortDescription.trim(), `${c.name} missing shortDescription`);
    assert.ok(c.demandLevel && c.demandLevel.trim(), `${c.name} missing demandLevel`);
    assert.ok(c.salaryEntry && c.salaryEntry.trim(), `${c.name} missing salaryEntry`);
    assert.ok(c.salarySenior && c.salarySenior.trim(), `${c.name} missing salarySenior`);
    // jobGrowth is intentionally not a hard gate: 40 emerging careers lack it
    // (documented in phase16e1-career-quality.md as a known residual).
  }
});

// ========== 3. Valid categories ==========

test("4: every active career has a valid category", async () => {
  const careers = await prisma.career.findMany({ where: { isActive: true }, select: { name: true, category: true } });
  for (const c of careers) {
    assert.ok(VALID_CATEGORIES.has(c.category), `career "${c.name}" has unknown category "${c.category}"`);
  }
});

// ========== 4. Canonical APTITUDE / WORK_ENVIRONMENT vocabulary ==========

test("5: all APTITUDE trait values are canonical", async () => {
  const traits = await prisma.careerTrait.findMany({
    where: { dimension: "APTITUDE" },
    select: { value: true, career: { select: { name: true } } },
  });
  const bad = traits.filter((t) => !CANONICAL_APTITUDE.has(t.value));
  assert.equal(bad.length, 0,
    `non-canonical APTITUDE values: ${bad.map((t) => `${t.career.name}:"${t.value}"`).join(", ")}`);
});

test("6: all WORK_ENVIRONMENT trait values are canonical", async () => {
  const traits = await prisma.careerTrait.findMany({
    where: { dimension: "WORK_ENVIRONMENT" },
    select: { value: true, career: { select: { name: true } } },
  });
  const bad = traits.filter((t) => !CANONICAL_WORKENV.has(t.value));
  assert.equal(bad.length, 0,
    `non-canonical WORK_ENVIRONMENT values: ${bad.map((t) => `${t.career.name}:"${t.value}"`).join(", ")}`);
});

// ========== 5. No duplicate CareerTrait rows ==========

test("7: no duplicate CareerTrait rows (careerId + dimension + value)", async () => {
  const traits = await prisma.careerTrait.findMany({
    select: { careerId: true, dimension: true, value: true, career: { select: { name: true } } },
  });
  const seen = new Set();
  const dupes = [];
  for (const t of traits) {
    const key = `${t.careerId}:${t.dimension}:${t.value.toLowerCase()}`;
    if (seen.has(key)) {
      dupes.push(`${t.career.name} ${t.dimension} "${t.value}"`);
    }
    seen.add(key);
  }
  assert.equal(dupes.length, 0, `duplicate CareerTrait rows: ${dupes.join("; ")}`);
});

// ========== 6. Valid education taxonomy ==========

test("8: no legacy malformed recommendedDegrees tokens", async () => {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    select: { name: true, recommendedDegrees: true },
  });
  const violations = [];
  for (const c of careers) {
    for (const deg of c.recommendedDegrees) {
      for (const pat of LEGACY_MALFORMED_PATTERNS) {
        if (pat.test(deg)) {
          violations.push(`${c.name}: "${deg}" matches ${pat}`);
        }
      }
    }
  }
  assert.equal(violations.length, 0, `malformed degree tokens: ${violations.join("; ")}`);
});

// ========== 7. Alias uniqueness and ambiguity ==========

test("9: every alias resolves to exactly one career (excluded aliases stay excluded)", async () => {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  for (const [alias, targetName] of Object.entries(PREFERRED_CAREER_ALIASES)) {
    if (EXCLUDED_ALIASES.has(alias)) continue;
    const matches = careers.filter((c) => {
      const norm = (s) => s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");
      return norm(c.name) === norm(targetName);
    });
    assert.ok(matches.length >= 1, `alias "${alias}" -> "${targetName}" resolves to no active career`);
    assert.equal(matches.length, 1, `alias "${alias}" -> "${targetName}" resolves to ${matches.length} careers (must be 1)`);
  }
});

test("10: excluded aliases do not resolve (Doctor, Architect, Accountant, Management Consultant)", async () => {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  for (const alias of EXCLUDED_ALIASES) {
    const r = resolvePreferredCareer(null, alias, careers);
    assert.equal(r.resolved, false, `excluded alias "${alias}" should NOT resolve`);
  }
});

// ========== 8. Preferred resolution correctness ==========

test("11: preferred career exact name match resolves correctly", async () => {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  const sample = careers.slice(0, 20);
  for (const c of sample) {
    const r = resolvePreferredCareer(null, c.name, careers);
    assert.equal(r.resolved, true, `exact name "${c.name}" should resolve`);
    assert.equal(r.source, "name_exact", `exact name "${c.name}" should use name_exact source`);
    assert.equal(r.careerId, c.id);
  }
});

// ========== 9. No substring-alias false-positives ==========

test("12: 'art' as alias input does not false-match Fine Arts or Art", async () => {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  const r = resolvePreferredCareer(null, "art", careers);
  assert.equal(r.resolved, false, `"art" should NOT resolve to any career (too ambiguous)`);
});

// ========== 10. School-stage neutrality ==========

test("13: Class 8 student profile produces MODERATE or LOW confidence (not STRONG)", async () => {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    include: { traits: true, careerEducationPathways: true },
  });
  const signals = [
    { dimension: "INTEREST", value: "problem_solving", score: 60, confidence: 0.6, sourceType: "STUDENT_PROFILE", sourceAssessment: "profile" },
    { dimension: "APTITUDE", value: "logical_reasoning", score: 60, confidence: 0.6, sourceType: "ASSESSMENT", sourceAssessment: "ideal_career" },
  ];
  const results = careers.map((c) => scoreCareer(c, signals, null));
  const strong = results.filter((r) => r.matchScore >= 60);
  assert.equal(strong.length, 0, `Class 8 profile should not produce STRONG matches; found ${strong.length}`);
});

// ========== 11. Deterministic ranking ==========

test("14: scoring is deterministic (same inputs -> same outputs across runs)", async () => {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    include: { traits: true, careerEducationPathways: true },
  });
  const signals = [
    { dimension: "INTEREST", value: "technology", score: 80, confidence: 0.8, sourceType: "ASSESSMENT", sourceAssessment: "stream_selector" },
    { dimension: "SUBJECT", value: "Mathematics", score: 90, confidence: 0.9, sourceType: "ACADEMIC", sourceAssessment: "stream_selector" },
    { dimension: "APTITUDE", value: "logical_reasoning", score: 85, confidence: 0.85, sourceType: "ASSESSMENT", sourceAssessment: "ideal_career" },
  ];
  const run1 = careers.map((c) => ({ name: c.name, score: scoreCareer(c, signals, null).matchScore }));
  const run2 = careers.map((c) => ({ name: c.name, score: scoreCareer(c, signals, null).matchScore }));
  const mismatches = run1.filter((r, i) => r.score !== run2[i].score);
  assert.equal(mismatches.length, 0,
    `non-deterministic results: ${mismatches.slice(0, 5).map((m) => m.name).join(", ")}`);
});

// ========== 12. Every career has trait coverage across dimensions ==========

test("15: every active career has at least 5 trait rows", async () => {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    include: { traits: true },
  });
  const thin = careers.filter((c) => c.traits.length < 5);
  assert.equal(thin.length, 0,
    `careers with <5 traits: ${thin.slice(0, 10).map((c) => `${c.name}(${c.traits.length})`).join(", ")}`);
});

// ========== 13. salaryCurrency is INR for all careers ==========

test("16: all careers have salaryCurrency INR", async () => {
  const bad = await prisma.career.findMany({
    where: { isActive: true, NOT: { salaryCurrency: "INR" } },
    select: { name: true, salaryCurrency: true },
  });
  assert.equal(bad.length, 0,
    `non-INR careers: ${bad.map((c) => `${c.name}(${c.salaryCurrency})`).join(", ")}`);
});

await prisma.$disconnect();
