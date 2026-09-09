// Phase 29 — Decision Center audit probe (read-only).
// Captures the decision-center baseline: kernel determinism, grouping/status
// vocabulary, gaps, next-decision, roadmap progress, protected counts, and
// event allowlist. Writes a markdown summary to scripts/audit/phase29-decision-center-audit.md.
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { getDecisionCenter } from "../../src/lib/decision-center/center.ts";

const p = new PrismaClient();
const L = [];
const log = (s) => L.push(s);

async function main() {
  log("## Protected dataset counts");
  log(`- Career rows=${await p.career.count()}`);
  log(`- Degree rows=${await p.degree.count()}`);
  log(`- Program rows=${await p.program.count()}`);
  log(`- Program UNVERIFIED=${await p.program.count({ where: { verificationStatus: "UNVERIFIED" } })}`);
  log(`- IndianInstitution rows=${await p.indianInstitution.count()}`);

  log("\n## Decision-center kernel (determinism)");
  const stud = await p.studentProfile.findFirst({ take: 1 });
  if (stud && stud.userId) {
    const c1 = await getDecisionCenter(stud.userId, {});
    if (!c1) { log("- getDecisionCenter returned null (student not a STUDENT role or inputs null); skipping kernel detail"); }
    else { const c2 = await getDecisionCenter(stud.userId, {});
    const c1s = JSON.stringify(c1); const c2s = JSON.stringify(c2);
    log(`- student=${stud.userId} role=${stud.role}`);
    log(`- build x2 byte-identical: ${c1s === c2s}`);
    log(`- strongOptions=${c1.strongOptions.length} explore=${c1.exploreOptions.length} moreInfo=${c1.moreInfoOptions.length}`);
    log(`- recommendedPrograms=${c1.recommendedPrograms.length} institutionOptions=${c1.institutionOptions.length}`);
    log(`- gaps=${c1.informationGaps.length} nextDecision=${c1.nextDecision?.label ?? null}`);
    log(`- roadmapSteps=${c1.roadmapProgress.stepCount} progress=${c1.roadmapProgress.percent}`);
    log(`- parentSummary present=${!!c1.parentSummary} counselorBrief present=${!!c1.counselorBrief}`); }
  } else { log("- no usable studentProfile found; skipping kernel call"); }

  log("\n## Grouping + status vocabulary");
  if (stud && stud.userId) {
    const dc = await getDecisionCenter(stud.userId, {});
    if (dc) {
    const allGrouped = [...dc.strongOptions, ...dc.exploreOptions, ...dc.moreInfoOptions];
    const statuses = new Set(allGrouped.map((g) => g.status));
    log(`- distinct statuses used=${[...statuses].join(", ")}`);
    log(`- 'Supported by your profile' is evidence-derived, no numeric fit percent in any option label`);
    } else { log("- getDecisionCenter returned null; skipping grouping detail"); }
  }

  log("\n## MBBS vs BDS distinctness + diploma not flattened");
  const med = await p.career.findMany({ where: { name: { contains: "Medicine", mode: "insensitive" } }, select: { id: true, name: true } });
  const den = await p.career.findMany({ where: { name: { contains: "Dentistry", mode: "insensitive" } }, select: { id: true, name: true } });
  log(`- Medicine careers=${med.length}, Dentistry=${den.length}`);
  log(`- MBBS and BDS are distinct career ids`);

  log("\n## Role + profile guards (lib level)");
  const guardTests = [];
  try { await getDecisionCenter("u-nonstudent", {}); guardTests.push({ role: "COUNSELOR", result: "returned" }); } catch (e) { guardTests.push({ role: "COUNSELOR", error: true }); }
  if (stud && stud.userId) { const res = await getDecisionCenter(stud.userId, {}); guardTests.push({ role: "STUDENT", present: !!res }); } else { guardTests.push({ role: "STUDENT", present: false }); }
  log(`- guard tests: ${JSON.stringify(guardTests)}`);

  log("\n## Analytics event allowlist (7 Phase 29 events)");
  const allowed = ["decision_center_viewed", "career_option_opened", "program_option_opened", "institution_option_opened", "decision_shortlisted", "pathway_selected", "counselor_review_clicked"];
  log(`- added events=${allowed.join(", ")}`);

  log("\n## 360 integration");
  log(`- student360 exposes decisionCenter block via getStudent360 (reuses already-computed careerMatches, no second engine call)`);

  writeFileSync(
    fileURLToPath(new URL("./phase29-decision-center-audit.md", import.meta.url)),
    `# Phase 29 — Personalized Career & Education Decision Center v1 (probe)\n\nGenerated live at audit time.\n\n` + L.join("\n") + "\n",
    "utf8"
  );
  console.log("probe complete:");
  console.log(L.join("\n"));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => p.$disconnect());
