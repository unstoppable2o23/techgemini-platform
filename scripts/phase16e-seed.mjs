#!/usr/bin/env node
/**
 * Phase 16E — Career Family Expansion V1 seed/import.
 *
 * Additive & idempotent. Convention: mirror the established phase16c
 * upsertTrait pattern on the careerId_dimension_value compound key.
 *
 * Data contract (JSON array of careers):
 *   name, title, cat (family), sub (subcategory),
 *   intro, whoShouldPursue[], eligibility[], workDesc, workExamples[],
   *   demandLevel, salaryEntry, salaryMedian, salarySenior, salaryCurrency,
   *   jobGrowth, topIndustries[], futureOutlook, isEmerging, minStudyLevel,
   *   tech[], soft[], int[], per[], subj[], deg[],
   *   apt[]  {value,weight}  // canonical APTITUDE
   *   we[]   {value,weight}  // canonical WORK_ENVIRONMENT
   *   pathways[] { degree(name of existing Degree record), specialization?, priority }
   *
 * Behaviour:
 *   --dry-run: report only, no writes.
 *   Idempotent: re-running creates no duplicates (upsert by canonical name).
 *   Read-only on University/IndianInstitution/Program.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry-run");

const APTITUDE_SET = new Set([
  "logical_reasoning", "logical_mathematical", "pattern_recognition",
  "attention_to_detail", "visual_spatial", "linguistic", "interpersonal",
  "intrapersonal", "naturalist", "emotional_intelligence", "bodily_kinesthetic",
]);
const WORKENV_SET = new Set([
  "collaborative_preference", "independent_preference", "prefers_structure",
  "prefers_autonomy", "prefers_quiet", "prefers_formal_setting", "self_driven",
]);
const TRAIT_DIMENSIONS = {
  INTEREST: "int", PERSONALITY: "per", SUBJECT: "subj", SKILL: "tech",
  EDUCATION: "deg", APTITUDE: "apt", WORK_ENVIRONMENT: "we",
};

function normalize(s) {
  return String(s || "").toLowerCase().trim().replace(/\s+/g, " ");
}
function slugify(s) {
  return String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
async function canonicalNameExists(name) {
  const like = await prisma.career.findMany({
    where: { OR: [{ name: { equals: name, mode: "insensitive" } }] },
    select: { id: true, name: true, slug: true, title: true, category: true },
  });
  const norm = normalize(name);
  return like.filter(
    (c) =>
      normalize(c.name) === norm ||
      normalize(c.title) === norm ||
      normalize(c.slug) === normalize(slugify(name))
  );
}

async function upsertTrait(careerId, dimension, value, weight = 1) {
  const v = String(value).trim();
  if (!v) return false;
  await prisma.careerTrait.upsert({
    where: { careerId_dimension_value: { careerId, dimension, value: v } },
    update: { weight },
    create: { careerId, dimension, value: v, weight },
  });
  return true;
}

async function validateCareer(career, seen) {
  const problems = [];
  if (!career.name || !normalize(career.name)) problems.push("missing name");
  if (seen.has(normalize(career.name))) problems.push("duplicate in input file");
  if (!career.cat) problems.push("missing cat");
  let totalTraitClaims = 0;
  for (const key of Object.keys(TRAIT_DIMENSIONS)) {
    const arr = TRAIT_DIMENSIONS[key] === "apt" ? career.apt : TRAIT_DIMENSIONS[key] === "we" ? career.we : career[TRAIT_DIMENSIONS[key]];
    if (key === "APTITUDE" || key === "WORK_ENVIRONMENT") {
      for (const item of arr || []) {
        totalTraitClaims++;
        if (!APTITUDE_SET.has(item.value) && key === "APTITUDE")
          problems.push(`invalid APTITUDE '${item.value}'`);
        if (!WORKENV_SET.has(item.value) && key === "WORK_ENVIRONMENT")
          problems.push(`invalid WORK_ENVIRONMENT '${item.value}'`);
      }
    } else {
      totalTraitClaims += (arr || []).length;
    }
  }
  if (totalTraitClaims < 3) problems.push("insufficient trait intelligence");
  if (!career.pathways || !career.pathways.length) problems.push("no education pathway");
  for (const pw of career.pathways || []) {
    const degree = await prisma.degree.findFirst({
      where: { name: { equals: pw.degree, mode: "insensitive" } },
      select: { id: true },
    });
    if (!degree) problems.push(`degree not found in DB: '${pw.degree}'`);
  }
  return problems;
}

async function main() {
  const dir = path.dirname(fileURLToPath(import.meta.url)) + "/phase16e-data";
  const files = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  const careers = [];
  for (const f of files) {
    const arr = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
    careers.push(...arr);
  }
  const seen = new Set();
  const invalid = [];
  for (const c of careers) {
    const prob = await validateCareer(c, seen);
    seen.add(normalize(c.name));
    if (prob.length) invalid.push({ name: c.name, prob });
  }
  if (invalid.length) {
    console.error("=== VALIDATION FAILED ===");
    for (const { name, prob } of invalid) console.error(`- ${name}:\n    ${prob.join("\n    ")}`);
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`Validated ${careers.length} careers, 0 problems. DRY=${DRY}`);

  let created = 0, updated = 0, traitRows = 0, pathways = 0;
  for (const c of careers) {
    const exists = await prisma.career.findFirst({
      where: { name: { equals: c.name, mode: "insensitive" } },
      select: { id: true },
    });
    const data = {
      title: c.title || c.name,
      category: c.cat,
      subcategory: c.sub || null,
      introduction: c.intro || "",
      whoShouldPursue: c.whoShouldPursue || [],
      eligibility: c.eligibility || [],
      workNatureDesc: c.workDesc || "",
      workNatureExamples: c.workExamples || [],
      demandLevel: c.demandLevel || "Medium",
      salaryCurrency: c.salaryCurrency || "INR",
      salaryEntry: c.salaryEntry || "",
      salaryMedian: c.salaryMedian || null,
      salarySenior: c.salarySenior || "",
      jobGrowth: c.jobGrowth || "",
      topIndustries: c.topIndustries || [],
      futureOutlook: c.futureOutlook || "",
      minStudyLevel: c.minStudyLevel || "Bachelor's",
      isEmerging: !!c.isEmerging,
      faqs: c.faqs || [],
      conventionalOptions: c.conventionalOptions || [],
      newAgeOptions: c.newAgeOptions || [],
      aiRelatedOptions: c.aiRelatedOptions || [],
      videoRecommendations: c.videoRecommendations || [],
      pathways: c.pathwaysJson || [],
    };
    let career;
    if (exists) {
      if (!DRY) career = await prisma.career.update({ where: { id: exists.id }, data });
      updated++;
    } else {
      if (!DRY) career = await prisma.career.create({
        data: {
          ...data,
          name: c.name,
          slug: slugify(c.name),
          isActive: true,
        },
      });
      created++;
    }
    if (DRY) {
      // still estimate trait/edu work
      const est =
        ((c.int || []).length) + ((c.per || []).length) + ((c.subj || []).length) +
        ((c.tech || []).length) + ((c.deg || []).length) + ((c.apt || []).length) +
        ((c.we || []).length);
      traitRows += est;
      pathways += (c.pathways || []).length;
      continue;
    }
    const careerId = career.id;
    const add = async (dimension, arr, weight) => {
      if (!arr) return;
      for (const v of arr) {
        if (await upsertTrait(careerId, dimension, Array.isArray(v) ? v[0] : v, Array.isArray(v) ? v[1] : weight)) traitRows++;
      }
    };
    await add("INTEREST", c.int, 1);
    await add("PERSONALITY", c.per, 1);
    await add("SUBJECT", c.subj, 1);
    await add("SKILL", c.tech, 1);
    await add("EDUCATION", c.deg, 1);
    await add("APTITUDE", (c.apt || []).map((x) => [x.value, x.weight || 1]), 1);
    await add("WORK_ENVIRONMENT", (c.we || []).map((x) => [x.value, x.weight || 1]), 1);

    for (const pw of c.pathways || []) {
      const degree = await prisma.degree.findFirst({
        where: { name: { equals: pw.degree, mode: "insensitive" } },
        select: { id: true },
      });
      if (!degree) {
        console.error(`  WARN: degree not found for '${c.name}': '${pw.degree}'`);
        continue;
      }
      let specId = null;
      if (pw.specialization) {
        const spec = await prisma.specialization.findFirst({
          where: { name: { equals: pw.specialization, mode: "insensitive" } },
          select: { id: true },
        });
        if (spec) specId = spec.id;
      }
      const existingPw = await prisma.careerEducationPathway.findFirst({
        where: {
          careerId,
          degreeId: degree.id,
          specializationId: specId,
          type: "DEGREE_PATHWAY",
        },
        select: { id: true },
      });
      if (!existingPw) {
        await prisma.careerEducationPathway.create({
          data: {
            careerId,
            degreeId: degree.id,
            specializationId: specId,
            priority: pw.priority || "PRIMARY",
            type: "DEGREE_PATHWAY",
          },
        });
        pathways++;
      }
    }
  }

  console.log(`\nSummary: ${created} created, ${updated} updated, ${traitRows} trait rows, ${pathways} pathways (DRY=${DRY})`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
