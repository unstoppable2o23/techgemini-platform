// Phase 16C — golden harness BEFORE/AFTER comparison.
// Diffs the pre-enrichment (before) and post-enrichment (after) golden reports.
import { readFileSync } from "node:fs";

const before = JSON.parse(readFileSync(new URL("./phase16c-golden-before.json", import.meta.url), "utf8"));
const after = JSON.parse(readFileSync(new URL("./phase16c-golden-after.json", import.meta.url), "utf8"));

const rows = [];
for (const b of before.profiles) {
  const a = after.profiles.find((p) => p.id === b.id);
  const cov = (p, n) => p[`coverageTop${n}`].pct;
  rows.push({
    id: b.id,
    label: b.label,
    preferredOnly: !!b.preferredOnly,
    noData: !!b.noData,
    top5: { before: cov(b, 5), after: cov(a, 5) },
    top10: { before: cov(b, 10), after: cov(a, 10) },
    top5FamiliesHit: {
      before: b.expectedFamiliesHitInTop10.length,
      after: a.expectedFamiliesHitInTop10.length,
    },
    preferred: {
      before: b.preferredCareerBehavior ? `${b.preferredCareerBehavior.name}#${b.preferredCareerBehavior.rank}` : null,
      after: a.preferredCareerBehavior ? `${a.preferredCareerBehavior.name}#${a.preferredCareerBehavior.rank}` : null,
    },
    scoreRange: { before: `${b.scoreDistribution.min}-${b.scoreDistribution.max}`, after: `${a.scoreDistribution.min}-${a.scoreDistribution.max}` },
    // Did any TOp20 career now surface APTITUDE or WORK_ENVIRONMENT evidence?
    envEvidenceAfter: a.top20.some((m) => (m.topDimensionScores || []).some((d) => d.startsWith("APTITUDE") || d.startsWith("WORK_ENVIRONMENT"))),
  });
}

console.log("=== Phase 16C golden BEFORE/AFTER (top-5 / top-10 expected-family coverage %) ===");
const widths = { id: 2, label: 30 };
for (const r of rows) {
  const regress5 = r.top5.after < r.top5.before;
  const regress10 = r.top10.after < r.top10.before;
  const flag = (regress5 || regress10) ? "  <-- REGRESSION" : "";
  console.log(
    `[${r.id}] ${r.label.padEnd(28)} top5 ${String(r.top5.before).padStart(3)}->${String(r.top5.after).padEnd(3)} top10 ${String(r.top10.before).padStart(3)}->${String(r.top10.after).padEnd(3)}${flag}`
  );
  if (r.preferred.before || r.preferred.after) {
    console.log(`      preferred: ${r.preferred.before ?? "-"} -> ${r.preferred.after ?? "-"}`);
  }
}

console.log("\n=== Aggregate buckets ===");
console.log("BEFORE matchScore buckets:", JSON.stringify(before.aggregate.matchScoreBuckets));
console.log("AFTER  matchScore buckets:", JSON.stringify(after.aggregate.matchScoreBuckets));
console.log("BEFORE confidence:", JSON.stringify(before.aggregate.confidenceLevelCounts));
console.log("AFTER  confidence:", JSON.stringify(after.aggregate.confidenceLevelCounts));
console.log("BEFORE preferred ranked #1:", before.aggregate.preferredRankedFirst.join(", ") || "none");
console.log("AFTER  preferred ranked #1:", after.aggregate.preferredRankedFirst.join(", ") || "none");
console.log("BEFORE emerging in top10:", before.aggregate.emergingInTop10.length);
console.log("AFTER  emerging in top10:", after.aggregate.emergingInTop10.length);

const regressions = rows.filter((r) => !r.noData && (r.top5.after < r.top5.before || r.top10.after < r.top10.before));
console.log("\n=== Summary ===");
console.log(`Profiles compared: ${rows.length}`);
console.log(`Profiles with coverage regression (non-noData): ${regressions.length}`);
if (regressions.length) regressions.forEach((r) => console.log(`  ${r.id} ${r.label}`));
else console.log("  none");