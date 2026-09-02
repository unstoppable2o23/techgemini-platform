// Phase 16D — Step 4 (broad-career) + Step 5 (generic-trait) analysis.
// Read-only. Produces scripts/audit/phase16d-generic-traits.json
// Quantifies, for every trait value a career declares:
//   - how many active careers contain it (frequency)
//   - how many distinct career categories it spans (category breadth)
//   - the trait sources (skill/interest/personality/subject/aptitude/work-env)
// Also profiles the broad careers (Actuarial Science, Chemical Engineering,
// Agricultural Engineering) with their dominant matching dimensions.

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();

const CATEGORY_TO_FAMILY = {
  "Technology & Software": "technology", "Data & AI": "technology", Engineering: "engineering",
  "Healthcare & Medicine": "medicine", "Life Sciences": "lifescience", "Finance & Accounting": "finance",
  "Business & Management": "business", "Marketing & Advertising": "business", Sales: "business",
  Law: "law", "Government & Public Services": "government", Humanities: "humanities", Education: "education",
  "Psychology & Social Sciences": "psychology", "Design & Creative": "design", "Media & Communication": "media",
  "Architecture & Planning": "architecture", "Environment & Sustainability": "environment",
  Agriculture: "agriculture", Manufacturing: "manufacturing", "Logistics & Supply Chain": "logistics",
  "Sports & Fitness": "sports", "Hospitality & Tourism": "hospitality",
};

// dimension -> which set of career-declared traits it comes from
const TRAIT_SOURCE_BY_DIM = {
  SKILL: "skills",
  INTEREST: "interests",
  PERSONALITY: "personality",
  SUBJECT: "subjects",
  APTITUDE: "aptitude",
  WORK_ENVIRONMENT: "work-environment",
};

async function main() {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    select: { name: true, category: true, technicalSkills: true, softSkills: true, interests: true, personalityTraits: true, recommendedSubjects: true, traits: { select: { dimension: true, value: true } } },
  });

  // Build per-career trait sets keyed by normalized value.
  const traitIndex = new Map(); // norm -> {categories:Set, dims:Set, careers:Set}
  const norm = (s) => s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const add = (career, dim, value) => {
    const n = norm(value || "");
    if (!n || n.length < 3) return;
    let e = traitIndex.get(n);
    if (!e) { e = { categories: new Set(), dims: new Set(), careers: new Set(), sample: value, dim: dim }; traitIndex.set(n, e); }
    e.categories.add(career.category);
    e.dims.add(dim);
    e.careers.add(career.name);
  };
  for (const c of careers) {
    for (const s of c.technicalSkills || []) add(c, "SKILL", s);
    for (const s of c.softSkills || []) add(c, "SKILL", s);
    for (const i of c.interests || []) add(c, "INTEREST", i);
    for (const p of c.personalityTraits || []) add(c, "PERSONALITY", p);
    for (const s of c.recommendedSubjects || []) add(c, "SUBJECT", s);
    for (const t of c.traits || []) add(c, t.dimension, t.value);
  }

  // Generic traits: present in a large share of careers AND spanning many categories.
  const N = careers.length;
  const generic = [...traitIndex.entries()]
    .map(([n, e]) => ({ trait: e.sample, norm: n, frequency: e.careers.size, catBreadth: e.categories.size, dims: [...e.dims], sharePct: Math.round((e.careers.size / N) * 100) }))
    .filter((g) => g.frequency >= 10 || g.catBreadth >= 10)
    .sort((a, b) => b.frequency - a.frequency);

  // Trait frequency histogram (how many traits sit in each frequency band).
  const hist = {};
  const bands = [[1, 1, "1"], [2, 5, "2-5"], [6, 10, "6-10"], [11, 20, "11-20"], [21, 50, "21-50"], [51, 1000, "51+"]];
  for (const [, e] of traitIndex) {
    const b = bands.find(([lo, hi]) => e.careers.size >= lo && e.careers.size <= hi);
    const label = b ? b[2] : "?";
    hist[label] = (hist[label] || 0) + 1;
  }

  // Specificity would reward moderately-common, category-focused traits. For the
  // report, list the most repetitive traits per dimension that create collisions.
  const dimsOfGeneric = {};
  for (const g of generic) for (const d of g.dims) dimsOfGeneric[d] = (dimsOfGeneric[d] || 0) + 1;

  const broad = await analyzeBroadCareers();

  const out = {
    careersAudited: N,
    totalDistinctTraits: traitIndex.size,
    traitFrequencyHistogram: hist,
    genericTraits: generic.map((g) => ({ ...g, categories: [...(traitIndex.get(g.norm)?.categories || [])] })).slice(0, 200),
    genericTraitCount: generic.length,
    genericByDimension: dimsOfGeneric,
    broadCareers: broad,
  };
  writeFileSync(new URL("./phase16d-generic-traits.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
  console.log("generic-traits written");
  console.log("DISTINCT_TRAITS=" + traitIndex.size);
  console.log("HIST=" + JSON.stringify(out.traitFrequencyHistogram));
  console.log("GENERIC_COUNT=" + generic.length + " GEN_BY_DIM=" + JSON.stringify(dimsOfGeneric));
  console.log("\nTOP GENERIC (freq>=N, many cats):");
  for (const g of generic.slice(0, 30)) console.log(`  ${g.trait.padEnd(28)} freq=${g.frequency.toString().padEnd(3)} cats=${g.catBreadth} dims=[${g.dims}] share=${g.sharePct}%`);
  console.log("\nBROAD CAREERS (their own trait frequency/coverage):");
  for (const b of broad) console.log(`  ${b.name.padEnd(26)} traits=${b.nTraits} generic-traits=${b.nGenericTraits} catBreadth_avg=${b.avgTraitCatBreadth}`);
}

async function analyzeBroadCareers() {
  // Re-derive trait index counts for a handful of careers by inspecting their traits.
  const names = ["Actuarial Science", "Chemical Engineering", "Agricultural Engineering", "Software Engineering", "Machine Learning Engineering", "Data Science", "Medicine", "Biomedical Engineering"];
  const careers = await prisma.career.findMany({ where: { isActive: true, name: { in: names } }, select: { name: true, technicalSkills: true, softSkills: true, interests: true, personalityTraits: true, recommendedSubjects: true, traits: { select: { dimension: true, value: true } } } });
  const all = await prisma.career.findMany({ where: { isActive: true }, select: { technicalSkills: true, softSkills: true, interests: true, personalityTraits: true, recommendedSubjects: true, traits: { select: { dimension: true, value: true } } } });
  const norm = (s) => s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const counts = new Map();
  for (const c of all) {
    const set = new Set();
    for (const s of c.technicalSkills || []) set.add(norm(s));
    for (const s of c.softSkills || []) set.add(norm(s));
    for (const i of c.interests || []) set.add(norm(i));
    for (const p of c.personalityTraits || []) set.add(norm(p));
    for (const s of c.recommendedSubjects || []) set.add(norm(s));
    for (const t of c.traits || []) set.add(norm(t.value));
    for (const v of set) counts.set(v, (counts.get(v) || 0) + 1);
  }
  return names.map((nm) => {
    const c = careers.find((x) => x.name === nm);
    if (!c) return { name: nm, notFound: true };
    const set = new Set();
    for (const s of c.technicalSkills || []) set.add(norm(s));
    for (const s of c.softSkills || []) set.add(norm(s));
    for (const i of c.interests || []) set.add(norm(i));
    for (const p of c.personalityTraits || []) set.add(norm(p));
    for (const s of c.recommendedSubjects || []) set.add(norm(s));
    for (const t of c.traits || []) set.add(norm(t.value));
    const freqs = [...set].map((v) => counts.get(v) || 1);
    const generic = freqs.filter((f) => f >= 21).length;
    return { name: nm, nTraits: set.size, nGenericTraits: generic, avgTraitCatBreadth: Math.round(freqs.reduce((a, b) => a + b, 0) / freqs.length), minCohort: Math.min(...freqs) };
  });
}

try { await main(); } finally { await prisma.$disconnect(); }