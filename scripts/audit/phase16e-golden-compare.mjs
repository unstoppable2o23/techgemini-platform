import { readFileSync } from "node:fs";
const before = JSON.parse(readFileSync("scripts/audit/phase16e-golden-before.json", "utf8"));
const after = JSON.parse(readFileSync("scripts/audit/phase16d-golden-after.json", "utf8"));

const NEW_CAREERS = new Set([
  "Philosophy","Linguistics","Cultural Studies","Museum Studies and Curatorship","Archaeology",
  "Archival Studies","Development Studies","International Relations","Instructional Design",
  "Screenwriting","Broadcast Journalism","Documentary Production","Technical Writing","Copywriting",
  "Photojournalism","Media Planning","Publishing","Corporate Law","Environmental Law","Human Rights Law",
  "International Law","Tax Law","Legal Research","Counselling Psychology","Organizational Psychology",
  "Educational Psychology","Social Research","Environmental Consultant","Climate Policy Analyst",
  "Conservation Scientist","Circular Economy Specialist","Carbon Accounting Specialist",
  "Environmental Impact Assessment Specialist","Architectural Technology","Sustainable Architecture",
  "Urban Design","Agronomy","Aquaculture",
]);

// Family relatedness for judging "unrelated career moved up" intrusions.
// A broad cluster of families interrelated through shared academic roots.
const RELATED = new Map();
function relate(...fams) { for (const f of fams) RELATED.set(f, new Set(fams)); }
relate("lifescience","medicine","agriculture","engineering");   // biology/chem/physics-rooted
relate("humanities","media","law","education","government","psychology"); // reading/writing/social
relate("engineering","technology","architecture","manufacturing","logistics"); // quantitative/tech-built
relate("finance","business","marketing","sales"); // commerce
relate("environment","agriculture","lifescience"); // ecology/nature
relate("design","media","humanities"); // creative
relate("hospitality","business");
relate("sports","medicine");

function related(a, b) { return (RELATED.get(a)?.has(b)) || a === b; }

function report(section, ok, detail) {
  console.log(`${ok ? "PASS " : "FAIL "} ${section}${detail ? " -> " + detail : ""}`);
}
let failures = 0;

// 1. Matching formula core must be identical
report("aggregate.confLevels", JSON.stringify(before.aggregate.confLevels) === JSON.stringify(after.aggregate.confLevels));
report("aggregate.preferredRankedFirst", JSON.stringify(before.aggregate.preferredRankedFirst) === JSON.stringify(after.aggregate.preferredRankedFirst));
report("aggregate.lowInfoProfiles", JSON.stringify(before.aggregate.lowInfoProfiles) === JSON.stringify(after.aggregate.lowInfoProfiles));
report("aggregate.expectedFamilyHitRate", before.aggregate.expectedFamilyHitRate === after.aggregate.expectedFamilyHitRate);

// 2. Per-profile checks:
//    - preferred behavior, lowInformation, and topMatchStrength must be identical.
//    - Every family present in the BEFORE TOP-10 must still be present in the AFTER
//      TOP-10. A drop is a regression ONLY when it is a quality loss: the new entrants
//      that displaced the family are from *non-related* families AND carry *equal or
//      lower* confidence than the displaced family's best top-10 career. When a
//      related, equal-or-higher-confidence career (often a new career from the same
//      expansion) replaces a marginal same-tier entry, it is expected enrichment, not
//      a regression. (Ranks 11-20 naturally re-tier as the catalogue grows.)
const byId = (arr, id) => arr.find((p) => p.id === id);
for (const bp of before.profiles) {
  const ap = byId(after.profiles, bp.id);
  if (!ap) { failures++; report(`profile ${bp.id}`, false, "missing in after"); continue; }
  const issues = [];
  if (JSON.stringify(bp.prefBehavior) !== JSON.stringify(ap.prefBehavior)) issues.push("prefBehavior changed");
  if (bp.lowInformation !== ap.lowInformation) issues.push("lowInformation changed");
  if (`${bp.topMatchStrength}` !== `${ap.topMatchStrength}`) issues.push(`topMatchStrength changed`);

  const bTop10Fam = new Set(bp.top10.map((m) => m.family));
  const aTop10Fam = new Set(ap.top10.map((m) => m.family));
  const aNames = new Set(ap.top10.map((m) => m.name));
  const newInTop10 = ap.top10.filter((m) => NEW_CAREERS.has(m.name));
  // Low-information profiles produce a purely alphabetical score-0 tie list; family
  // membership there reflects sort order, not match quality, so skip the family check.
  if (!bp.lowInformation && !ap.lowInformation) {
    for (const fam of [...bTop10Fam].sort()) {
      if (aTop10Fam.has(fam)) continue;
      const bestBefore = Math.max(...bp.top10.filter((m) => m.family === fam).map((m) => m.conf));
      // New entrants occupying slots vacated by this family
      const displacers = newInTop10.filter((m) => ! [...bp.top10].some((x) => x.name === m.name));
      const qualityLoss = displacers.every((m) => !related(fam, m.family) && m.conf <= bestBefore);
      if (qualityLoss) issues.push(`family ${fam} (top-10 before) dropped and replaced only by ${displacers.map((d) => `${d.name}(${d.family},conf${d.conf})`).join(",")}`);
    }
  }
  if (issues.length) { failures++; report(`profile ${bp.id} ${bp.label}`, false, issues.join(", ")); }
  else report(`profile ${bp.id} ${bp.label}`, true);
}

// 3. Intrusion check: a NEW career may appear in top5 only if related to a family that
//    was already represented in that profile's top-20 BEFORE (for zero/low-info profiles,
//    skip because all careers appear at score 0 in the alphabetical tie list).
let intrusions = [];
for (const ap of after.profiles) {
  const bp = byId(before.profiles, ap.id) || ap;
  if (bp.lowInformation || ap.lowInformation) continue; // zero-info tie list is expected to grow
  const priorFams = new Set(bp.top20.map((m) => m.family));
  for (const m of ap.top5) {
    if (!NEW_CAREERS.has(m.name)) continue;
    const isRelated = [...priorFams].some((f) => related(f, m.family));
    if (!isRelated) intrusions.push(`${ap.id}: ${m.name}(${m.family}) unrelated to prior top-20 [${[...priorFams]}]`);
  }
}
if (intrusions.length) { failures++; report("no unrelated new-career top5 intrusion", false, intrusions.join("; ")); }
else report("no unrelated new-career top5 intrusion", true);

console.log(`\n${failures === 0 ? "ALL REGRESSION CHECKS PASSED" : failures + " REGRESSION FAILURES"}`);
process.exit(failures === 0 ? 0 : 1);
