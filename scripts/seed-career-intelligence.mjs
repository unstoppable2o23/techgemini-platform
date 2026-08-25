import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const DATA_DIR = path.resolve(__dirname, "career-intelligence");

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8"));
}

function loadAll(prefix) {
  const merged = {};
  for (const f of fs.readdirSync(DATA_DIR)) {
    if (f.startsWith(prefix) && f.endsWith(".json")) {
      Object.assign(merged, loadJson(f));
    }
  }
  return merged;
}

function loadNewCareers() {
  const all = [];
  for (const f of fs.readdirSync(DATA_DIR)) {
    if (f.startsWith("new-careers") && f.endsWith(".json")) {
      all.push(...loadJson(f));
    }
  }
  return all;
}

async function main() {
  const taxonomy = loadJson("taxonomy.json");
  const validCategories = new Set(taxonomy.categories);
  const enrichment = loadAll("enrichment-");
  const newCareers = loadNewCareers();

  console.log(
    `Career intelligence seed: ${Object.keys(enrichment).length} enrichment entries, ${newCareers.length} new careers`
  );

  // ---- validate ----
  const problems = [];
  for (const [name, e] of Object.entries(enrichment)) {
    if (e.cat && !validCategories.has(e.cat)) {
      problems.push(`"${name}": invalid category "${e.cat}"`);
    }
    if (!Array.isArray(e.tech) || e.tech.length === 0) {
      problems.push(`"${name}": missing technical skills`);
    }
  }
  if (problems.length) {
    console.error("VALIDATION FAILED:");
    problems.forEach((p) => console.error("  -", p));
    process.exit(1);
  }
  console.log("Validation passed.");

  // ---- upsert new careers (full prose + structured) ----
  let created = 0;
  let updated = 0;
  for (const c of newCareers) {
    const structured = {
      category: c.cat,
      subcategory: c.sub,
      shortDescription: c.introduction.split(".")[0].slice(0, 180),
      technicalSkills: c.tech || [],
      softSkills: c.soft || [],
      interests: c.int || [],
      personalityTraits: c.per || [],
      recommendedDegrees: c.deg || [],
      recommendedSubjects: c.subj || [],
      toolsAndTechnologies: c.tools || [],
      workActivities: c.acts || [],
      workEnvironment: c.env || null,
      careerPath: c.path || [],
      automationRisk: c.auto || null,
      indiaRelevance: c.ind || null,
      globalRelevance: c.glo || null,
      remotePotential: c.rem || null,
      relatedCareers: c.rel || [],
      isEmerging: Boolean(c.emerging),
      minStudyLevel: c.minEdu || null,
    };
    const data = {
      name: c.name,
      slug: slugify(c.name),
      title: c.title,
      category: structured.category,
      subcategory: structured.subcategory,
      shortDescription: structured.shortDescription,
      introduction: c.introduction,
      whoShouldPursue: c.whoShouldPursue || [],
      eligibility: c.eligibility || [],
      workNatureDesc: c.workNature?.description || "",
      workNatureExamples: c.workNature?.examples || [],
      demandLevel: c.stats?.demandLevel || "Medium",
      salaryCurrency: c.stats?.salary?.currency || "INR",
      salaryEntry: (c.stats?.salary?.entry || "").replace(/^\?+/, ""),
      salaryMedian: (c.stats?.salary?.median || "").replace(/^\?+/, "") || null,
      salarySenior: (c.stats?.salary?.senior || "").replace(/^\?+/, ""),
      jobGrowth: c.stats?.jobGrowth || "",
      topIndustries: c.stats?.topIndustries || [],
      futureOutlook: c.stats?.futureOutlook || "",
      minStudyLevel: structured.minStudyLevel,
      technicalSkills: structured.technicalSkills,
      softSkills: structured.softSkills,
      interests: structured.interests,
      personalityTraits: structured.personalityTraits,
      recommendedDegrees: structured.recommendedDegrees,
      recommendedSubjects: structured.recommendedSubjects,
      toolsAndTechnologies: structured.toolsAndTechnologies,
      workActivities: structured.workActivities,
      workEnvironment: structured.workEnvironment,
      careerPath: structured.careerPath,
      automationRisk: structured.automationRisk,
      indiaRelevance: structured.indiaRelevance,
      globalRelevance: structured.globalRelevance,
      remotePotential: structured.remotePotential,
      relatedCareers: structured.relatedCareers,
      isEmerging: structured.isEmerging,
      isActive: true,
      seoTitle: c.seo?.title || null,
      seoDescription: c.seo?.description || null,
      seoKeywords: c.seo?.keywords || [],
      faqs: c.seo?.faqs || [],
      pathways: c.pathways || [],
      conventionalOptions: c.conventionalOptions || [],
      newAgeOptions: c.newAgeOptions || [],
      aiRelatedOptions: c.aiRelatedOptions || [],
      videoRecommendations: c.videoRecommendations || [],
    };
    const existing = await prisma.career.findUnique({ where: { name: c.name } });
    if (existing) {
      await prisma.career.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.career.create({ data });
      created++;
    }
  }
  console.log(`New careers: created ${created}, updated ${updated}`);

  // ---- apply enrichment to all careers + derive traits ----
  const traitMap = {
    tech: { dimension: "SKILL", weight: 1 },
    soft: { dimension: "SKILL", weight: 0.5 },
    int: { dimension: "INTEREST", weight: 1 },
    per: { dimension: "PERSONALITY", weight: 1 },
    subj: { dimension: "SUBJECT", weight: 1 },
    deg: { dimension: "EDUCATION", weight: 1 },
  };

  let enriched = 0;
  let traitCount = 0;
  for (const [name, e] of Object.entries(enrichment)) {
    const career = await prisma.career.findUnique({ where: { name } });
    if (!career) {
      console.warn(`  ! enrichment target not found: ${name}`);
      continue;
    }
    await prisma.career.update({
      where: { id: career.id },
      data: {
        category: e.cat || undefined,
        subcategory: e.sub || undefined,
        technicalSkills: e.tech || undefined,
        softSkills: e.soft || undefined,
        interests: e.int || undefined,
        personalityTraits: e.per || undefined,
        recommendedDegrees: e.deg || undefined,
        recommendedSubjects: e.subj || undefined,
        toolsAndTechnologies: e.tools || undefined,
        workActivities: e.acts || undefined,
        workEnvironment: e.env || undefined,
        careerPath: e.path || undefined,
        automationRisk: e.auto || undefined,
        indiaRelevance: e.ind || undefined,
        globalRelevance: e.glo || undefined,
        remotePotential: e.rem || undefined,
        relatedCareers: e.rel || undefined,
        isEmerging: Boolean(e.emerging),
        minStudyLevel: e.minEdu || undefined,
      },
    });

    // derive traits
    await prisma.careerTrait.deleteMany({ where: { careerId: career.id } });
    const rows = [];
    for (const [field, cfg] of Object.entries(traitMap)) {
      for (const value of e[field] || []) {
        rows.push({
          careerId: career.id,
          dimension: cfg.dimension,
          value: String(value).trim(),
          weight: cfg.weight,
        });
      }
    }
    if (rows.length) {
      await prisma.careerTrait.createMany({ data: rows, skipDuplicates: true });
      traitCount += rows.length;
    }
    enriched++;
  }
  console.log(`Enriched careers: ${enriched} | CareerTrait rows: ${traitCount}`);

  const total = await prisma.career.count();
  console.log(`Total careers in database: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
