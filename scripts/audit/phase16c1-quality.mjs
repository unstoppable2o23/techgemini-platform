// Phase 16C.1 — section 3: CareerTrait quality audit.
// Inspect every APTITUDE and WORK_ENVIRONMENT trait for:
//   duplicates, near-duplicates, unsupported vocabulary, generic traits,
//   accidental/mismatched traits (career-occupation mismatch), and
//   cross-dimension contamination. READ ONLY. No repair.
import { PrismaClient } from "@prisma/client";
import { CANONICAL_SIGNALS, isCanonicalSignal } from "../../src/lib/career-profile/canonical-signals.ts";

const prisma = new PrismaClient();

// Known-good canonical values by dimension (authority = CANONICAL_SIGNALS).
// Unsupported vocabulary = a career trait whose value is not declared canonical.
async function main() {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      interests: true,
      personalityTraits: true,
      traits: { select: { dimension: true, value: true, weight: true } },
    },
  });

  const aptRows = [];
  const weRows = [];
  const dupes = [];
  const nearDupes = [];
  const unsupported = [];
  const schemaMismatch = [];

  for (const c of careers) {
    // duplicates / schema-mismatch within each career for APTITUDE + WE
    const seen = new Map(); // `${dim}|${norm(value)}` -> {value,count}
    for (const t of c.traits) {
      if (t.dimension !== "APTITUDE" && t.dimension !== "WORK_ENVIRONMENT") {
        // cross-dimension contamination check for free-text fields
        continue;
      }
      const norm = t.value.trim().toLowerCase();
      const key = `${t.dimension}|${norm}`;
      if (seen.has(key)) { seen.get(key).count++; if (seen.get(key).count === 2) dupes.push({ career: c.name, dimension: t.dimension, value: t.value }); }
      else seen.set(key, { value: t.value, count: 1 });

      if (t.dimension === "APTITUDE") aptRows.push({ career: c.name, slug: c.slug, value: t.value, weight: t.weight });
      else weRows.push({ career: c.name, slug: c.slug, value: t.value, weight: t.weight });
    }

    // unsupported vocabulary for APTITUDE/WE (not canonical)
    for (const t of c.traits) {
      if (t.dimension === "APTITUDE" || t.dimension === "WORK_ENVIRONMENT") {
        const ok = isCanonicalSignal(t.value) && CANONICAL_SIGNALS[t.value].dimension === t.dimension;
        if (!ok) unsupported.push({ career: c.name, dimension: t.dimension, value: t.value, declaration: CANONICAL_SIGNALS[t.value] });
      }
    }

    // schema mismatch: APTITUDE/WE trait value whose canonical declaration
    // belongs to a different dimension (cross-dimension contamination).
    for (const t of c.traits) {
      if ((t.dimension === "APTITUDE" || t.dimension === "WORK_ENVIRONMENT") && isCanonicalSignal(t.value)) {
        if (CANONICAL_SIGNALS[t.value].dimension !== t.dimension) {
          schemaMismatch.push({ career: c.name, traitDim: t.dimension, value: t.value, canonicalDim: CANONICAL_SIGNALS[t.value].dimension });
        }
      }
    }
  }

  console.log("=== Phase 16C.1 — section 3: CareerTrait quality audit ===");
  console.log(`APTITUDE rows in DB: ${aptRows.length}`);
  console.log(`WORK_ENVIRONMENT rows in DB: ${weRows.length}`);

  // duplicates (exact same value twice in same career+dimension)
  console.log(`\nExact duplicates (career+dimension+value >1): ${dupes.length}`);
  for (const d of dupes) console.log(`  ${d.career} ${d.dimension} "${d.value}"`);
  if (!dupes.length) console.log("  none");

  // near-duplicates: same career+dimension with values differing only in case/whitespace
  // (we use case-insensitive key above; duplicates already caught). Report case-only diffs.
  const near = [];
  for (const c of careers) {
    const map = new Map();
    for (const t of c.traits) {
      if (t.dimension !== "APTITUDE" && t.dimension !== "WORK_ENVIRONMENT") continue;
      const key = t.value.replace(/\s+/g, " ").trim().toLowerCase();
      if (map.has(key) && map.get(key) !== t.value) near.push({ career: c.name, dimension: t.dimension, a: map.get(key), b: t.value });
      else if (!map.has(key)) map.set(key, t.value);
    }
  }
  console.log(`\nNear-duplicates (case/whitespace variants): ${near.length}`);
  for (const n of near) console.log(`  ${n.career} ${n.dimension} "${n.a}" vs "${n.b}"`);
  if (!near.length) console.log("  none");

  // unsupported vocabulary
  console.log(`\nUnsupported (non-canonical) APTITUDE/WE values: ${unsupported.length}`);
  for (const u of unsupported) console.log(`  ${u.career} ${u.dimension} "${u.value}" decl=${JSON.stringify(u.declaration)}`);
  if (!unsupported.length) console.log("  none");

  // cross-dimension schema mismatch
  console.log(`\nCross-dimension schema mismatches: ${schemaMismatch.length}`);
  for (const s of schemaMismatch) console.log(`  ${s.career} traitDim=${s.traitDim} "${s.value}" canonicalDim=${s.canonicalDim}`);
  if (!schemaMismatch.length) console.log("  none");

  // ---- accidental/mismatched occupation traits ----
  // Heuristic: APTITUDE/WE traits whose value concept is wildly incompatible with
  // the career is hard to detect generically without an ontology. We flag a small
  // explicit list of suspicious cross-domain tokens in ENRICHED careers only.
  const suspicious = [];
  const badToken = (v) => /fashion|accounting|venture|fine arts|cooking|cosmetolog/i.test(v);
  for (const c of careers) {
    for (const t of c.traits) {
      if ((t.dimension === "APTITUDE" || t.dimension === "WORK_ENVIRONMENT") && badToken(t.value)) {
        suspicious.push({ career: c.name, dimension: t.dimension, value: t.value });
      }
    }
  }
  console.log(`\nSuspicious cross-domain APTITUDE/WE values: ${suspicious.length}`);
  for (const s of suspicious) console.log(`  ${s.career} ${s.dimension} "${s.value}"`);
  if (!suspicious.length) console.log("  none (no bed-token cross-domain values found)");

  // ---- generic trait audit (career-defining vs supporting vs too-generic) ----
  // Report weight distribution to characterize career-defining (1) vs supporting (0.6).
  const w1 = aptRows.filter((r) => r.weight === 1).length;
  const w06 = aptRows.filter((r) => r.weight === 0.6).length;
  const we1 = weRows.filter((r) => r.weight === 1).length;
  const we06 = weRows.filter((r) => r.weight === 0.6).length;
  console.log(`\nAPTITUDE weight mix: career-defining(1)=${w1} supporting(0.6)=${w06}`);
  console.log(`WORK_ENVIRONMENT weight mix: career-defining(1)=${we1} supporting(0.6)=${we06}`);

  // coverage: which careers have the fewest APTITUDE traits (single-trait = thin evidence)
  const counts = {};
  for (const r of aptRows) counts[r.slug] = (counts[r.slug] || 0) + 1;
  const single = Object.entries(counts).filter(([, n]) => n === 1).map(([s]) => s);
  console.log(`Careers with only ONE APTITUDE trait: ${single.length} -> ${single.slice(0, 60).join(", ")}`);
}

main().finally(() => prisma.$disconnect());