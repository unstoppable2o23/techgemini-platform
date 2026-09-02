import { PrismaClient } from "@prisma/client";
import { resolvePreferredCareer } from "../../src/lib/career-matching/preferred-career.ts";
import { normalizeForMatch } from "../../src/lib/career-matching/config.ts";

const prisma = new PrismaClient();

const REQUIRED = ["Doctor", "Architect", "Accountant", "Management Consultant", "Software Engineer", "Data Scientist", "Civil Engineer", "Psychologist", "Biotechnologist", "Pharmacist", "Lawyer", "Physician"];

async function partialCareers() {
  const rows = await prisma.career.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true, category: true } });
  return rows;
}

function ambiguityScan(careers) {
  // For each name, find careers whose normalized name or tidy name contains it
  const results = [];
  const names = careers.map(c => ({ norm: normalizeForMatch(c.name), c }));
  for (const term of REQUIRED) {
    const tnorm = normalizeForMatch(term);
    const exact = names.filter(n => n.norm === tnorm);
    if (exact.length) { results.push({ term, exact: exact.map(n => n.c.name), containedIn: [] }); continue; }
    const containedIn = names.filter(n => n.norm.includes(tnorm)).map(n => n.c.name);
    const tokenOverlap = names.filter(n => {
      const tk = new Set(n.norm.split(" ").filter(w => w.length > 3));
      const tt = new Set(tnorm.split(" "));
      let hits = 0; for (const w of tt) if (tk.has(w)) hits++;
      return hits >= Math.max(1, tt.size - 1) && n.norm !== tnorm;
    }).map(n => n.c.name);
    results.push({ term, exact: [], containedIn, tokenOverlap, resolution: resolvePreferredCareer(null, term, careers) });
  }
  return results;
}

async function main() {
  const careers = await partialCareers();
  const scan = ambiguityScan(careers);
  const aliasMap = Object.entries(await import("../../src/lib/career-matching/preferred-career.ts")).filter(([k]) => k === "PREFERRED_CAREER_ALIASES");
  const aliases = aliasMap[0][1];

  const aliasChecks = [];
  for (const [alias, target] of Object.entries(aliases)) {
    const tNorm = normalizeForMatch(target);
    const targets = careers.filter(c => normalizeForMatch(c.name) === tNorm);
    const res = resolvePreferredCareer(null, alias, careers);
    aliasChecks.push({ alias, target, targetFound: targets.length, resolved: res.resolved, resolvedCareer: res.careerName, source: res.source });
  }

  console.log("=== AMBIGUITY SCAN (12 required aliases) ===");
  for (const s of scan) {
    console.log(`\n[${s.term}]`);
    console.log("  exact:", s.exact.length ? s.exact.join(", ") : "(none)");
    if (s.containedIn?.length) console.log("  careers whose name CONTAINS it:", s.containedIn.join(" | "));
    if (s.tokenOverlap?.length) console.log("  token-overlap candidates:", s.tokenOverlap.join(" | "));
    if (s.resolution) console.log("  resolvePreferredCareer ->", s.resolution.resolved ? `${s.resolution.careerName} (${s.resolution.source})` : "UNRESOLVED / fallbackAllowed=" + s.resolution.fallbackAllowed);
  }

  console.log("\n=== ALIAS MAP CHECKS ===");
  for (const a of aliasChecks) {
    const ok = a.resolved && a.targetFound === 1;
    console.log(`  ${a.alias.padEnd(22)} -> ${a.target.padEnd(34)} targetFound=${a.targetFound} resolved=${a.resolved} [${ok ? "OK" : "PROBLEM"}]`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });