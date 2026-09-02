// Phase 16C.1 — section 2: Phase 16C enrichment reconciliation.
// For every expected APTITUDE / WORK_ENVIRONMENT / thin-career enrichment item
// (as defined in scripts/phase16c-data.ts) report EXPECTED / FOUND / MISSING /
// DUPLICATE / INVALID. IDENTIFY every 16C alias and verify it resolves.
// READ ONLY. No automatic repair.
import { PrismaClient } from "@prisma/client";
import {
  APTITUDE_BY_CAREER,
  WORKENV_BY_CAREER,
  THIN_CAREER_ENRICHMENT,
} from "../../scripts/phase16c-data.ts";
import { CANONICAL_SIGNALS } from "../../src/lib/career-profile/canonical-signals.ts";
import { PREFERRED_CAREER_ALIASES } from "../../src/lib/career-matching/preferred-career.ts";

const prisma = new PrismaClient();

async function main() {
  const slugs = new Set([
    ...Object.keys(APTITUDE_BY_CAREER),
    ...Object.keys(WORKENV_BY_CAREER),
    ...Object.keys(THIN_CAREER_ENRICHMENT),
  ]);
  const careers = await prisma.career.findMany({
    where: { isActive: true, slug: { in: [...slugs] } },
    select: {
      id: true,
      slug: true,
      name: true,
      traits: { select: { dimension: true, value: true, weight: true } },
    },
  });
  const bySlug = new Map(careers.map((c) => [c.slug, c]));

  const statuses = { EXPECTED: 0, FOUND: 0, MISSING: 0, DUPLICATE: 0, INVALID: 0 };
  const reports = [];

  const reconcile = (kind, slug, expectList, foundTraits) => {
    const career = bySlug.get(slug);
    if (!career) {
      reports.push({ kind, slug, status: "MISSING", detail: "no active career for slug" });
      statuses.MISSING++;
      return;
    }
    const seeValue = new Set();
    for (const exp of expectList) {
      const matches = foundTraits.filter(
        (t) => t.dimension === exp.dimension && t.value === exp.value
      );
      if (matches.length === 0) {
        statuses.MISSING++;
        reports.push({ kind, slug, career: career.name, dimension: exp.dimension, value: exp.value, status: "MISSING", expectedWeight: exp.weight });
      } else if (matches.length > 1) {
        statuses.DUPLICATE++;
        reports.push({ kind, slug, career: career.name, dimension: exp.dimension, value: exp.value, status: "DUPLICATE", count: matches.length });
      } else {
        const m = matches[0];
        // Canonical-dimension validity applies ONLY to APTITUDE and
        // WORK_ENVIRONMENT (which must be canonical-signal values). THIN
        // INTEREST/PERSONALITY values are free-text by design (existing
        // enrichment convention) and are NOT canonical signals, so they are
        // never subject to this check.
        const isCanonicalDim = exp.dimension === "APTITUDE" || exp.dimension === "WORK_ENVIRONMENT";
        const canonDim = CANONICAL_SIGNALS[m.value]?.dimension;
        if (isCanonicalDim && canonDim !== exp.dimension) {
          statuses.INVALID++;
          reports.push({ kind, slug, career: career.name, dimension: exp.dimension, value: exp.value, status: "INVALID", detail: `canonical dimension=${canonDim} != ${exp.dimension}` });
        } else {
          const weightMatch = m.weight === exp.weight;
          statuses.FOUND++;
          reports.push({ kind, slug, career: career.name, dimension: exp.dimension, value: exp.value, status: "FOUND", weight: m.weight, weightMatchesExpected: weightMatch });
        }
      }
      seeValue.add(exp.value);
    }
  };

  for (const [slug, list] of Object.entries(APTITUDE_BY_CAREER)) {
    statuses.EXPECTED += list.length;
    reconcile("APTITUDE", slug, list.map((t) => ({ dimension: "APTITUDE", value: t.value, weight: t.weight })), bySlug.get(slug)?.traits ?? []);
  }
  for (const [slug, list] of Object.entries(WORKENV_BY_CAREER)) {
    statuses.EXPECTED += list.length;
    reconcile("WORK_ENVIRONMENT", slug, list.map((t) => ({ dimension: "WORK_ENVIRONMENT", value: t.value, weight: t.weight })), bySlug.get(slug)?.traits ?? []);
  }
  for (const [slug, thin] of Object.entries(THIN_CAREER_ENRICHMENT)) {
    const expectList = [
      ...thin.interests.map((v) => ({ dimension: "INTEREST", value: v, weight: 1 })),
      ...thin.personality.map((v) => ({ dimension: "PERSONALITY", value: v, weight: 1 })),
    ];
    statuses.EXPECTED += expectList.length;
    reconcile("THIN", slug, expectList, bySlug.get(slug)?.traits ?? []);
  }

  // Slugs expected by data module but with NO active career.
  const unresolvedSlugs = [...new Set(slugs)].filter((s) => !bySlug.has(s));
  console.log("=== Phase 16C.1 — section 2: enrichment reconciliation ===");
  console.log(`Expected items: ${statuses.EXPECTED}`);
  console.log(`FOUND: ${statuses.FOUND}`);
  console.log(`MISSING: ${statuses.MISSING}`);
  console.log(`DUPLICATE: ${statuses.DUPLICATE}`);
  console.log(`INVALID: ${statuses.INVALID}`);
  console.log(`Enrichment slugs with no active career: ${unresolvedSlugs.length ? unresolvedSlugs.join(", ") : "none"}`);

  const examples = reports.filter((r) => r.status !== "FOUND");
  console.log(`\nNon-FOUND items (${examples.length}):`);
  for (const e of examples.slice(0, 200)) console.log(`  [${e.status}] ${e.kind} ${e.slug}${e.career ? " (" + e.career + ")" : ""} ${e.dimension || ""} ${e.value || ""}${e.detail ? " — " + e.detail : ""}${e.weightMatchesExpected === false ? " — WEIGHT MISMATCH found=" + e.weight : ""}`);

  // ---- empty-value / noise audit among FOUND APTITUDE/WE rows in DB ----
  console.log("\n--- Weight reconciliation (APTITUDE/WE) ---");
  const weightMismatch = reports.filter((r) => r.status === "FOUND" && r.weightMatchesExpected === false);
  console.log(`FOUND items whose weight differs from Phase 16C spec: ${weightMismatch.length}`);
  for (const w of weightMismatch) console.log(`  ${w.slug} ${w.dimension} ${w.value} expected=${w.expectedWeight} found=${w.weight}`);

  // ---- alias audit ----
  const allCareers = await prisma.career.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  console.log("\n--- Preferred alias audit ---");
  for (const [src, targetName] of Object.entries(PREFERRED_CAREER_ALIASES)) {
    const target = allCareers.filter((c) => c.name === targetName);
    if (target.length === 1) {
      console.log(`  "${src}" -> ${targetName} [id=${target[0].id}] UNIQUE OK`);
    } else if (target.length === 0) {
      console.log(`  "${src}" -> ${targetName} MISSING (no active career named so)`);
    } else {
      console.log(`  "${src}" -> ${targetName} AMBIGUOUS (${target.length} careers)`);
    }
  }
  console.log(`Total aliases declared: ${Object.keys(PREFERRED_CAREER_ALIASES).length}`);
}

main().finally(() => prisma.$disconnect());