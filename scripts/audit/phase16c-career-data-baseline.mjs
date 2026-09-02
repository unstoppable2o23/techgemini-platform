/**
 * Phase 16C section 1 — career data baseline audit.
 * Computes per-career CareerTrait and enrichment-field counts for all active
 * careers and writes:
 *   - scripts/audit/phase16c-career-data-baseline.json  (per-career + summary)
 *   - scripts/audit/phase16c-career-data-baseline.md    (human-readable)
 * Read-only. Does not modify any data.
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const DIMS = ["INTEREST", "PERSONALITY", "APTITUDE", "SUBJECT", "SKILL", "EDUCATION", "WORK_ENVIRONMENT"];

async function main() {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      isEmerging: true,
      technicalSkills: true,
      softSkills: true,
      interests: true,
      personalityTraits: true,
      recommendedSubjects: true,
      recommendedDegrees: true,
      traits: { select: { dimension: true } },
      _count: { select: { careerEducationPathways: true } },
    },
  });

  const perCareer = [];
  const dimSummary = Object.fromEntries(DIMS.map((d) => [d, 0]));
  let careersWithNoTraits = 0;
  let careersMissingInterests = 0;
  let careersMissingPersonality = 0;
  let careersMissingSubjects = 0;
  let careersMissingDegrees = 0;
  let careersMissingPathways = 0;

  for (const c of careers) {
    const traitCounts = Object.fromEntries(DIMS.map((d) => [d, 0]));
    for (const t of c.traits) traitCounts[t.dimension] = (traitCounts[t.dimension] || 0) + 1;
    for (const d of DIMS) dimSummary[d] += traitCounts[d];

    if (traitCounts.INTEREST + traitCounts.PERSONALITY + traitCounts.APTITUDE + traitCounts.SUBJECT + traitCounts.SKILL + traitCounts.EDUCATION + traitCounts.WORK_ENVIRONMENT === 0) careersWithNoTraits++;
    if (traitCounts.INTEREST === 0 && c.interests.length === 0) careersMissingInterests++;
    if (traitCounts.PERSONALITY === 0 && c.personalityTraits.length === 0) careersMissingPersonality++;
    if (traitCounts.SUBJECT === 0 && c.recommendedSubjects.length === 0) careersMissingSubjects++;
    if (traitCounts.EDUCATION === 0 && c.recommendedDegrees.length === 0) careersMissingDegrees++;
    if (c._count.careerEducationPathways === 0) careersMissingPathways++;

    perCareer.push({
      name: c.name,
      slug: c.slug,
      category: c.category,
      isEmerging: c.isEmerging,
      counts: {
        careerTraitTotal: DIMS.reduce((s, d) => s + traitCounts[d], 0),
        INTEREST: traitCounts.INTEREST,
        PERSONALITY: traitCounts.PERSONALITY,
        APTITUDE: traitCounts.APTITUDE,
        SUBJECT: traitCounts.SUBJECT,
        SKILL: traitCounts.SKILL,
        EDUCATION: traitCounts.EDUCATION,
        WORK_ENVIRONMENT: traitCounts.WORK_ENVIRONMENT,
        technicalSkills: c.technicalSkills.length,
        softSkills: c.softSkills.length,
        interests: c.interests.length,
        personalityTraits: c.personalityTraits.length,
        recommendedSubjects: c.recommendedSubjects.length,
        recommendedDegrees: c.recommendedDegrees.length,
        educationPathways: c._count.careerEducationPathways,
      },
    });
  }

  perCareer.sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.name.localeCompare(b.name));

  const totalTraits = Object.values(dimSummary).reduce((s, n) => s + n, 0);
  const summary = {
    careerCount: careers.length,
    careerTraitTotal: totalTraits,
    dimensionTotals: dimSummary,
    careersWithZeroCareerTraits: careersWithNoTraits,
    careersWithNoInterests: careersMissingInterests,
    careersWithNoPersonalityTraits: careersMissingPersonality,
    careersWithNoSubjects: careersMissingSubjects,
    careersWithNoDegrees: careersMissingDegrees,
    careersWithNoEducationPathways: careersMissingPathways,
  };

  const jsonPath = path.join(__dirname, "phase16c-career-data-baseline.json");
  const mdPath = path.join(__dirname, "phase16c-career-data-baseline.md");
  fs.writeFileSync(jsonPath, JSON.stringify({ summary, careers: perCareer }, null, 2), "utf8");

  const lines = [
    "# Phase 16C career data baseline",
    "",
    `Active careers audited: **${summary.careerCount}**`,
    `Total CareerTrait rows: **${totalTraits}**`,
    "| Dimension | CareerTrait rows |",
    "|---|---|",
    ...DIMS.map((d) => `| ${d} | ${dimSummary[d]} |`),
    "",
    "| Flag | Count |",
    "|---|---|",
    `| Careers with ZERO CareerTrait rows | ${careersWithNoTraits} |`,
    `| Careers with no INTEREST (array + trait) | ${careersMissingInterests} |`,
    `| Careers with no PERSONALITY (array + trait) | ${careersMissingPersonality} |`,
    `| Careers with no SUBJECT (array + trait) | ${careersMissingSubjects} |`,
    `| Careers with no EDUCATION (array + trait) | ${careersMissingDegrees} |`,
    `| Careers with no education pathways | ${careersMissingPathways} |`,
    "",
    "## Per-career counts",
    "",
    "| Career | Category | TT | INT | PER | APT | SUB | SKL | EDU | WE | tech | soft | int | per | subj | deg | path |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const c of perCareer) {
    const k = c.counts;
    lines.push(
      `| ${c.name} | ${c.category ?? ""} | ${k.careerTraitTotal} | ${k.INTEREST} | ${k.PERSONALITY} | ${k.APTITUDE} | ${k.SUBJECT} | ${k.SKILL} | ${k.EDUCATION} | ${k.WORK_ENVIRONMENT} | ${k.technicalSkills} | ${k.softSkills} | ${k.interests} | ${k.personalityTraits} | ${k.recommendedSubjects} | ${k.recommendedDegrees} | ${k.educationPathways} |`
    );
  }
  fs.writeFileSync(mdPath, lines.join("\n"), "utf8");

  console.log(`Baseline written: ${jsonPath}`);
  console.log(`Baseline written: ${mdPath}`);
  console.log(`Careers: ${summary.careerCount} | Traits: ${totalTraits}`);
  console.log(`APTITUDE rows: ${dimSummary.APTITUDE} | WORK_ENVIRONMENT rows: ${dimSummary.WORK_ENVIRONMENT}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());