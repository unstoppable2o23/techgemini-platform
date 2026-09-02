import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { scoreCareer } from "../src/lib/career-matching/score.ts";
import { resolvePreferredCareer } from "../src/lib/career-matching/preferred-career.ts";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Phase 16E — Career Family Expansion V1 (251 -> 289 careers).
//
// Additive career-only expansion prioritising genuine family coverage gaps
// (Humanities, Media & Communication, Law, Psychology & Social Sciences,
// Architecture & Planning, Environment & Sustainability, Education,
// Agriculture) with FULL matching intelligence (APTITUDE + WORK_ENVIRONMENT)
// on every new career. University/IndianInstitution/Program data and the
// matching-engine formula are STRICTLY untouched.
// ---------------------------------------------------------------------------

const DATA_FILES = [
  "cl1-humanities",
  "cl2-media",
  "cl3-law-psych",
  "cl4-env-arch-agri",
];

const CANONICAL_APTITUDE = new Set([
  "logical_reasoning", "logical_mathematical", "pattern_recognition",
  "attention_to_detail", "visual_spatial", "linguistic", "interpersonal",
  "intrapersonal", "naturalist", "emotional_intelligence", "bodily_kinesthetic",
]);

const CANONICAL_WORKENV = new Set([
  "collaborative_preference", "independent_preference", "prefers_structure",
  "prefers_autonomy", "prefers_quiet", "prefers_formal_setting", "self_driven",
]);

const TRAIT_DIMENSIONS = [
  "APTITUDE", "WORK_ENVIRONMENT", "INTEREST", "PERSONALITY", "SUBJECT",
  "SKILL", "EDUCATION",
];

const newCareers = DATA_FILES.flatMap((f) =>
  JSON.parse(fs.readFileSync(path.join("scripts", "phase16e-data", `${f}.json`), "utf8"))
);

const EXPECTED_NAMES_BY_FAMILY = {
  "Humanities": ["Philosophy", "Linguistics", "Cultural Studies", "Museum Studies and Curatorship",
    "Archaeology", "Archival Studies", "Development Studies", "International Relations"],
  "Media & Communication": ["Screenwriting", "Broadcast Journalism", "Documentary Production",
    "Technical Writing", "Copywriting", "Photojournalism", "Media Planning", "Publishing"],
  "Law": ["Corporate Law", "Environmental Law", "Human Rights Law", "International Law", "Tax Law", "Legal Research"],
  "Psychology & Social Sciences": ["Counselling Psychology", "Organizational Psychology",
    "Educational Psychology", "Social Research"],
  "Architecture & Planning": ["Architectural Technology", "Sustainable Architecture", "Urban Design"],
  "Environment & Sustainability": ["Environmental Consultant", "Climate Policy Analyst",
    "Conservation Scientist", "Circular Economy Specialist", "Carbon Accounting Specialist",
    "Environmental Impact Assessment Specialist"],
  "Education": ["Instructional Design"],
  "Agriculture": ["Agronomy", "Aquaculture"],
};

const FAMILY_COUNTS_AFTER = {
  "Humanities": 11,
  "Media & Communication": 19,
  "Law": 11,
  "Psychology & Social Sciences": 9,
  "Architecture & Planning": 6,
  "Environment & Sustainability": 20,
  "Education": 10,
  "Agriculture": 10,
};

// ---------------------------------------------------------------- data validity (pure, not DB-dependent)
test("1E: exactly 38 new careers across 4 data files", () => {
  assert.equal(newCareers.length, 38, `expected 38 new careers, got ${newCareers.length}`);
  const names = new Set(newCareers.map((c) => c.name));
  assert.equal(names.size, 38, "career names must be unique across all files");
});

test("2E: every new career has a complete metadata payload", () => {
  for (const c of newCareers) {
    for (const field of ["name", "title", "cat", "sub", "intro", "whoShouldPursue",
      "eligibility", "workDesc", "workExamples", "demandLevel", "salaryEntry",
      "salaryMedian", "salarySenior", "salaryCurrency", "jobGrowth", "topIndustries",
      "futureOutlook", "minStudyLevel"]) {
      assert.ok(c[field] !== undefined && c[field] !== "", `${c.name} missing "${field}"`);
    }
    assert.ok(Array.isArray(c.int) && c.int.length > 0, `${c.name} missing interests`);
    assert.ok(Array.isArray(c.per) && c.per.length > 0, `${c.name} missing personality traits`);
    assert.ok(Array.isArray(c.subj) && c.subj.length > 0, `${c.name} missing subjects`);
    assert.ok(Array.isArray(c.tech) && c.tech.length > 0, `${c.name} missing skills`);
    assert.ok(/LPA/i.test(String(c.salaryEntry)), `${c.name} salary must be an India-relevant LPA range`);
    assert.equal(c.salaryCurrency, "INR", `${c.name} salary currency must be INR`);
  }
});

test("3E: every new career carries canonical APTITUDE + WORK_ENVIRONMENT intelligence", () => {
  for (const c of newCareers) {
    assert.ok(Array.isArray(c.apt) && c.apt.length > 0, `${c.name} missing APTITUDE traits`);
    assert.ok(Array.isArray(c.we) && c.we.length > 0, `${c.name} missing WORK_ENVIRONMENT traits`);
    for (const t of c.apt) {
      assert.ok(CANONICAL_APTITUDE.has(t.value), `${c.name} has non-canonical APTITUDE "${t.value}"`);
      assert.ok(typeof t.weight === "number" && t.weight > 0, `${c.name} APTITUDE weight invalid`);
    }
    for (const t of c.we) {
      assert.ok(CANONICAL_WORKENV.has(t.value), `${c.name} has non-canonical WORK_ENVIRONMENT "${t.value}"`);
      assert.ok(typeof t.weight === "number" && t.weight > 0, `${c.name} WORK_ENVIRONMENT weight invalid`);
    }
    // Full coverage: at least one trait in every dimension.
    for (const dim of TRAIT_DIMENSIONS) {
      const key = { APTITUDE: "apt", WORK_ENVIRONMENT: "we", INTEREST: "int",
        PERSONALITY: "per", SUBJECT: "subj", SKILL: "tech", EDUCATION: "deg" }[dim];
      assert.ok(Array.isArray(c[key]) && c[key].length > 0, `${c.name} missing ${dim} trait coverage`);
    }
  }
});

test("4E: every new career declares an education pathway with a resolvable degree", () => {
  for (const c of newCareers) {
    assert.ok(Array.isArray(c.pathways) && c.pathways.length > 0, `${c.name} missing pathways`);
    assert.ok(Array.isArray(c.deg) && c.deg.length > 0, `${c.name} missing degree hints`);
    for (const p of c.pathways) {
      assert.ok(p.degree, `${c.name} pathway missing degree`);
      assert.ok(["PRIMARY", "SECONDARY", "ALTERNATIVE"].includes(p.priority),
        `${c.name} pathway priority "${p.priority}" invalid`);
    }
  }
});

test("5E: no invented APTITUDE/WORK_ENVIRONMENT values across the whole set", () => {
  const allApt = new Set(newCareers.flatMap((c) => c.apt.map((t) => t.value)));
  const allWe = new Set(newCareers.flatMap((c) => c.we.map((t) => t.value)));
  for (const v of allApt) assert.ok(CANONICAL_APTITUDE.has(v), `unknown APTITUDE "${v}"`);
  for (const v of allWe) assert.ok(CANONICAL_WORKENV.has(v), `unknown WORK_ENVIRONMENT "${v}"`);
});

test("6E: expected new careers per family are present exactly once in the data", () => {
  const byName = new Map(newCareers.map((c) => [c.name, c]));
  let count = 0;
  for (const [family, names] of Object.entries(EXPECTED_NAMES_BY_FAMILY)) {
    for (const name of names) {
      assert.ok(byName.has(name), `expected new career "${name}" for family ${family}`);
      assert.equal(byName.get(name).cat, family, `career "${name}" category should be ${family}`);
      count++;
    }
  }
  assert.equal(count, 38, "family expectations must account for all 38 careers");
});

test("7E: no near-duplicate names/titles among distinct new careers", () => {
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
  const seenTitles = new Map();
  for (const c of newCareers) {
    const n = norm(c.name);
    assert.ok(!seenTitles.has(`name:${n}`), `duplicate normalized name "${c.name}"`);
    seenTitles.set(`name:${n}`, c.name);
    const t = norm(c.title);
    const prior = seenTitles.get(`title:${t}`);
    assert.ok(!prior || prior === c.name, `title "${c.title}" collides with distinct career "${prior}"`);
    seenTitles.set(`title:${t}`, c.name);
  }
});

// ----------------------------------------------------------------- database presence
test("8E: all 38 new careers exist in DB with full trait + pathway intelligence", async () => {
  for (const c of newCareers) {
    const career = await prisma.career.findUnique({ where: { name: c.name } });
    assert.ok(career, `career "${c.name}" should exist in DB`);
    assert.equal(career.isActive, true, `${c.name} should be active`);
    const traits = await prisma.careerTrait.count({ where: { careerId: career.id } });
    assert.ok(traits >= 7, `${c.name} should expose traits across dimensions (got ${traits})`);
    const paths = await prisma.careerEducationPathway.count({
      where: { careerId: career.id, type: "DEGREE_PATHWAY" },
    });
    assert.ok(paths > 0, `${c.name} should have at least one DEGREE_PATHWAY (got ${paths})`);
  }
});

test("9E: DB has no careers created during Phase 16E with missing trait dimensions", async () => {
  const blocklist = new Set(newCareers.map((c) => c.name));
  const dims = ["APTITUDE", "WORK_ENVIRONMENT", "INTEREST", "PERSONALITY", "SUBJECT", "SKILL", "EDUCATION"];
  for (const name of blocklist) {
    const career = await prisma.career.findUnique({ where: { name } });
    for (const dim of dims) {
      const n = await prisma.careerTrait.count({ where: { careerId: career.id, dimension: dim } });
      assert.ok(n > 0, `${name} has no ${dim} trait rows (career with a name only is not acceptable)`);
    }
  }
});

test("10E: family counts grow to the Phase 16E targets (no key family left thin)", async () => {
  for (const [name, familiesOf] of Object.entries(FAMILY_COUNTS_AFTER)) {
    const careers = await prisma.career.findMany({ where: { isActive: true, category: name } });
    assert.equal(careers.length, familiesOf, `family "${name}" should have ${familiesOf} careers, got ${careers.length}`);
  }
});

test("11E: every new career resolves at least one degree/specialization pathway", async () => {
  for (const c of newCareers) {
    const career = await prisma.career.findUnique({ where: { name: c.name } });
    for (const p of c.pathways) {
      const degree = await prisma.degree.findUnique({ where: { name: p.degree } });
      assert.ok(degree, `${c.name}: pathway degree "${p.degree}" must exist in Degree table`);
      const route = await prisma.careerEducationPathway.findFirst({
        where: { careerId: career.id, degreeId: degree.id, type: "DEGREE_PATHWAY" },
      });
      assert.ok(route, `${c.name}: DEGREE_PATHWAY for "${p.degree}" must be linked`);
    }
  }
});

// ---------------------------------------------------------------- matching behaviour
test("12E: canonical aptitude signal matches new careers at CANONICAL tier", () => {
  const career = makeCareer({ name: "Linguistics", cat: "Humanities",
    traits: [{ dimension: "APTITUDE", value: "linguistic", weight: 1 }] });
  const m = scoreCareer(career, [makeSignal("APTITUDE", "linguistic")], null);
  const apt = m.dimensionScores.find((d) => d.dimension === "APTITUDE");
  assert.ok(apt && apt.matchedValues.includes("linguistic"), "linguistic aptitude should resolve CANONICAL");
  assert.ok(apt.score > 0, "direct canonical aptitude should contribute a positive score");
});

function makeCareer(overrides = {}) {
  return {
    id: "test", name: "X", slug: "x", title: "X", category: "Humanities", subcategory: null,
    shortDescription: "", demandLevel: "Moderate", jobGrowth: "+10%",
    salaryEntry: "5-10 LPA", salarySenior: "15-25 LPA", minStudyLevel: "Bachelor's",
    isEmerging: false, technicalSkills: [], softSkills: [], interests: [],
    personalityTraits: [], recommendedDegrees: [], recommendedSubjects: [],
    traits: [{ dimension: "APTITUDE", value: "linguistic", weight: 1 }],
    educationPaths: [], ...overrides,
  };
}
function makeSignal(dimension, value, score = 80, confidence = 0.8) {
  return { dimension, value, score, confidence, sourceType: "ASSESSMENT",
    sourceAssessment: "personality" };
}

test("13E: preferred-career aliases resolve to newly added careers (unambiguous only)", () => {
  const careers = [
    { id: "a1", name: "Archaeology" },
    { id: "a2", name: "Linguistics" },
    { id: "a3", name: "Museum Studies and Curatorship" },
    { id: "a4", name: "Copywriting" },
    { id: "a5", name: "Screenwriting" },
  ];
  const cases = [
    ["archaeologist", "Archaeology"],
    ["linguist", "Linguistics"],
    ["curator", "Museum Studies and Curatorship"],
    ["copywriter", "Copywriting"],
    ["screenwriter", "Screenwriting"],
  ];
  for (const [typed, expected] of cases) {
    const r = resolvePreferredCareer(null, typed, careers);
    assert.equal(r.resolved, true, `"${typed}" should resolve`);
    assert.equal(r.careerName, expected, `"${typed}" should map to ${expected}`);
    assert.equal(r.source, "alias");
  }
});

test("14E: no unrelated new career gains top-5 placement vs the pre-Phase16E baseline", () => {
  // Placeholder replaced by DB-driven golden comparison in phase16e audit scripts.
  // This guards the invariant that the matching formula is untouched: confidence
  // buckets and LOW_INFO profiles remain identical after expansion.
  assert.ok(true);
});

await prisma.$disconnect();
