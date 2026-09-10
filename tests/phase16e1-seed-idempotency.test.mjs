// P4 §4 — Career-intelligence seed safety regression suite.
//
// Guards the code-level fix that makes `scripts/seed-career-intelligence.mjs`
// genuinely additive/upsert-safe with respect to recommendedDegrees:
//   1. Degree tokens are cleaned at WRITE time (cleanDegreeList) so a re-seed
//      can never re-introduce the forbidden legacy patterns ("B.Tech/B.E.",
//      "BCA/MCA", "any degree ...", bare "DATA ...").
//   2. isEmerging is only overwritten when the enrichment entry authors it, so
//      an existing flag survives a re-seed.
//   3. Every current enrichment/new-career source `deg` array is clean under
//      the cleaner (data hygiene), and cleaning is idempotent.
// Careers are NOT protected data; the DB-level check creates a temporary
// inactive career and removes it, so protected counts are untouched.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { cleanDegreeList } from "../scripts/phase16e1-data/degree-clean.mjs";
import { buildEnrichmentUpdate } from "../scripts/seed-career-intelligence.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "scripts", "career-intelligence");

const FORBIDDEN = [
  /B\.Tech\.?\/B\.?E\.?/i,
  /BCA\/MCA/i,
  /\bany\s+degree\b/i,
];

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);
const tempName = `P4 Seed Safety ${suffix}`;
let tempCareerId = null;

function loadAll(prefix) {
  const out = [];
  for (const f of readdirSync(DATA_DIR)) {
    if (f.startsWith(prefix) && f.endsWith(".json")) {
      const parsed = JSON.parse(readFileSync(join(DATA_DIR, f), "utf8"));
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(...Object.values(parsed));
    }
  }
  return out;
}

function hasForbiddenToken(tokens) {
  for (const t of tokens) {
    const s = String(t);
    for (const re of FORBIDDEN) if (re.test(s)) return true;
  }
  return false;
}

function baseCareerData() {
  return {
    name: tempName,
    slug: "p4-seed-safety-" + suffix.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: "P4 seed safety temp career",
    introduction: "Temporary career used only by the idempotency regression test.",
    whoShouldPursue: [],
    eligibility: [],
    workNatureDesc: "None.",
    workNatureExamples: [],
    demandLevel: "Medium",
    salaryCurrency: "INR",
    salaryEntry: "0",
    salarySenior: "0",
    jobGrowth: "",
    topIndustries: [],
    futureOutlook: "",
    faqs: [],
    pathways: [],
    conventionalOptions: [],
    newAgeOptions: [],
    aiRelatedOptions: [],
    videoRecommendations: [],
    isActive: false,
  };
}

before(async () => {
  tempCareerId = (await prisma.career.create({ data: { ...baseCareerData(), recommendedDegrees: ["B.Tech/B.E. Mechanical"], isEmerging: true } })).id;
});

after(async () => {
  if (tempCareerId) await prisma.career.delete({ where: { id: tempCareerId } }).catch(() => {});
  await prisma.$disconnect();
});

/* 1 · cleaner is idempotent and removes the forbidden patterns */
test("1 · cleanDegreeList is idempotent and removes forbidden degree patterns", () => {
  const corpus = [
    "B.Tech/B.E. Mechanical",
    "B.Tech/B.E.",
    "BCA/MCA",
    "Any degree + design portfolio",
    "Any degree + animation diploma + showreel",
    "Any degree; portfolio and audience matter more",
    "Any degree",
    "or Any degree",
    "B.Des HCI/Any degree + UX certification and portfolio",
    "DATA SCIENCE + machine learning",
    "M.Sc Data Science",
    "B.Tech (Mechanical)",
  ];
  for (const tok of corpus) {
    const once = cleanDegreeList([tok]);
    assert.ok(!hasForbiddenToken(once), `forbidden pattern survived cleaning: "${tok}" -> ${JSON.stringify(once)}`);
    const twice = cleanDegreeList(once);
    assert.deepEqual(twice, once, `cleaner not idempotent for "${tok}"`);
    const thrice = cleanDegreeList(twice);
    assert.deepEqual(thrice, once, `cleaner not stable after second pass for "${tok}"`);
  }
  // specific expectations
  assert.deepEqual(cleanDegreeList(["B.Tech/B.E. Mechanical"]), ["B.Tech Mechanical"]);
  assert.deepEqual(cleanDegreeList(["BCA/MCA"]), ["BCA"]);
  assert.deepEqual(cleanDegreeList(["Any degree + design portfolio"]), ["design portfolio"]);
  assert.deepEqual(cleanDegreeList(["Any degree"]), []);
  assert.deepEqual(cleanDegreeList(["DATA SCIENCE + machine learning"]), []);
  // no duplicates introduced by case variants
  assert.deepEqual(cleanDegreeList(["M.Sc Data Science", "M.SC Data Science"]), ["M.Sc Data Science"]);
});

/* 2 · current sources never re-introduce the forbidden patterns after cleaning */
test("2 · all enrichment/new-career source deg fields are clean under the cleaner", () => {
  const entries = [...loadAll("enrichment-"), ...loadAll("new-careers-")];
  assert.ok(entries.length > 0, "sources loaded");
  let tokensChecked = 0;
  for (const e of entries) {
    const deg = Array.isArray(e.deg) ? e.deg : [];
    for (const d of deg) {
      const cleaned = cleanDegreeList([d]);
      assert.ok(!hasForbiddenToken(cleaned), `source token "${d}" for "${e.name || e.title}" cleans to forbidden output`);
      tokensChecked++;
    }
  }
  assert.ok(tokensChecked > 100, `checked a meaningful corpus (${tokensChecked} tokens)`);
});

/* 3 · enrichment write path is stable across repeated application (DB-level) */
test("3 · buildEnrichmentUpdate is stable twice and preserves isEmerging", async () => {
  assert.ok(tempCareerId, "temp career created");
  const e = {
    cat: "Healthcare & Medicine",
    tech: ["research"],
    soft: ["communication"],
    int: ["medical"],          // note: subject-degree traits stay derived from raw values
    per: ["analytical"],
    subj: ["Biology"],
    deg: ["B.Tech/B.E.", "Any degree + research", "MBBS"],
    // NOTE: no `emerging` key on purpose
  };

  let career = await prisma.career.findUnique({ where: { id: tempCareerId } });
  assert.equal(career.isEmerging, true, "precondition: flag true");

  const first = buildEnrichmentUpdate(e, career);
  await prisma.career.update({ where: { id: tempCareerId }, data: first });
  career = await prisma.career.findUnique({ where: { id: tempCareerId } });
  assert.ok(!hasForbiddenToken(career.recommendedDegrees), "first pass removes forbidden patterns");
  assert.equal(career.isEmerging, true, "flag preserved when entry has no emerging key");

  const second = buildEnrichmentUpdate(e, career);
  await prisma.career.update({ where: { id: tempCareerId }, data: second });
  career = await prisma.career.findUnique({ where: { id: tempCareerId } });
  assert.deepEqual(career.recommendedDegrees, first.recommendedDegrees, "no drift between passes");
  assert.equal(career.isEmerging, true, "flag still preserved after second pass");

  // authored flags are honoured
  await prisma.career.update({
    where: { id: tempCareerId },
    data: buildEnrichmentUpdate({ ...e, emerging: false }, career),
  });
  career = await prisma.career.findUnique({ where: { id: tempCareerId } });
  assert.equal(career.isEmerging, false, "explicit emerging:false honoured");
  await prisma.career.update({
    where: { id: tempCareerId },
    data: buildEnrichmentUpdate({ ...e, emerging: true }, career),
  });
  career = await prisma.career.findUnique({ where: { id: tempCareerId } });
  assert.equal(career.isEmerging, true, "explicit emerging:true honoured");
});