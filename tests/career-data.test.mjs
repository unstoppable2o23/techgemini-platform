import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "scripts", "career-intelligence");

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
}

const taxonomy = loadJson("taxonomy.json");
const validCategories = new Set(taxonomy.categories);

// merge all enrichment files
const enrichmentFiles = fs.readdirSync(dataDir).filter((f) => f.startsWith("enrichment-"));
const enrichment = {};
for (const f of enrichmentFiles) Object.assign(enrichment, loadJson(f));

// merge all new career files
const newFiles = fs.readdirSync(dataDir).filter((f) => f.startsWith("new-careers-"));
const newCareers = [];
for (const f of newFiles) newCareers.push(...loadJson(f));

// existing careers
const existing = JSON.parse(fs.readFileSync(path.join(root, "scripts", "careers-data.json"), "utf8"));

const allNames = [...existing.map((c) => c.name), ...newCareers.map((c) => c.name)];

test("taxonomy has no duplicate or empty categories", () => {
  const cats = taxonomy.categories;
  assert.equal(new Set(cats).size, cats.length, "duplicate categories");
  for (const c of cats) assert.ok(c.trim().length >= 3, "category too short");
});

test("every enrichment entry maps to a real career name", () => {
  const names = new Set(allNames.map((n) => n.toLowerCase()));
  const missing = Object.keys(enrichment).filter((n) => !names.has(n.toLowerCase()));
  assert.deepEqual(missing, [], `enrichment entries without careers: ${missing.join(", ")}`);
});

test("every enrichment entry has a valid category and technical skills", () => {
  for (const [name, e] of Object.entries(enrichment)) {
    assert.ok(validCategories.has(e.cat), `${name}: invalid category ${e.cat}`);
    assert.ok(Array.isArray(e.tech) && e.tech.length >= 2, `${name}: needs technical skills`);
    assert.ok(Array.isArray(e.deg) && e.deg.length >= 1, `${name}: needs recommended degrees`);
    assert.ok(e.minEdu, `${name}: needs minEdu`);
  }
});

test("no duplicate career names across existing and new", () => {
  const lower = allNames.map((n) => n.toLowerCase());
  assert.equal(new Set(lower).size, lower.length, "duplicate career names found");
});

test("new careers have complete required content", () => {
  for (const c of newCareers) {
    assert.ok(c.name && c.name.length > 2, `${c.name}: missing name`);
    assert.ok(c.title, `${c.name}: missing title`);
    assert.ok(c.introduction && c.introduction.length > 100, `${c.name}: introduction too short`);
    assert.ok(c.whoShouldPursue?.length >= 3, `${c.name}: needs 3 whoShouldPursue`);
    assert.ok(c.workNature?.description, `${c.name}: missing workNature description`);
    assert.ok(c.eligibility?.length >= 2, `${c.name}: needs eligibility`);
    assert.ok(c.pathways?.length >= 1, `${c.name}: needs pathways`);
    assert.ok(c.stats?.demandLevel, `${c.name}: missing demandLevel`);
    assert.ok(c.stats?.salary?.entry, `${c.name}: missing entry salary`);
    assert.ok(c.stats?.topIndustries?.length >= 3, `${c.name}: needs top industries`);
    assert.ok(c.stats?.futureOutlook?.length > 50, `${c.name}: futureOutlook too short`);
    assert.ok(c.seo?.title, `${c.name}: missing seo title`);
  }
});

test("no placeholder content anywhere", () => {
  const placeholders = ["lorem ipsum", "coming soon", "to be added", "example career", "tbd"];
  for (const c of newCareers) {
    const blob = JSON.stringify(c).toLowerCase();
    for (const p of placeholders) {
      assert.ok(!blob.includes(p), `${c.name}: contains placeholder "${p}"`);
    }
  }
});

test("new career slugs are unique against existing slugs", () => {
  const slugify = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const existingSlugs = new Set(existing.map((c) => slugify(c.name)));
  const newSlugs = newCareers.map((c) => slugify(c.name));
  const dups = newSlugs.filter((s) => existingSlugs.has(s));
  assert.deepEqual(dups, [], `new careers colliding with existing slugs: ${dups.join(", ")}`);
});

test("total dataset reaches approximately 200-300 careers", () => {
  assert.ok(allNames.length >= 190, `dataset too small: ${allNames.length}`);
  assert.ok(allNames.length <= 320, `dataset too large: ${allNames.length}`);
});
