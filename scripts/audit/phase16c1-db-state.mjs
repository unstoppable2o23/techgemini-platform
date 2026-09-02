// Phase 16C.1 — section 1: current database state audit.
// Measures the LIVE production database CareerTrait dimension totals and the
// coverage of active careers, then compares against the Phase 16C baseline.
// READ ONLY on University / IndianInstitution / Program.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASELINE = {
  // From scripts/audit/phase16c-career-data-baseline.json / final report:
  totalTraits: 4646,
  dimensions: {
    INTEREST: 707,
    PERSONALITY: 717,
    APTITUDE: 0,
    SUBJECT: 763,
    SKILL: 1921,
    EDUCATION: 538,
    WORK_ENVIRONMENT: 0,
  },
  activeCareers: 251,
  zeroTraitCareers: 3,
  zeroInterestCareers: 9,
  zeroPersonalityCareers: 9,
};

async function main() {
  const active = await prisma.career.findMany({
    where: { isActive: true },
    select: { id: true, traits: { select: { dimension: true } } },
  });

  const dimCounts = {};
  for (const c of active) for (const t of c.traits) dimCounts[t.dimension] = (dimCounts[t.dimension] || 0) + 1;
  const totalTraits = active.reduce((a, c) => a + c.traits.length, 0);

  const has = (c, dim) => c.traits.some((t) => t.dimension === dim);
  const zeroTrait = active.filter((c) => c.traits.length === 0).length;
  const zeroInterest = active.filter((c) => !has(c, "INTEREST")).length;
  const zeroPersonality = active.filter((c) => !has(c, "PERSONALITY")).length;
  const zeroApt = active.filter((c) => !has(c, "APTITUDE")).length;
  const zeroWe = active.filter((c) => !has(c, "WORK_ENVIRONMENT")).length;
  const withApt = active.filter((c) => has(c, "APTITUDE")).length;
  const withWe = active.filter((c) => has(c, "WORK_ENVIRONMENT")).length;

  // Baseline counts per dimension for comparison
  const baseline = BASELINE.dimensions;

  const current = { totalTraits, dimensions: { ...dimCounts } };
  const rows = [
    ["total CareerTrait rows", baseline?.totalTraits ?? null, BASELINE.totalTraits, current.totalTraits],
  ];
  const dimOrder = ["INTEREST", "PERSONALITY", "APTITUDE", "SUBJECT", "SKILL", "EDUCATION", "WORK_ENVIRONMENT"];
  const dimRows = dimOrder.map((d) => [
    d,
    baseline[d],
    current.dimensions[d] || 0,
  ]);

  console.log("=== Phase 16C.1 — current database state ===");
  console.log("CareerTrait totals by dimension (baseline 16C -> current):");
  for (const d of dimOrder) {
    const b = baseline[d];
    const c = current.dimensions[d] || 0;
    const delta = b === 0 ? (c > 0 ? `new +${c}` : "none") : `${c - b > 0 ? "+" : ""}${c - b}`;
    console.log(`  ${d.padEnd(16)} ${String(b).padStart(5)} -> ${String(c).padStart(5)}   (${delta})`);
  }
  console.log(`  ${"TOTAL".padEnd(16)} ${String(BASELINE.totalTraits).padStart(5)} -> ${String(current.totalTraits).padStart(5)}   (+${current.totalTraits - BASELINE.totalTraits})`);

  console.log("\nActive careers (baseline -> current):");
  const cov = [
    ["active careers", BASELINE.activeCareers, active.length],
    ["with APTITUDE traits", 0, withApt],
    ["with WORK_ENVIRONMENT traits", 0, withWe],
    ["with zero CareerTrait rows", BASELINE.zeroTraitCareers, zeroTrait],
    ["with zero INTEREST", BASELINE.zeroInterestCareers, zeroInterest],
    ["with zero PERSONALITY", BASELINE.zeroPersonalityCareers, zeroPersonality],
    ["with zero APTITUDE", active.length, zeroApt],
    ["with zero WORK_ENVIRONMENT", active.length, zeroWe],
  ];
  for (const [label, b, c] of cov) console.log(`  ${label.padEnd(34)} ${String(b).padStart(5)} -> ${String(c).padStart(5)}`);

  console.log("\n=== Reconciliation ===");
  const missing = [];
  const check = (label, baselineV, currentV) => {
    if (baselineV === 0 && currentV > 0) return;
    if (currentV < baselineV) missing.push(label);
  };
  for (const d of dimOrder) check(d, baseline[d], current.dimensions[d] || 0);
  if (missing.length) console.log("MISSING (current < baseline): " + missing.join(", "));
  else console.log("All Phase 16C dimension targets present (>= baseline).");

  // Careers still fully missing traits
  const noTraitNames = (await prisma.career.findMany({
    where: { isActive: true, traits: { none: {} } },
    select: { name: true, slug: true },
  }));
  console.log("\nCareers still with zero CareerTrait rows:");
  console.log(noTraitNames.length ? noTraitNames.map((c) => `  ${c.name} (${c.slug})`).join("\n") : "  none");
}

main().finally(() => prisma.$disconnect());