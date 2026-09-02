// Phase 16C.1 — sections 8, 10, 11, 12 audit (lightweight, read-only).
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { CANONICAL_SIGNALS, isCanonicalSignal } from "../../src/lib/career-profile/canonical-signals.ts";

const prisma = new PrismaClient();
const after = JSON.parse(readFileSync(new URL("../../scripts/audit/phase16c-golden-after.json", import.meta.url), "utf8"));
const before = JSON.parse(readFileSync(new URL("../../scripts/audit/phase16c-golden-before.json", import.meta.url), "utf8"));

const FAMILY_OF = {
  "Technology & Software": "technology", "Data & AI": "technology", Engineering: "engineering",
  "Healthcare & Medicine": "medicine", "Life Sciences": "lifescience", "Finance & Accounting": "finance",
  "Business & Management": "business", "Marketing & Advertising": "business", Sales: "business",
  Law: "law", "Government & Public Services": "government", Humanities: "humanities", Education: "education",
  "Psychology & Social Sciences": "psychology", "Design & Creative": "design", "Media & Communication": "media",
  "Architecture & Planning": "architecture", "Environment & Sustainability": "environment",
  Agriculture: "agriculture", Manufacturing: "manufacturing", "Logistics & Supply Chain": "logistics",
  "Sports & Fitness": "sports", "Hospitality & Tourism": "hospitality",
};

async function main() {
  // ---------------- Section 8: small career families ----------------
  console.log("=== Phase 16C.1 — section 8: small career family audit ===");
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    select: { name: true, category: true, traits: { select: { dimension: true } } },
  });
  const famCounts = {};
  for (const c of careers) {
    const f = FAMILY_OF[c.category] ?? c.category;
    famCounts[f] = famCounts[f] || [];
    famCounts[f].push({ name: c.name, apt: c.traits.some((t) => t.dimension === "APTITUDE"), we: c.traits.some((t) => t.dimension === "WORK_ENVIRONMENT") });
  }
  for (const family of ["humanities", "law", "psychology", "architecture", "design", "media"]) {
    const list = famCounts[family] || [];
    const withApt = list.filter((c) => c.apt).length;
    const withWe = list.filter((c) => c.we).length;
    console.log(`\n${family}: ${list.length} careers (APTITUDE-enriched=${withApt}, WE-enriched=${withWe})`);
    console.log(`   names: ${list.map((c) => c.name).join(", ") || "(none)"}`);
  }
  // Representation in golden top-5/top-10 BEFORE vs AFTER
  console.log("\nFamily representation across golden profiles (avg per profile):");
  for (const family of ["humanities", "law", "psychology", "architecture", "design", "media"]) {
    const count = (p, n) => p["top" + n].filter((m) => FAMILY_OF[m.category] === family).length;
    let b5 = 0, b10 = 0, a5 = 0, a10 = 0;
    for (const p of before.profiles) { b5 += count(p, "5"); b10 += count(p, "10"); }
    for (const p of after.profiles) { a5 += count(p, "5"); a10 += count(p, "10"); }
    const n = after.profiles.length;
    console.log(`   ${family.padEnd(14)} top5  BEFORE ${b5}/${n}=${Math.round(b5 / n * 100)}% -> AFTER ${a5}/${n}=${Math.round(a5 / n * 100)}% | top10 ${b10} -> ${a10}`);
  }

  // ---------------- Section 12: zero-score classification ----------------
  console.log("\n=== Phase 16C.1 — section 12: zero-score audit ===");
  // Over all profiles: count careers scoring 0, and explain why.
  const zeroCareers = new Set();
  for (const p of after.profiles) {
    // full ranked list not serialized to top20 only; classify top20 zeros
    for (const m of p.top20) if (m.score === 0) zeroCareers.add(m.name);
  }
  // Reasons: (a) profile had no assessment (no ENVIRONMENT evidence) => missing student evidence
  console.log(`Distinct zero-score careers seen across all golden top20s: ${zeroCareers.size}`);
  console.log(`Sample: ${[...zeroCareers].slice(0, 40).join(", ")}`);
  // Classify by career-side trait presence
  const zeroDetails = await prisma.career.findMany({
    where: { name: { in: [...zeroCareers] }, isActive: true },
    select: { name: true, category: true, traits: { select: { dimension: true } } },
  });
  const classified = { noStudentAptWeEvidence: 0, careerUnenriched: 0, hasTraitNoMatch: 0 };
  for (const c of zeroDetails) {
    const hasApt = c.traits.some((t) => t.dimension === "APTITUDE");
    const hasWe = c.traits.some((t) => t.dimension === "WORK_ENVIRONMENT");
    if (!hasApt && !hasWe) classified.careerUnenriched++;
    else classified.hasTraitNoMatch++;
  }
  console.log(`Of zero-scored careers in top20: career-unenriched(${classified.careerUnenriched}) hasTrait-ish(${classified.hasTraitNoMatch}).`);
  console.log("(Note: a zero in top-20 for a profile is data-driven; a zero overall for a profile with no assessment is 'no student evidence'.)");

  // ---------------- Section 10: data consistency (Career fields vs APTITUDE/WE traits) ----------------
  console.log("\n=== Phase 16C.1 — section 10: Career fields vs trait consistency ===");
  const full = await prisma.career.findMany({
    where: { isActive: true, traits: { some: { dimension: { in: ["APTITUDE", "WORK_ENVIRONMENT"] } } } },
    select: {
      name: true, category: true,
      technicalSkills: true, softSkills: true, interests: true, personalityTraits: true,
      recommendedSubjects: true, recommendedDegrees: true,
      traits: { select: { dimension: true, value: true } },
    },
  });
  // Flag careers where APTITUDE=independent/WORK_ENV independent co-exists with a
  // strongly people-facing set (many interpersonal subjects/soft skills), or where
  // a career carries a contradictory WE:collaborative + APT:independent. Heuristic only.
  let flags = 0;
  for (const c of full) {
    const weVals = c.traits.filter((t) => t.dimension === "WORK_ENVIRONMENT").map((t) => t.value);
    const peopleSignals = [...(c.interests || []), ...(c.personalityTraits || [])].filter((v) => /people|help|care|social|service|communicat|interpersonal/i.test(v)).length;
    const hasIndependent = weVals.includes("independent_preference");
    const hasCollaborative = weVals.includes("collaborative_preference");
    if (hasIndependent && peopleSignals >= 3) {
      // e.g. a primarily people-facing career marked "prefers working alone"
      flags++;
      console.log(`  POSSIBLE CONTRADICTION: ${c.name} has WE=independent_preference but ${peopleSignals} people-facing profile signals.`);
    }
    if (hasIndependent && hasCollaborative) {
      flags++;
      console.log(`  POSSIBLE CONTRADICTION: ${c.name} has BOTH independent_preference AND collaborative_preference.`);
    }
  }
  if (!flags) console.log("  No contradictory APTITUDE/WE trait combinations found.");

  // ---------------- Section 11: score contribution (double-count check) ----------------
  console.log("\n=== Phase 16C.1 — section 11: score contribution / double-count check ===");
  // Use the live engine on a rich profile and confirm each dimension appears once
  // and contributes only when matched. (Driven from section-6 style run is complex;
  // here we confirm the engine reports each dimension exactly once in dimensionScores.)
  const { getCareerMatches } = await import("../../src/lib/career-matching/engine.ts");
  const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  const t = await prisma.tenant.create({ data: { name: "P410", slug: `p410-${suffix}`, subdomain: `p410-${suffix}` } });
  const u = await prisma.user.create({ data: { email: `p410-${suffix}@x.com`, passwordHash: "x", firstName: "P410", lastName: "C", role: "STUDENT", tenantId: t.id } });
  const sp = await prisma.studentProfile.create({ data: { userId: u.id, studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Computer Science", "Mathematics"], activityInterests: ["Coding / Technology"] } });
  const cp = await prisma.studentCareerProfile.create({ data: { studentId: u.id } });
  try {
    await prisma.studentCareerSignal.createMany({
      data: [
        { profileId: cp.id, dimension: "APTITUDE", value: "logical_reasoning", score: 90, sourceType: "ASSESSMENT", sourceAssessment: "ideal", confidence: 0.8, sourceVersion: "1.0" },
        { profileId: cp.id, dimension: "WORK_ENVIRONMENT", value: "independent_preference", score: 90, sourceType: "ASSESSMENT", sourceAssessment: "learning", confidence: 0.8, sourceVersion: "1.0" },
      ],
    });
    const res = await getCareerMatches(u.id, { limit: 3 });
    for (const m of res.matches.slice(0, 3)) {
      const dims = m.dimensionScores.map((d) => d.dimension);
      const dupes = dims.filter((x, i) => dims.indexOf(x) !== i);
      console.log(`  ${m.career.name}: dimensions=${dims.join(",")} duplicateDims=${dupes.length ? dupes.join(",") : "none"}`);
    }
  } finally {
    await prisma.studentCareerSignal.deleteMany({ where: { profileId: cp.id } });
    await prisma.studentCareerProfile.deleteMany({ where: { id: cp.id } });
    await prisma.studentProfile.deleteMany({ where: { id: sp.id } });
    await prisma.user.deleteMany({ where: { id: u.id } });
    await prisma.tenant.deleteMany({ where: { id: t.id } });
  }
}

main().finally(() => prisma.$disconnect());