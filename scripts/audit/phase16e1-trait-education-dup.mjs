import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const APTITUDE = new Set(["logical_reasoning","logical_mathematical","pattern_recognition","attention_to_detail","visual_spatial","linguistic","interpersonal","intrapersonal","naturalist","emotional_intelligence","bodily_kinesthetic","musical","existential","situational_judgment","self_awareness"]);
const WORKENV = new Set(["collaborative_preference","independent_preference","prefers_structure","prefers_autonomy","prefers_quiet","prefers_formal_setting","self_driven","prefers_background_sound","prefers_bright_light","prefers_soft_lighting","prefers_warm_environment","prefers_cool_environment","prefers_relaxed_setting","benefits_from_intake","needs_mobility","morning_person","evening_person","teacher_guided"]);

async function main() {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, category: true, subcategory: true, title: true, isEmerging: true,
      shortDescription: true, introduction: true,
      technicalSkills: true, softSkills: true, interests: true, personalityTraits: true,
      recommendedDegrees: true, recommendedSubjects: true,
      traits: { select: { dimension: true, value: true, weight: true } },
      careerEducationPathways: {
        include: { degree: { select: { name: true, educationLevel: true, isActive: true } }, specialization: { select: { name: true } }, subject: { select: { name: true } } },
      },
    },
  });

  // ========== TRAIT QUALITY ==========
  const traitsByDim = {};
  for (const d of ["INTEREST","PERSONALITY","APTITUDE","SUBJECT","SKILL","EDUCATION","WORK_ENVIRONMENT"]) traitsByDim[d] = new Map();
  for (const c of careers) {
    for (const t of c.traits) {
      if (!traitsByDim[t.dimension]) traitsByDim[t.dimension] = new Map();
      const m = traitsByDim[t.dimension];
      m.set(t.value, (m.get(t.value) || 0) + 1);
    }
  }
  const traitValueCounts = Object.fromEntries(Object.entries(traitsByDim).map(([d, m]) => [d, Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]))]));

  // generic traits: appear in >= 15% of careers or >= 40 careers
  const genericTraits = {};
  for (const [d, m] of Object.entries(traitsByDim)) {
    genericTraits[d] = [...m.entries()].filter(([, n]) => n >= 40 || n >= careers.length * 0.15).map(([v, n]) => `${v} (${n})`);
  }

  // duplicate trait values within a single career+dimension (should be impossible due to unique constraint, but check)
  const intraCareerDupeTraits = [];
  for (const c of careers) {
    const seen = new Set();
    for (const t of c.traits) {
      const k = `${t.dimension}|${t.value.toLowerCase()}`;
      if (seen.has(k)) intraCareerDupeTraits.push(`${c.name}: ${t.dimension}=${t.value}`);
      seen.add(k);
    }
  }

  // unsupported APTITUDE / WORK_ENV values (non-canonical)
  const unsupported = { APTITUDE: [], WORK_ENVIRONMENT: [] };
  for (const c of careers) {
    for (const t of c.traits) {
      if (t.dimension === "APTITUDE" && !APTITUDE.has(t.value)) unsupported.APTITUDE.push(`${c.name}: ${t.value}`);
      if (t.dimension === "WORK_ENVIRONMENT" && !WORKENV.has(t.value)) unsupported.WORK_ENVIRONMENT.push(`${c.name}: ${t.value}`);
    }
  }

  // apt/we coverage summary
  const aptWeCoverage = {};
  for (const c of careers) {
    const apt = c.traits.filter((t) => t.dimension === "APTITUDE").map((t) => t.value);
    const we = c.traits.filter((t) => t.dimension === "WORK_ENVIRONMENT").map((t) => t.value);
    aptWeCoverage[c.name] = { apt, we };
  }

  // ========== EDUCATION QUALITY ==========
  // invalid degree tokens / malformed patterns
  const MALFORMED_PATTERNS = ["ANY degree", "BCA/MCA", "B.Tech/B.E.", "B.Tech / B.E.", "MCA/BCA", "B.E./B.Tech", "B.E. / B.Tech", "ANY DEGREE"];
  const malformedDegreeTokens = [];
  const contradictoryPaths = [];
  for (const c of careers) {
    for (const rd of c.recommendedDegrees) {
      if (MALFORMED_PATTERNS.some((m) => rd.toUpperCase().includes(m))) malformedDegreeTokens.push(`${c.name}: "${rd}"`);
    }
    const pathDegrees = c.careerEducationPathways.map((p) => p.degree?.name).filter(Boolean);
    const pathSubjects = c.careerEducationPathways.map((p) => p.subject?.name).filter(Boolean);
    // pathway pointing at inactive degrees
    for (const p of c.careerEducationPathways) {
      if (p.degree && p.degree.isActive === false) contradictoryPaths.push(`${c.name}: inactive degree "${p.degree.name}"`);
    }
  }

  // careers with no DEGREE_PATHWAY
  const noDegreePath = careers.filter((c) => !c.careerEducationPathways.some((p) => p.type === "DEGREE_PATHWAY")).map((c) => c.name);

  // ========== NEAR-DUPLICATE NAMES ==========
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  const tokens = (s) => new Set(normalize(s).split(" ").filter((w) => w.length > 2));
  const nearDupes = [];
  const names = careers.map((c) => ({ name: c.name, slug: c.slug, norm: normalize(c.name), title: normalize(c.title) }));
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i], b = names[j];
      const ta = tokens(a.name), tb = tokens(b.name);
      const inter = [...ta].filter((w) => tb.has(w)).length;
      const union = new Set([...ta, ...tb]).size;
      const jac = union ? inter / union : 0;
      // title/name cross-check
      let titleJ = 0;
      if (a.title && normalize(a.title) !== a.norm) {
        const tA = tokens(a.title);
        const inter2 = [...tA].filter((w) => tb.has(w)).length;
        const u2 = new Set([...tA, ...tb]).size;
        titleJ = u2 ? inter2 / u2 : 0;
      }
      const best = Math.max(jac, titleJ);
      if (best >= 0.72) nearDupes.push({ a: a.name, b: b.name, jac: +best.toFixed(2), sameFamily: a.slug.slice(0,1) === b.slug.slice(0,1) });
    }
  }
  // dedupe pairs
  const seenPair = new Set();
  const uniqueNearDupes = nearDupes.filter((p) => {
    const k = [p.a, p.b].sort().join("|");
    if (seenPair.has(k)) return false;
    seenPair.add(k);
    return true;
  }).sort((x, y) => y.jac - x.jac);

  // ========== FAMILY COUNTS ==========
  const fam = {};
  for (const c of careers) fam[c.category || "Uncategorized"] = (fam[c.category || "Uncategorized"] || 0) + 1;

  const report = {
    generatedAt: new Date().toISOString(),
    careerCount: careers.length,
    traitValueCounts,
    genericTraits,
    intraCareerDupeTraits,
    unsupportedCanonicalValues: { APTITUDE: unsupported.APTITUDE, WORK_ENVIRONMENT: unsupported.WORK_ENVIRONMENT },
    aptWeCoverageCounts: {
      withApt: careers.filter((c) => c.traits.some((t) => t.dimension === "APTITUDE")).length,
      withWe: careers.filter((c) => c.traits.some((t) => t.dimension === "WORK_ENVIRONMENT")).length,
    },
    education: {
      malformedDegreeTokens,
      inactiveDegreePaths: contradictoryPaths,
      noDegreePathway: noDegreePath,
      totalPathwayRows: careers.reduce((s, c) => s + c.careerEducationPathways.length, 0),
    },
    nearDuplicates: uniqueNearDupes,
    familyCounts: Object.fromEntries(Object.entries(fam).sort((a, b) => a[0].localeCompare(b[0]))),
  };
  fs.writeFileSync(path.join(__dirname, "phase16e1-trait-education-dup.json"), JSON.stringify(report, null, 2), "utf8");
  console.log("written phase16e1-trait-education-dup.json");
  console.log("careers:", careers.length);
  console.log("intraCareerDupeTraits:", intraCareerDupeTraits.length);
  console.log("unsupported APTITUDE:", unsupported.APTITUDE.length, unsupported.APTITUDE.slice(0,10));
  console.log("unsupported WORK_ENV:", unsupported.WORK_ENVIRONMENT.length, unsupported.WORK_ENVIRONMENT.slice(0,10));
  console.log("malformedDegreeTokens:", malformedDegreeTokens.length, malformedDegreeTokens.slice(0,10));
  console.log("inactiveDegreePaths:", contradictoryPaths.length);
  console.log("noDegreePathway:", noDegreePath.length);
  console.log("nearDupes(>=0.72):", uniqueNearDupes.length);
  console.log("generic traits:");
  for (const [d, list] of Object.entries(genericTraits)) console.log("  ", d, "->", list.join(" | "));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());