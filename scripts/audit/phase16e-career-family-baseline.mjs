/**
 * Phase 16E — Section 2: career catalogue baseline audit.
 *
 * Groups all ACTIVE careers by category/family and computes trait, dimension,
 * education-pathway and emerging coverage, plus near-duplicate name analysis.
 * Produces:
 *   - scripts/audit/phase16e-career-family-baseline.json
 *   - scripts/audit/phase16e-career-family-baseline.md
 *
 * READ-ONLY. Selects only Career / CareerTrait / CareerEducationPathway.
 * Never touches University / IndianInstitution / Program.
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const DIMS = ["INTEREST", "PERSONALITY", "APTITUDE", "SUBJECT", "SKILL", "EDUCATION", "WORK_ENVIRONMENT"];

function normalizeName(n) {
  return n
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      title: true,
      category: true,
      subcategory: true,
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

  // ---- per-career dimension counts ----
  const perCareer = [];
  for (const c of careers) {
    const dims = Object.fromEntries(DIMS.map((d) => [d, 0]));
    for (const t of c.traits) dims[t.dimension] = (dims[t.dimension] || 0) + 1;
    perCareer.push({
      id: c.id,
      name: c.name,
      slug: c.slug,
      title: c.title,
      category: c.category,
      subcategory: c.subcategory,
      isEmerging: c.isEmerging,
      traitCount: DIMS.reduce((s, d) => s + dims[d], 0),
      dims,
      hasAptitude: dims.APTITUDE > 0,
      hasWorkEnv: dims.WORK_ENVIRONMENT > 0,
      hasInterest: dims.INTEREST > 0,
      hasPersonality: dims.PERSONALITY > 0,
      hasSubject: dims.SUBJECT > 0,
      hasSkill: dims.SKILL > 0,
      hasEducation: dims.EDUCATION > 0,
      hasPathway: c._count.careerEducationPathways > 0,
      metadata: {
        technicalSkills: c.technicalSkills.length,
        softSkills: c.softSkills.length,
        interests: c.interests.length,
        personalityTraits: c.personalityTraits.length,
        recommendedSubjects: c.recommendedSubjects.length,
        recommendedDegrees: c.recommendedDegrees.length,
      },
    });
  }

  // ---- group by family (category) ----
  const families = {};
  for (const c of perCareer) {
    const fam = c.category || "Uncategorized";
    if (!families[fam]) families[fam] = [];
    families[fam].push(c);
  }

  const familySummary = {};
  for (const [fam, list] of Object.entries(families)) {
    list.sort((a, b) => a.name.localeCompare(b.name));
    familySummary[fam] = {
      careerCount: list.length,
      withCareerTraits: list.filter((c) => c.traitCount > 0).length,
      withAptitude: list.filter((c) => c.hasAptitude).length,
      withWorkEnv: list.filter((c) => c.hasWorkEnv).length,
      withInterest: list.filter((c) => c.hasInterest).length,
      withPersonality: list.filter((c) => c.hasPersonality).length,
      withSubject: list.filter((c) => c.hasSubject).length,
      withSkill: list.filter((c) => c.hasSkill).length,
      withEducation: list.filter((c) => c.hasEducation).length,
      withPathway: list.filter((c) => c.hasPathway).length,
      emerging: list.filter((c) => c.isEmerging).length,
      careers: list.map((c) => c.name),
    };
  }

  // ---- near-duplicate name detection ----
  // Compare normalized names with each other using token overlap.
  const duplicateGroups = [];
  const normalized = perCareer.map((c) => ({ c, norm: normalizeName(c.name) }));
  const seen = new Set();
  for (let i = 0; i < normalized.length; i++) {
    if (seen.has(i)) continue;
    const group = [normalized[i]];
    for (let j = i + 1; j < normalized.length; j++) {
      if (seen.has(j)) continue;
      if (isNearDuplicate(normalized[i].norm, normalized[j].norm)) {
        group.push(normalized[j]);
        seen.add(j);
      }
    }
    if (group.length > 1) {
      seen.add(i);
      duplicateGroups.push(group.map((g) => g.c.name));
    }
  }

  // exact normalized-name duplicates (excluding plural/singular which near-dup catches)
  const exactNorm = {};
  for (const { c, norm } of normalized) {
    (exactNorm[norm] ||= []).push(c.name);
  }
  const exactDupes = Object.values(exactNorm).filter((v) => v.length > 1);

  const aggregate = {
    careerCountBefore: careers.length,
    totalCareerTraitRows: perCareer.reduce((s, c) => s + c.traitCount, 0),
    careersWithZeroTraits: perCareer.filter((c) => c.traitCount === 0).length,
    careersWithNoAptitude: perCareer.filter((c) => !c.hasAptitude).length,
    careersWithNoWorkEnv: perCareer.filter((c) => !c.hasWorkEnv).length,
    careersWithNoPathway: perCareer.filter((c) => !c.hasPathway).length,
    emergingCareers: perCareer.filter((c) => c.isEmerging).length,
    familyCount: Object.keys(familySummary).length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    aggregate,
    familySummary: sortFamilies(familySummary),
    nearDuplicateGroups: duplicateGroups,
    exactNormalizedDuplicates: exactDupes,
    careers: perCareer,
  };

  const jsonPath = path.join(__dirname, "phase16e-career-family-baseline.json");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");

  // ---- markdown ----
  const L = [];
  L.push("# Phase 16E — Career family baseline (before expansion)");
  L.push("");
  L.push(`Generated ${report.generatedAt}`);
  L.push(`Active careers: **${aggregate.careerCountBefore}**`);
  L.push(`Total CareerTrait rows: **${aggregate.totalCareerTraitRows}**`);
  L.push("");
  L.push("## Aggregate coverage");
  L.push("| Metric | Count |");
  L.push("|---|---|");
  L.push(`| Careers with zero CareerTrait rows | ${aggregate.careersWithZeroTraits} |`);
  L.push(`| Careers with no APTITUDE trait | ${aggregate.careersWithNoAptitude} |`);
  L.push(`| Careers with no WORK_ENVIRONMENT trait | ${aggregate.careersWithNoWorkEnv} |`);
  L.push(`| Careers with no education pathway | ${aggregate.careersWithNoPathway} |`);
  L.push(`| Emerging careers | ${aggregate.emergingCareers} |`);
  L.push(`| Distinct families (categories) | ${aggregate.familyCount} |`);
  L.push("");
  L.push("## Per-family coverage");
  L.push("| Family | Careers | Traits | APT | WE | INT | PER | SUB | SKL | EDU | Path | Emerg |");
  L.push("|---|---|---|---|---|---|---|---|---|---|---|---|");
  const famKeys = Object.keys(report.familySummary).sort();
  for (const f of famKeys) {
    const s = report.familySummary[f];
    L.push(`| ${f} | ${s.careerCount} | ${s.withCareerTraits} | ${s.withAptitude} | ${s.withWorkEnv} | ${s.withInterest} | ${s.withPersonality} | ${s.withSubject} | ${s.withSkill} | ${s.withEducation} | ${s.withPathway} | ${s.emerging} |`);
  }
  L.push("");
  L.push("## Near-duplicate name groups");
  L.push("| Group |");
  L.push("|---|");
  if (report.nearDuplicateGroups.length === 0) L.push("| (none) |");
  else for (const g of report.nearDuplicateGroups) L.push(`| ${g.join(" , ")} |`);
  L.push("");
  L.push("## Exact normalized-name duplicates");
  L.push("| Group |");
  L.push("|---|");
  if (report.exactNormalizedDuplicates.length === 0) L.push("| (none) |");
  else for (const g of report.exactNormalizedDuplicates) L.push(`| ${g.join(" , ")} |`);

  const mdPath = path.join(__dirname, "phase16e-career-family-baseline.md");
  fs.writeFileSync(mdPath, L.join("\n"), "utf8");

  console.log(`Baseline written: ${jsonPath}`);
  console.log(`Baseline written: ${mdPath}`);
  console.log(`Careers: ${aggregate.careerCountBefore} | Families: ${aggregate.familyCount}`);
  console.log(`Zero-trait careers: ${aggregate.careersWithZeroTraits}`);
  console.log(`No-APTITUDE: ${aggregate.careersWithNoAptitude} | No-WORK_ENV: ${aggregate.careersWithNoWorkEnv}`);
  console.log(`Near-duplicate groups: ${report.nearDuplicateGroups.length}`);
}

function isNearDuplicate(a, b) {
  const wa = a.split(" ").filter((w) => w.length > 2);
  const wb = b.split(" ").filter((w) => w.length > 2);
  if (!wa.length || !wb.length) return false;
  const inter = wa.filter((w) => wb.includes(w)).length;
  const union = new Set([...wa, ...wb]).size;
  const jac = inter / union;
  // plural/singular equivalent: same core word differences
  const coreA = wa.filter((w) => !w.endsWith("s") || !wb.includes(w.slice(0, -1))).length;
  const coreB = wb.filter((w) => !w.endsWith("s") || !wa.includes(w.slice(0, -1))).length;
  if (jac >= 0.75) return true;
  // e.g. software-engineering vs software-engineer: word sets {software,engineering} / {software,engineer}
  const singularA = wa.map((w) => (w.endsWith("s") ? w.slice(0, -1) : w));
  const singularB = wb.map((w) => (w.endsWith("s") ? w.slice(0, -1) : w));
  const inter2 = singularA.filter((w) => singularB.includes(w)).length;
  const union2 = new Set([...singularA, ...singularB]).size;
  const jac2 = inter2 / union2;
  return jac2 >= 0.75;
}

function sortFamilies(obj) {
  const out = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
