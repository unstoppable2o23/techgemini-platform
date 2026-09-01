import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { scoreInstitution } from "../src/lib/university-matching/score.ts";
import { buildExplanation } from "../src/lib/university-matching/explanation.ts";
import { normalizeWeights } from "../src/lib/university-matching/config.ts";
import { getCandidateSet } from "../src/lib/university-matching/candidate.ts";
import { getUniversityMatchesForStudent } from "../src/lib/university-matching/engine.ts";

const prisma = new PrismaClient();

function makeCandidate(overrides = {}) {
  return {
    id: "inst-1",
    name: "Institution A",
    dataset: "indian",
    type: null,
    state: null,
    district: null,
    website: null,
    institutionType: null,
    universityName: null,
    country: null,
    qsRank: null,
    mappingBasis: "institutionType-category",
    ...overrides,
  };
}

const W = normalizeWeights();

// 1. India-only student
test("India-only student: Indian curated institution gets full country score", () => {
  const c = makeCandidate({ mappingBasis: "curated", dataset: "indian" });
  const s = { targetCountry: "India" };
  const r = scoreInstitution(c, s, {}, null, W);
  const country = r.dimensions.find((d) => d.key === "country");
  assert.equal(country.score, 100);
  assert.ok(r.matchScore > 0);
});

// 2. Global-target student
test("Global-target student: global curated institution in target country scores 100", () => {
  const c = makeCandidate({ mappingBasis: "curated", dataset: "global", country: "United States", qsRank: 50 });
  const s = { targetCountry: "United States" };
  const r = scoreInstitution(c, s, {}, null, W);
  const country = r.dimensions.find((d) => d.key === "country");
  assert.equal(country.score, 100);
  assert.equal(r.dimensions.find((d) => d.key === "institutionQuality").available, true);
});

// 3. No target country
test("No target country: global institution is NOT penalized", () => {
  const c = makeCandidate({ mappingBasis: "curated", dataset: "global", country: "United Kingdom", qsRank: 200 });
  const s = {};
  const r = scoreInstitution(c, s, {}, null, W);
  const country = r.dimensions.find((d) => d.key === "country");
  assert.equal(country.score, 70);
});

// 4. Preferred state
test("Preferred state match yields location 100", () => {
  const c = makeCandidate({ mappingBasis: "curated", dataset: "indian", state: "Karnataka" });
  const s = { state: "Karnataka" };
  const r = scoreInstitution(c, s, {}, null, W);
  assert.equal(r.dimensions.find((d) => d.key === "location").score, 100);
});

// 5. No location preference
test("No location preference: neutral location score, no penalty", () => {
  const c = makeCandidate({ mappingBasis: "curated", dataset: "indian", state: "Kerala" });
  const s = {};
  const r = scoreInstitution(c, s, {}, null, W);
  assert.equal(r.dimensions.find((d) => d.key === "location").score, 70);
});

// 6 & 7. Budget present without fee data
test("Budget present but no fee data: affordability not fabricated (neutral, unavailable)", () => {
  const c = makeCandidate({ mappingBasis: "curated" });
  const s = { tuitionBudget: "500000 INR" };
  const r = scoreInstitution(c, s, {}, null, W);
  const b = r.dimensions.find((d) => d.key === "budget");
  assert.equal(b.score, 50);
  assert.equal(b.available, false);
});

// 8. No psychometric tests
test("Zero-assessment student still receives a match score", () => {
  const c = makeCandidate({ mappingBasis: "curated" });
  const s = {}; // no exams, no grades
  const r = scoreInstitution(c, s, {}, null, W);
  assert.ok(r.matchScore >= 0 && r.matchScore <= 100);
});

// 9 & 10. Full / partial profile
test("Full profile vs partial profile produce deterministic valid scores", () => {
  const c = makeCandidate({ mappingBasis: "curated", dataset: "indian", state: "Karnataka" });
  const full = { averageGrade: "85%", gradeLevel: "12", state: "Karnataka", targetCountry: "India", tuitionBudget: "x", targetColleges: ["inst-1"], exams: ["JEE"] };
  const partial = { state: "Karnataka" };
  const rf = scoreInstitution(c, full, {}, null, W);
  const rp = scoreInstitution(c, partial, {}, null, W);
  assert.ok(rf.matchScore >= 0 && rf.matchScore <= 100);
  assert.ok(rp.matchScore >= 0 && rp.matchScore <= 100);
  assert.ok(rf.confidence > rp.confidence, "more profile data should raise confidence");
});

// 11. Curated mapping
test("Curated mapping: education score 85 and high confidence", () => {
  const c = makeCandidate({ mappingBasis: "curated" });
  const r = scoreInstitution(c, {}, {}, null, W);
  assert.equal(r.dimensions.find((d) => d.key === "educationPathway").score, 85);
  assert.ok(r.confidence >= 75);
});

// 12. Category-derived mapping
test("Category-derived mapping: weaker evidence than curated", () => {
  const curated = scoreInstitution(makeCandidate({ mappingBasis: "curated" }), {}, {}, null, W);
  const cat = scoreInstitution(makeCandidate({ mappingBasis: "institutionType-category" }), {}, {}, null, W);
  assert.ok(cat.matchScore < curated.matchScore);
  assert.ok(cat.confidence < curated.confidence);
  assert.equal(cat.mappingStatus, "institutionType-category");
});

// 13. No mapping
test("No mapping: education score 0 and low confidence", () => {
  const c = makeCandidate({ mappingBasis: "none" });
  const r = scoreInstitution(c, {}, {}, null, W);
  assert.equal(r.dimensions.find((d) => d.key === "educationPathway").score, 0);
  assert.ok(r.confidence <= 30);
});

// 14. Target college preference
test("Target college preference boosts student-preferences dimension", () => {
  const c = makeCandidate({ mappingBasis: "institutionType-category", id: "college-x" });
  const s = { targetColleges: ["college-x"] };
  const r = scoreInstitution(c, s, {}, null, W);
  assert.equal(r.dimensions.find((d) => d.key === "studentPreferences").score, 100);
});

// 15 & 16. Missing academic / eligibility
test("Missing academic info: no fabricated eligibility, limitation noted", () => {
  const c = makeCandidate({ mappingBasis: "curated" });
  const r = buildExplanation(scoreInstitution(c, {}, {}, null, W));
  assert.ok(r.limitations.some((l) => /eligibility/i.test(l)));
  assert.ok(!r.reasons.some((x) => /admission probability|cutoff/i.test(x)));
});

// 17. Deterministic ranking (equal inputs -> stable order)
test("Ranking is deterministic across repeated sorts", () => {
  const base = makeCandidate({ mappingBasis: "curated", dataset: "indian", state: "Karnataka" });
  const list = [
    { ...base, id: "b", name: "Beta" },
    { ...base, id: "a", name: "Alpha" },
    { ...base, id: "c", name: "Gamma" },
  ].map((c) => scoreInstitution(c, { state: "Karnataka" }, {}, null, W));
  const sortOnce = [...list].sort((x, y) => y.matchScore - x.matchScore || y.confidence - x.confidence || x.institution.name.localeCompare(y.institution.name));
  const sortTwice = [...list].sort((x, y) => y.matchScore - x.matchScore || y.confidence - x.confidence || x.institution.name.localeCompare(y.institution.name));
  assert.deepEqual(sortOnce.map((r) => r.institution.name), sortTwice.map((r) => r.institution.name));
});

// 18. Equal scores -> alphabetical tiebreak
test("Equal scores are broken alphabetically (deterministic)", () => {
  const base = makeCandidate({ mappingBasis: "curated" });
  const a = scoreInstitution({ ...base, id: "1", name: "Zebra" }, {}, {}, null, W);
  const b = scoreInstitution({ ...base, id: "2", name: "Alpha" }, {}, {}, null, W);
  assert.equal(a.matchScore, b.matchScore);
  const sorted = [a, b].sort((x, y) => y.matchScore - x.matchScore || y.confidence - x.confidence || x.institution.name.localeCompare(y.institution.name));
  assert.equal(sorted[0].institution.name, "Alpha");
});

// 19. No candidates (engine, no context)
test("Engine with no pathway context returns empty matches gracefully", async () => {
  const res = await getUniversityMatchesForStudent("nonexistent-student-000", {});
  assert.equal(res.matches.length, 0);
  assert.equal(res.totalCandidates, 0);
});

// 20. Unauthorized / safe handling: engine with missing student profile returns empty (not throw)
test("Engine handles missing student profile without throwing", async () => {
  const res = await getUniversityMatchesForStudent("000000000000000000000000", { careerId: "does-not-matter" });
  assert.equal(res.matches.length, 0);
});

// Integration: curated mapping candidate retrieval reuses Phase 6 layer
test("Curated education-institution mapping is surfaced by the candidate layer", async () => {
  const degree = await prisma.degree.findFirst({});
  const institution = await prisma.indianInstitution.findFirst({});
  assert.ok(degree && institution, "need degree + institution for integration test");

  const created = await prisma.educationInstitutionMapping.create({
    data: { degreeId: degree.id, indianInstitutionId: institution.id, mappingType: "CURATED", source: "test", confidence: 1 },
  });
  try {
    const set = await getCandidateSet({ degreeId: degree.id });
    assert.equal(set.mappingBasis, "curated");
    assert.ok(set.candidates.some((c) => c.id === institution.id && c.mappingBasis === "curated"));
  } finally {
    await prisma.educationInstitutionMapping.delete({ where: { id: created.id } });
  }
});

// Integration: category-derived candidate retrieval works
test("Category-derived candidate retrieval returns Indian institutions", async () => {
  const degree = await prisma.degree.findFirst({ where: { name: { contains: "Tech", mode: "insensitive" } } });
  assert.ok(degree, "need a Tech degree");
  const set = await getCandidateSet({ degreeId: degree.id });
  assert.equal(set.mappingBasis, "institutionType-category");
  assert.ok(set.candidates.length > 0);
});

// Integration: full engine flow with a real career context (no student profile -> empty)
test("Engine end-to-end with career context but no student profile is safe", async () => {
  const career = await prisma.career.findFirst({
    where: { careerEducationPathways: { some: { type: "DEGREE_PATHWAY", degreeId: { not: null } } } },
  });
  assert.ok(career, "need a career with education pathways");
  const res = await getUniversityMatchesForStudent("000000000000000000000000", { careerId: career.id });
  // totalCandidates may be > 0 (category discovery); matches empty because no student.
  assert.ok(typeof res.totalCandidates === "number");
  assert.equal(res.matches.length, 0);
});

await prisma.$disconnect();
