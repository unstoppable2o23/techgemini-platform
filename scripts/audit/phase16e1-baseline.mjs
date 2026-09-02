import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const DIMS = ["INTEREST", "PERSONALITY", "APTITUDE", "SUBJECT", "SKILL", "EDUCATION", "WORK_ENVIRONMENT"];

async function main() {
  const careers = await prisma.career.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, slug: true, title: true, category: true, subcategory: true,
      isActive: true, isEmerging: true,
      technicalSkills: true, softSkills: true, interests: true, personalityTraits: true,
      recommendedDegrees: true, recommendedSubjects: true, toolsAndTechnologies: true,
      shortDescription: true, introduction: true, workNatureDesc: true, demandLevel: true,
      salaryEntry: true, salaryMedian: true, salarySenior: true, jobGrowth: true,
      minStudyLevel: true, salaryCurrency: true, topIndustries: true, futureOutlook: true,
      seoTitle: true,
      traits: { select: { dimension: true, value: true, weight: true } },
      careerEducationPathways: { select: { degreeId: true, specializationId: true, subjectId: true, priority: true, type: true } },
      _count: { select: { careerEducationPathways: true } },
    },
  });

  const active = careers.filter((c) => c.isActive);
  const inactive = careers.filter((c) => !c.isActive);

  // ---- names / slugs / case-insensitive ----
  const namesLC = {};
  for (const c of careers) namesLC[c.name.toLowerCase().trim()] = (namesLC[c.name.toLowerCase().trim()] || []).concat(c.name);
  const caseInsensitiveDupes = Object.entries(namesLC).filter(([, v]) => v.length > 1);

  const slugSet = {};
  for (const c of careers) slugSet[c.slug] = (slugSet[c.slug] || []).concat(c.name);
  const slugDupes = Object.entries(slugSet).filter(([, v]) => v.length > 1);

  // ---- trait dims per career ----
  const perCareer = active.map((c) => {
    const dims = Object.fromEntries(DIMS.map((d) => [d, 0]));
    for (const t of c.traits) dims[t.dimension] = (dims[t.dimension] || 0) + 1;
    return {
      name: c.name, category: c.category, subcategory: c.subcategory, isEmerging: c.isEmerging,
      traitCount: DIMS.reduce((s, d) => s + dims[d], 0), dims,
      hasApt: dims.APTITUDE > 0, hasWe: dims.WORK_ENVIRONMENT > 0,
      missing: DIMS.filter((d) => !dims[d]),
      pathwayCount: c._count.careerEducationPathways,
    };
  });

  const traitRowsTotal = active.reduce((s, c) => s + c.traits.length, 0);
  const traitRowsByDim = {};
  for (const c of careers) for (const t of c.traits) traitRowsByDim[t.dimension] = (traitRowsByDim[t.dimension] || 0) + 1;

  // unique values per dimension (active careers only)
  const uniqueByDim = Object.fromEntries(DIMS.map((d) => [d, new Set()]));
  for (const c of active) for (const t of c.traits) uniqueByDim[t.dimension].add(t.value);
  const uniqueCounts = Object.fromEntries(DIMS.map((d) => [d, uniqueByDim[d].size]));

  // path coverage
  const noPathway = perCareer.filter((c) => c.pathwayCount === 0).map((c) => c.name);

  // category counts
  const famCounts = {};
  for (const c of active) famCounts[c.category || "Uncategorized"] = (famCounts[c.category || "Uncategorized"] || 0) + 1;

  // malformed / missing metadata checks on ACTIVE careers
  const r = {};
  const problems = {
    missingShortDescription: active.filter((c) => !c.shortDescription?.trim()).map((c) => c.name),
    missingIntroduction: active.filter((c) => !c.introduction?.trim()).map((c) => c.name),
    missingWorkNatureDesc: active.filter((c) => !c.workNatureDesc?.trim()).map((c) => c.name),
    missingDemandLevel: active.filter((c) => !c.demandLevel?.trim()).map((c) => c.name),
    missingSalaryEntry: active.filter((c) => !c.salaryEntry?.trim()).map((c) => c.name),
    missingSalarySenior: active.filter((c) => !c.salarySenior?.trim()).map((c) => c.name),
    missingJobGrowth: active.filter((c) => !c.jobGrowth?.trim()).map((c) => c.name),
    missingCategory: active.filter((c) => !c.category?.trim()).map((c) => c.name),
    missingTitle: active.filter((c) => !c.title?.trim()).map((c) => c.name),
    emptyTechnicalSkills: active.filter((c) => c.technicalSkills.length === 0).map((c) => c.name),
    emptySoftSkills: active.filter((c) => c.softSkills.length === 0).map((c) => c.name),
    emptyInterests: active.filter((c) => c.interests.length === 0).map((c) => c.name),
    emptyPersonality: active.filter((c) => c.personalityTraits.length === 0).map((c) => c.name),
    emptyRecommendedDegrees: active.filter((c) => c.recommendedDegrees.length === 0).map((c) => c.name),
    emptyRecommendedSubjects: active.filter((c) => c.recommendedSubjects.length === 0).map((c) => c.name),
    salaryCurrencyNotINR: active.filter((c) => c.salaryCurrency !== "INR").map((c) => `${c.name} [${c.salaryCurrency}]`),
  };
  r.problems = problems;

  // ---- exact normalized (case-insensitive) duplicate slugs ----
  const report = {
    generatedAt: new Date().toISOString(),
    careerCounts: { total: careers.length, active: active.length, inactive: inactive.length },
    familyCounts: Object.fromEntries(Object.entries(famCounts).sort((a, b) => a[0].localeCompare(b[0]))),
    traitRows: {
      total: traitRowsTotal,
      byDimension: traitRowsByDim,
      uniqueValuesByDimension: uniqueCounts,
    },
    coverage: {
      careersWithZeroTraits: perCareer.filter((c) => c.traitCount === 0).length,
      careersWithoutAptitude: perCareer.filter((c) => !c.hasApt).length,
      careersWithoutWorkEnv: perCareer.filter((c) => !c.hasWe).length,
      careersWithoutPathway: noPathway.length,
      noPathwayNames: noPathway,
      careersMissingAnyDim: perCareer.filter((c) => c.missing.length > 0).map((c) => `${c.name} [${c.missing.join(",")}]`),
    },
    duplicates: {
      caseInsensitiveNames: caseInsensitiveDupes,
      slugDupes: slugDupes,
      exactNameCount: 0,
    },
    problems,
    zeroTraitCareers: perCareer.filter((c) => c.traitCount === 0).map((c) => c.name),
  };

  const out = path.join(__dirname, "phase16e1-baseline.json");
  fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log("written:", out);

  // ---- console summary ----
  console.log(`total=${careers.length} active=${active.length} inactive=${inactive.length}`);
  console.log(`traitRows=${traitRowsTotal} byDim=`, JSON.stringify(traitRowsByDim));
  console.log(`zeroTrait=${report.coverage.careersWithZeroTraits} noApt=${report.coverage.careersWithoutAptitude} noWE=${report.coverage.careersWithoutWorkEnv} noPathway=${report.coverage.careersWithoutPathway}`);
  console.log(`caseInsensitiveNameDupes=${caseInsensitiveDupes.length} slugDupes=${slugDupes.length}`);
  for (const [k, v] of Object.entries(problems)) {
    if (v.length) console.log(`PROBLEM ${k}=${v.length} :: ${v.slice(0, 20).join(", ")}`);
    else console.log(`ok      ${k}=0`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());