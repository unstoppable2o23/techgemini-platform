import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanSalary(value) {
  return typeof value === "string" ? value.replace(/^\?+/, "") : value || "";
}

async function main() {
  const file = path.resolve(__dirname, "careers-data.json");
  const careers = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Importing ${careers.length} careers...`);

  let created = 0;
  let updated = 0;

  for (const c of careers) {
    const data = {
      name: c.name,
      slug: slugify(c.name),
      title: c.title || c.name,
      category: c.category || "Other",
      introduction: c.introduction || "",
      whoShouldPursue: c.whoShouldPursue || [],
      eligibility: c.eligibility || [],
      workNatureDesc: c.workNature?.description || "",
      workNatureExamples: c.workNature?.examples || [],
      demandLevel: c.stats?.demandLevel || "Medium",
      salaryCurrency: c.stats?.salary?.currency || "INR",
      salaryEntry: cleanSalary(c.stats?.salary?.entry),
      salaryMedian: cleanSalary(c.stats?.salary?.median),
      salarySenior: cleanSalary(c.stats?.salary?.senior),
      jobGrowth: c.stats?.jobGrowth || "",
      topIndustries: c.stats?.topIndustries || [],
      futureOutlook: c.stats?.futureOutlook || "",
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

  console.log(`Done. Created: ${created}, Updated: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
