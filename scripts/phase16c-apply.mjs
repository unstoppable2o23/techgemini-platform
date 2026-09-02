/**
 * Phase 16C — idempotent career-intelligence enrichment applier.
 *
 * Applies:
 *   - APTITUDE CareerTrait rows (canonical assessment vocabulary)
 *   - WORK_ENVIRONMENT CareerTrait rows (canonical Learning & Productivity)
 *   - INTEREST/PERSONALITY trait rows + array fields for the 12 thin careers
 *   - SUBJECT/SKILL/EDUCATION trait rows derived from existing arrays for the 3
 *     careers that currently have zero CareerTrait rows
 *
 * Idempotency: every CareerTrait is upserted on the unique compound key
 * (careerId + dimension + value), so re-running can never create duplicates and
 * produces identical state. No existing rows are deleted. Deterministic: all
 * keys are canoncal career slugs; display text is never used for matching.
 *
 * Read-only on University / IndianInstitution / Program: this script never
 * selects or writes those models. No destructive migration; never runs
 * `prisma db push`.
 */
import { PrismaClient } from "@prisma/client";
import {
  APTITUDE_BY_CAREER,
  WORKENV_BY_CAREER,
  THIN_CAREER_ENRICHMENT,
} from "./phase16c-data.ts";

const prisma = new PrismaClient();

const ZERO_TRAIT_CAREERS = [
  "forensic-accounting",
  "cyber-law",
  "gemology-and-gem-testing",
];

async function upsertTrait(careerId, dimension, value, weight) {
  const v = String(value).trim();
  if (!v) return false;
  await prisma.careerTrait.upsert({
    where: {
      careerId_dimension_value: { careerId, dimension, value: v },
    },
    update: { weight },
    create: { careerId, dimension, value: v, weight },
  });
  return true;
}

async function main() {
  const slugs = new Set([
    ...Object.keys(APTITUDE_BY_CAREER),
    ...Object.keys(WORKENV_BY_CAREER),
    ...Object.keys(THIN_CAREER_ENRICHMENT),
    ...ZERO_TRAIT_CAREERS,
  ]);

  const careers = await prisma.career.findMany({
    where: { isActive: true, slug: { in: [...slugs] } },
    select: {
      id: true,
      slug: true,
      name: true,
      recommendedSubjects: true,
      technicalSkills: true,
      softSkills: true,
      recommendedDegrees: true,
    },
  });
  const bySlug = new Map(careers.map((c) => [c.slug, c]));

  const missing = [...slugs].filter((s) => !bySlug.has(s));
  if (missing.length) {
    console.error("WARNING: no active career found for slugs: " + missing.join(", "));
  }

  let aptRows = 0;
  let weRows = 0;
  let thinRows = 0;
  let derivedRows = 0;
  let arraysUpdated = 0;

  for (const slug of slugs) {
    const career = bySlug.get(slug);
    if (!career) continue;

    // 1) APTITUDE
    for (const t of APTITUDE_BY_CAREER[slug] || []) {
      if (await upsertTrait(career.id, "APTITUDE", t.value, t.weight)) aptRows++;
    }
    // 2) WORK_ENVIRONMENT
    for (const t of WORKENV_BY_CAREER[slug] || []) {
      if (await upsertTrait(career.id, "WORK_ENVIRONMENT", t.value, t.weight)) weRows++;
    }

    // 3) Thin-career INTEREST / PERSONALITY trait rows (+ array fields)
    const thin = THIN_CAREER_ENRICHMENT[slug];
    if (thin) {
      const updateData = {};
      if (thin.interests.length) {
        for (const v of thin.interests) {
          if (await upsertTrait(career.id, "INTEREST", v, 1)) thinRows++;
        }
        updateData.interests = dedupe([...(career.interests ?? []), ...thin.interests]);
      }
      if (thin.personality.length) {
        for (const v of thin.personality) {
          if (await upsertTrait(career.id, "PERSONALITY", v, 1)) thinRows++;
        }
        updateData.personalityTraits = dedupe([
          ...(career.personalityTraits ?? []),
          ...thin.personality,
        ]);
      }
      if (Object.keys(updateData).length) {
        await prisma.career.update({ where: { id: career.id }, data: updateData });
        arraysUpdated++;
      }
    }

    // 4) Zero-trait careers: derive SUBJECT/SKILL/EDUCATION from existing arrays
    if (ZERO_TRAIT_CAREERS.includes(slug)) {
      for (const v of career.recommendedSubjects || []) {
        if (await upsertTrait(career.id, "SUBJECT", v, 1)) derivedRows++;
      }
      for (const v of career.technicalSkills || []) {
        if (await upsertTrait(career.id, "SKILL", v, 1)) derivedRows++;
      }
      for (const v of career.softSkills || []) {
        if (await upsertTrait(career.id, "SKILL", v, 0.6)) derivedRows++;
      }
      for (const v of career.recommendedDegrees || []) {
        if (await upsertTrait(career.id, "EDUCATION", v, 1)) derivedRows++;
      }
    }
  }

  const counts = await prisma.careerTrait.groupBy({
    by: ["dimension"],
    _count: { _all: true },
  });
  const dimTotals = {};
  for (const c of counts) dimTotals[c.dimension] = c._count._all;

  const totalApt = await prisma.careerTrait.count({ where: { dimension: "APTITUDE" } });
  const totalWe = await prisma.careerTrait.count({ where: { dimension: "WORK_ENVIRONMENT" } });

  console.log("Phase 16C enrichment applied (idempotent).");
  console.log(`APTITUDE rows upserted this run: ${aptRows} | total APTITUDE: ${totalApt}`);
  console.log(`WORK_ENVIRONMENT rows upserted this run: ${weRows} | total WORK_ENVIRONMENT: ${totalWe}`);
  console.log(`Thin-career INTEREST/PERSONALITY rows: ${thinRows}`);
  console.log(`Zero-trait derived rows: ${derivedRows}`);
  console.log(`Career array fields updated: ${arraysUpdated}`);
  console.log("CareerTrait totals by dimension:", JSON.stringify(dimTotals));

  // Duplicate guard report
  const gp = await prisma.$queryRawUnsafe(
    `SELECT "careerId", "dimension", "value", COUNT(*)::int AS n
     FROM "CareerTrait"
     GROUP BY "careerId", "dimension", "value"
     HAVING COUNT(*) > 1`
  );
  if (gp.length) {
    console.error("DUPLICATES FOUND (should be impossible):", JSON.stringify(gp));
    process.exit(2);
  }
  console.log("Duplicate trait check passed (0 duplicates).");
}

function dedupe(arr) {
  return [...new Set(arr)];
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());