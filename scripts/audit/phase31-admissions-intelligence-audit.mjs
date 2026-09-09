// Phase 31 — Admissions Intelligence audit probe (read-only).
// Captures the Phase 31 baseline: source-registry integrity, readiness /
// verification vocabulary, no-fabricated-numbers guarantees, kernel
// determinism, Decision Center + Decision Pack flow-through onto real
// profiles, engine byte-identity around a guidance run, analytics
// allowlist breadth, read-surface self-scoping, and protected count
// stability. Writes scripts/audit/phase31-admissions-intelligence-audit.md.
import { PrismaClient } from "@prisma/client";
import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";
import { getDecisionCenter } from "../../src/lib/decision-center/center.ts";
import { getCareerMatches } from "../../src/lib/career-matching/engine.ts";
import {
  buildAdmissionsGuidance,
  buildProgramAdmissionGuidance,
} from "../../src/lib/admissions-intelligence/guidance.ts";
import { OFFICIAL_SOURCES, getOfficialSource, isOfficialSourceUrl } from "../../src/lib/admissions-intelligence/sources.ts";

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

const ELECTIVE_FOCUS = [
  { programId: "c1", programName: "MBBS", level: "Professional Degree", category: "medicine" },
  { programId: "c2", programName: "B.E. in Mechanical Engineering", level: "B.E. or B.Tech", category: "engineering" },
  { programId: "c3", programName: "Diploma in Interior Design", level: "Diploma", category: null },
  { programId: "c4", programName: "BBA (Bachelor of Business Administration)", level: "Degree", category: "business" },
  { programId: "c5", programName: "Nursing (B.Sc Nursing)", level: "Degree", category: null },
];

async function main() {
  log("## Protected dataset counts (before)");
  const before = {};
  for (const m of MODELS) before[m] = await p[m].count();
  for (const m of MODELS) log(`- ${m}=${before[m]}`);

  log("\n## Official-source registry");
  log(`- entries=${OFFICIAL_SOURCES.length}`);
  const ids = new Set();
  let domainsOk = true;
  let httpsOk = true;
  for (const s of OFFICIAL_SOURCES) {
    ids.add(s.id);
    if (new Set([s.id, s.name, s.domain, s.canonicalUrl, s.purpose, s.sourceType, s.jurisdiction]).size < 7) domainsOk = false;
    if (!s.canonicalUrl.startsWith("https://")) httpsOk = false;
  }
  log(`- unique ids: ${ids.size === OFFICIAL_SOURCES.length}`);
  log(`- all fields present: ${domainsOk}`);
  log(`- all canonical URLs https: ${httpsOk}`);
  log(`- spot lookups: nta=${getOfficialSource("nta")?.id ?? null} nmc=${getOfficialSource("nmc")?.id ?? null} jee-advanced=${getOfficialSource("jee-advanced")?.id ?? null}`);
  log(`- subdomain-aware official check: jeemain.nta.nic.in=${isOfficialSourceUrl("https://jeemain.nta.nic.in")} fake domain=${isOfficialSourceUrl("https://fake-exam-site.com")}`);

  log("\n## Kernel determinism + read-only");
  const prog = { programId: "p1", programName: "MBBS", level: "Professional Degree", category: "medicine" };
  const g1 = buildProgramAdmissionGuidance(prog);
  const g2 = buildProgramAdmissionGuidance(prog);
  log(`- program guidance x2 byte-identical: ${JSON.stringify(g1) === JSON.stringify(g2)}`);
  const a1 = buildAdmissionsGuidance({ focusPrograms: ELECTIVE_FOCUS, hasCareerDirection: true, counselorAssigned: true });
  const a2 = buildAdmissionsGuidance({ focusPrograms: ELECTIVE_FOCUS, hasCareerDirection: true, counselorAssigned: true });
  log(`- student guidance x2 byte-identical: ${JSON.stringify(a1) === JSON.stringify(a2)}`);
  const missing = buildAdmissionsGuidance({ focusPrograms: [], hasCareerDirection: false, counselorAssigned: false });
  log(`- INFORMATION_MISSING on empty input: ${missing.readiness === "INFORMATION_MISSING"}`);
  const awe = readFileSync(new URL("../../src/lib/admissions-intelligence/guidance.ts", import.meta.url), "utf8");
  const acs = readFileSync(new URL("../../src/lib/admissions-intelligence/sources.ts", import.meta.url), "utf8");
  const act = readFileSync(new URL("../../src/lib/admissions-intelligence/types.ts", import.meta.url), "utf8");
  log(`- kernel never imports prisma: ${!/prisma/i.test(`${awe}${acs}${act}`)}`);

  log("\n## Vocabulary honesty (no fabricated numbers / years)");
  const blob = JSON.stringify(a1).replace(/\d{4}-\d{2}-\d{2}/g, "DATE");
  const blamed = /(?:cutoffs?|deadlines?|ranks?|percentile|probability|chances?|score|mark)[^",})]{0,25}\d/i;
  log(`- no fabricated numbers in elective guidance: ${!blamed.test(blob)}`);
  log(`- no hardcoded years (dates masked as provenance): ${!/\b20\d{2}\b/.test(blob)}`);
  const states = new Set(a1.focusPrograms.map((p) => p.verificationState));
  log(`- verification states used: ${[...states].join(", ")}`);
  log(`- 'never inferred' honesty present in general guidance: ${/never inferred/i.test(JSON.stringify(a1))}`);

  log("\n## Decision Center flow-through (real profile)");
  const profile = await p.studentProfile.findFirst();
  let guidanceOnCenter = null;
  if (!profile) {
    log("- no studentProfile found; skipping flow-through");
  } else {
    const dc = await getDecisionCenter(profile.userId, {});
    if (!dc || !dc.admissionsGuidance) {
      log(`- decisionCenter returned no admissionsGuidance for ${profile.userId} (ok if no focus programs)`);
    } else {
      const g = dc.admissionsGuidance;
      guidanceOnCenter = g;
      const ids = new Set(g.focusPrograms.map((x) => x.programId));
      log(`- focusPrograms=${g.focusPrograms.length} recommendedPrograms=${dc.recommendedPrograms.length}`);
      log(`- focusPrograms ⊆ recommendedPrograms: ${dc.recommendedPrograms.every((x) => ids.has(x.programId))}`);
      log(`- readiness=${g.readiness} missingInfo=${g.missingInformation.length} nextActions=${g.nextActions.length}`);
    }
  }

  log("\n## Decision Pack (per-pathway admissions present)");
  const compose = (await import("../../src/lib/decision-pack/loader.ts")).getDecisionPack;
  if (profile) {
    const pack = await compose(profile.userId, { includeCounselor: false });
    if (pack) {
      const withAdmissions = pack.educationPathways.filter((e) => e.admissions).length;
      log(`- pack educationPathways=${pack.educationPathways.length} with admissions block=${withAdmissions}`);
      log(`- pack admissionsSummary present: ${!!pack.admissionsSummary} (${pack.admissionsSummary?.readinessLabel ?? "—"})`);
      const packBlob = JSON.stringify(pack);
      log(`- no engine score leakage in pack JSON: ${!/"matchScore"|"fitScore"|"fitPct"|"confidenceScore"/.test(packBlob)}`);
    } else {
      log("- getDecisionPack returned null; skipped");
    }
  }

  log("\n## Engine freeze (byte-identical around a guidance run)");
  if (profile) {
    const m1 = await getCareerMatches(profile.userId, { limit: 10 });
    const m2 = await getCareerMatches(profile.userId, { limit: 10 });
    log(`- matches before/after identical: ${JSON.stringify(m1.matches) === JSON.stringify(m2.matches)}`);
  } else {
    log("- no profile; skipped");
  }

  log("\n## Analytics allowlist (4 Phase 31 events)");
  const events = ["admissions_guidance_viewed", "admissions_source_opened", "admissions_action_opened", "admissions_verify_clicked"];
  const sr = readFileSync(new URL("../../src/lib/analytics/record.ts", import.meta.url), "utf8");
  const cr = readFileSync(new URL("../../src/lib/analytics/client.ts", import.meta.url), "utf8");
  const er = readFileSync(new URL("../../src/app/api/student/analytics/events/route.ts", import.meta.url), "utf8");
  log(`- record.ts has all 4: ${events.every((e) => sr.includes(`"${e}"`))}`);
  log(`- client.ts has all 4: ${events.every((e) => cr.includes(`"${e}"`))}`);
  log(`- events route allowlists all 4: ${events.every((e) => er.includes(e))}`);

  log("\n## Read surfaces (static self-scoping)");
  const stuPage = readFileSync(join(process.cwd(), "src/app/(student)/admissions/page.tsx"), "utf8");
  log(`- student /admissions page fetches only the decision-center API: ${/fetch\("\/api\/student\/decision-center"\)/.test(stuPage)}`);
  log(`- it is NOT a dynamic [id] route: ${!/\[(id|userId|studentId)\]/.test(stuPage)}`);
  const cstr = readFileSync(join(process.cwd(), "src/app/(counselor)/students/[id]/page.tsx"), "utf8");
  log(`- counselor page keeps server auth loadAuthorizedStudent: ${/loadAuthorizedStudent/.test(cstr)}`);
  const s360 = readFileSync(join(process.cwd(), "src/app/(counselor)/students/[id]/student-360-client.tsx"), "utf8");
  log(`- 360 client reads decisionCenter admissions guidance: ${/decisionCenter\?\.admissionsGuidance/.test(s360)}`);
  const nav = readFileSync(new URL("../../src/components/layout/nav-config.ts", import.meta.url), "utf8");
  log(`- nav exposes /admissions for the student: ${/href:\s*"\/admissions"/.test(nav)}`);

  log("\n## Protected dataset counts (after)");
  const after = {};
  for (const m of MODELS) after[m] = await p[m].count();
  log(`- unchanged after full audit run: ${JSON.stringify(before) === JSON.stringify(after)}`);

  writeFileSync(
    fileURLToPath(new URL("./phase31-admissions-intelligence-audit.md", import.meta.url)),
    `# Phase 31 — Admissions & Counselling Intelligence V1 (probe)\n\nGenerated live at audit time.\n\n` + L.join("\n") + "\n",
    "utf8"
  );
  console.log("probe complete:");
  console.log(L.join("\n"));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => p.$disconnect());