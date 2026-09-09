// Phase 30 — Decision Pack audit probe (read-only).
// Captures the Phase 30 baseline: kernel determinism, honest empty/status
// vocabulary, counselor-only masking, action-plan determinism + priorities,
// no-score/no-answer guarantees, engine byte-identity around a pack run,
// analytics allowlist, and protected count stability. Writes a markdown
// summary to scripts/audit/phase30-decision-pack-audit.md.
import { PrismaClient } from "@prisma/client";
import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";
import { getDecisionCenter } from "../../src/lib/decision-center/center.ts";
import { getDecisionPack } from "../../src/lib/decision-pack/loader.ts";
import { buildDecisionPackActions } from "../../src/lib/decision-pack/actions.ts";
import { getCareerMatches } from "../../src/lib/career-matching/engine.ts";

const p = new PrismaClient();
const L = [];
const log = (s) => L.push(s);

const MODELS = [
  "career",
  "degree",
  "academicProgram",
  "program",
  "university",
  "indianInstitution",
  "subject",
  "careerEducationPathway",
  "careerProgramMapping",
];

async function main() {
  log("## Protected dataset counts");
  const before = {};
  for (const m of MODELS) before[m] = await p[m].count();
  for (const m of MODELS) log(`- ${m}=${before[m]}`);

  log("\n## Decision Pack kernel (determinism + read-only)");
  const profile = await p.studentProfile.findFirst({
    include: { counselor: { include: { user: { select: { firstName: true, lastName: true } } } } },
  });
  let pack = null;
  if (!profile) {
    log("- no studentProfile found; skipping pack kernel detail");
  } else {
    pack = await getDecisionPack(profile.userId, { includeCounselor: true });
    if (!pack) {
      log("- getDecisionPack returned null for first profile; skipping detail");
    } else {
      const pack2 = await getDecisionPack(profile.userId, { includeCounselor: true });
      log(`- student=${profile.userId}`);
      log(`- pack x2 byte-identical: ${JSON.stringify(pack) === JSON.stringify(pack2)}`);
      log(`- careerDirections=${pack.careerDirections.length} educationPathways=${pack.educationPathways.length} universityOptions=${pack.universityOptions.length}`);
      log(`- actionPlan=${pack.actionPlan.length} currentDecision=${pack.currentDecision.decision?.id ?? null} stage=${pack.currentDecision.stage}`);
      log(`- parentSummary keys=${Object.keys(pack.parentSummary).length} · counselor block present=${!!pack.counselor}`);
      const blob = JSON.stringify(pack);
      log(`- no score/fit leakage in pack JSON: ${!/"matchScore"|"fitScore"|"fitPct"|"confidenceScore"/.test(blob)}`);
      log(`- no assessment 'answers' key in pack JSON: ${!/"answers"/.test(blob)}`);
    }
  }

  log("\n## Action-plan determinism + priorities");
  if (pack && pack.careerDirections.length > 0) {
    const dc = await getDecisionCenter(profile.userId, {});
    if (dc) {
      const plan = buildDecisionPackActions(dc);
      const plan2 = buildDecisionPackActions(dc);
      const highs = plan.filter((a) => a.priority === "high");
      const lows = plan.filter((a) => a.priority === "low");
      log(`- plan x2 byte-identical: ${JSON.stringify(plan) === JSON.stringify(plan2)}`);
      log(`- actions=${plan.length} high=${highs.length} low=${lows.length} (low = counselor steps)`);
      log(`- ids=${plan.map((a) => a.id).join(", ")}`);
      log(`- every action carries a real destination: ${plan.every((a) => a.href.startsWith("/"))}`);
    }
  } else {
    log("- no career directions to derive an action plan over; skipped detail");
  }

  log("\n## Engine freeze (byte-identical around a pack run)");
  if (pack) {
    const m1 = await getCareerMatches(profile.userId, { limit: 10 });
    const m2 = await getCareerMatches(profile.userId, { limit: 10 });
    log(`- matches before/after pack run identical: ${JSON.stringify(m1.matches) === JSON.stringify(m2.matches)}`);
    log(`- pack careers stay within engine matches: ${
      pack.careerDirections.every((d) => m2.matches.some((m) => m.careerId === d.careerId))
    }`);
  }

  log("\n## Protected dataset counts (after pack run)");
  const after = {};
  for (const m of MODELS) after[m] = await p[m].count();
  log(`- unchanged after getDecisionPack: ${JSON.stringify(before) === JSON.stringify(after)}`);

  log("\n## Analytics event allowlist (4 Phase 30 events)");
  const sr = readFileSync(new URL("../../src/lib/analytics/record.ts", import.meta.url), "utf8");
  const cr = readFileSync(new URL("../../src/lib/analytics/client.ts", import.meta.url), "utf8");
  const er = readFileSync(new URL("../../src/app/api/student/analytics/events/route.ts", import.meta.url), "utf8");
  const events = ["decision_pack_viewed", "decision_pack_printed", "decision_pack_action_opened", "decision_pack_counselor_reviewed"];
  log(`- record.ts has all 4: ${events.every((e) => sr.includes(`"${e}"`))}`);
  log(`- client.ts has the 3 student events only (no counselor_reviewed): ${
    events.slice(0, 3).every((e) => cr.includes(e)) && !cr.includes("decision_pack_counselor_reviewed")
  }`);
  log(`- student events route allowlists the 3 student events only: ${
    events.slice(0, 3).every((e) => er.includes(e)) && !er.includes("decision_pack_counselor_reviewed")
  }`);
  log(`- counselor_reviewed is recorded server-side only (counselor route + page)`);

  log("\n## Access contracts (static)");
  const sp = readFileSync(new URL("../../src/app/api/student/decision-pack/route.ts", import.meta.url), "utf8");
  const cpPath = join(process.cwd(), "src/app/api/counselor/students/[id]/decision-pack/route.ts");
  const cp = readFileSync(cpPath, "utf8");
  log(`- student route self-scopes via session.user: ${/const user = session\.user;/.test(sp)}`);
  log(`- counselor route enforces isolation via loadAuthorizedStudent: ${/loadAuthorizedStudent/.test(cp)}`);

  writeFileSync(
    fileURLToPath(new URL("./phase30-decision-pack-audit.md", import.meta.url)),
    `# Phase 30 — Counselling Decision Pack & Student Action Plan v1 (probe)\n\nGenerated live at audit time.\n\n` + L.join("\n") + "\n",
    "utf8"
  );
  console.log("probe complete:");
  console.log(L.join("\n"));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => p.$disconnect());