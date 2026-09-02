// Phase 16C.1 — section 9: preferred-career alias audit.
// For the 11 named professional terms, verify against the live active career
// catalog: how each resolves, uniqueness, ambiguity, and no unrelated boost.
import { PrismaClient } from "@prisma/client";
import { resolvePreferredCareer } from "../../src/lib/career-matching/preferred-career.ts";
import { normalizeForMatch } from "../../src/lib/career-matching/config.ts";

const prisma = new PrismaClient();

const TERMS = [
  "Doctor", "Architect", "Software Engineer", "Data Scientist", "Civil Engineer",
  "Accountant", "Psychologist", "Biotechnologist", "Management Consultant", "Pharmacist", "Lawyer",
];

async function main() {
  const careers = await prisma.career.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const byName = new Map();
  for (const c of careers) byName.set(normalizeForMatch(c.name), c);

  console.log("=== Phase 16C.1 — section 9: preferred-career alias audit ===");
  console.log(`Active careers in catalog: ${careers.length}\n`);

  for (const term of TERMS) {
    const r = resolvePreferredCareer(null, term, careers);
    const normalized = normalizeForMatch(term);
    // exact name matches, name-contains matches (for ambiguity), and any alias target
    const exact = byName.get(normalized);
    const contains = careers.filter((c) => normalizeForMatch(c.name).includes(normalized));
    console.log(`--- "${term}" resolved=${r.resolved} source=${r.source} -> ${r.careerName ?? "unresolved"}`);
    if (exact) {
      console.log(`    exact-name match: ${exact.name} (${exact.id})`);
    } else if (contains.length) {
      console.log(`    NO exact name; ${contains.length} name-contains: ${contains.map((c) => c.name).join(", ")}`);
    } else {
      console.log(`    no name-contains match in catalog`);
    }
    if (r.source === "alias" && r.careerId) {
      console.log(`    ALIAS resolved uniquely -> ${r.careerName} (${r.careerId})`);
    }
  }

  // Confirm each declared alias target is unique (1 career) and not a conflation.
  console.log("\n--- Declared alias targets (uniqueness in catalog) ---");
  const { PREFERRED_CAREER_ALIASES } = await import("../../src/lib/career-matching/preferred-career.ts");
  for (const [src, targetName] of Object.entries(PREFERRED_CAREER_ALIASES)) {
    const matches = careers.filter((c) => c.name === targetName);
    console.log(`  "${src}" -> "${targetName}": ${matches.length === 1 ? "UNIQUE" : matches.length + " matches"}`);
  }
}

main().finally(() => prisma.$disconnect());