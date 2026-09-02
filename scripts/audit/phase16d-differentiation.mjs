// Phase 16D — Step 6 (differentiation) + Step 12 (confidence reachability).
// Read-only diagnostic. Builds rich profile+assessment students and checks:
//  - whether distinct-evidence students get distinct rankings (differentiation)
//  - whether a genuinely well-evidenced profile can reach MODERATE/HIGH confidence
//  - the exact factors (matched signals, dims, coverage, source) that cap confidence
import { PrismaClient } from "@prisma/client";
import { getCareerMatches } from "../../src/lib/career-matching/engine.ts";
import { generateStudentCareerProfile } from "../../src/lib/career-profile/generate.ts";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);
let tenant, user, spId;

const CATEGORY_TO_FAMILY = {
  "Technology & Software": "technology", "Data & AI": "technology", Engineering: "engineering",
  "Healthcare & Medicine": "medicine", "Life Sciences": "lifescience", "Finance & Accounting": "finance",
  "Business & Management": "business", "Marketing & Advertising": "business", Sales: "business",
  Law: "law", "Government & Public Services": "government", Humanities: "humanities", Education: "education",
  "Psychology & Social Sciences": "psychology", "Design & Creative": "design", "Media & Communication": "media",
  "Architecture & Planning": "architecture", "Environment & Sustainability": "environment",
  Agriculture: "agriculture", Manufacturing: "manufacturing", "Logistics & Supply Chain": "logistics",
  "Sports & Fitness": "sports", "Hospitality & Tourism": "hospitality",
};

async function setup() {
  tenant = await prisma.tenant.create({ data: { name: "16D", slug: `g16d-${suffix}`, subdomain: `g16d-${suffix}` } });
  user = await prisma.user.create({ data: { email: `g16d-${suffix}@x.com`, passwordHash: "x", firstName: "G16", lastName: "D", role: "STUDENT", tenantId: tenant.id } });
  spId = (await prisma.studentProfile.create({ data: { userId: user.id } })).id;
}
async function reset() {
  await prisma.studentProfile.update({ where: { id: spId }, data: { preferredCareer: null, preferredCareerId: null, gradeLevel: null, studyLevel: null, highestEducation: null, subjectsStudied: [], subjectsEnjoyed: [], activityInterests: [], exams: [] } });
  const cp = await prisma.studentCareerProfile.findUnique({ where: { studentId: user.id }, include: { signals: { select: { id: true } } } });
  if (cp?.signals?.length) await prisma.studentCareerSignal.deleteMany({ where: { profileId: cp.id } });
}
async function seedAssess(dims) {
  const cp = await prisma.studentCareerProfile.findUnique({ where: { studentId: user.id } });
  await prisma.studentCareerSignal.createMany({ data: dims.map((d) => ({ profileId: cp.id, dimension: d.dimension, value: d.value, score: d.score ?? 85, sourceType: "ASSESSMENT", sourceAssessment: d.assessment ?? "ideal", confidence: 0.8, sourceVersion: "1.0" })) });
}
async function run(profile, assessments, preferred) {
  await reset();
  if (profile && Object.keys(profile).length) await prisma.studentProfile.update({ where: { id: spId }, data: profile });
  if (preferred) await prisma.studentProfile.update({ where: { id: spId }, data: { preferredCareer: preferred } });
  await generateStudentCareerProfile(user.id);
  if (assessments?.length) await seedAssess(assessments);
  const res = await getCareerMatches(user.id, { limit: 20 });
  return {
    top10: res.matches.slice(0, 10).map((m) => ({ name: m.career.name, fam: CATEGORY_TO_FAMILY[m.career.category] ?? m.career.category, score: m.matchScore, conf: m.confidenceScore, level: m.confidenceDetail.level, nDims: m.supportedDimensions })),
    confFactors: res.matches[0]?.confidenceDetail?.factors,
    topConf: { level: res.matches.reduce((a, m) => (scale(m.confidenceDetail.level) > scale(a) ? m.confidenceDetail.level : a), "LOW"), maxConf: Math.max(...res.matches.map((m) => m.confidenceScore)) },
  };
}
const scale = (l) => (l === "HIGH" ? 3 : l === "MODERATE" ? 2 : 1);

const CS = { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Computer Science", "Mathematics", "Physics"], subjectsEnjoyed: ["Computer Science"], activityInterests: ["Coding / Technology", "Solving problems"] };
const PCB = { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Biology", "Chemistry", "Physics"], subjectsEnjoyed: ["Biology", "Chemistry"], activityInterests: ["Research", "Science / Experiments"] };
const COMMERCE = { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Accountancy", "Business Studies", "Economics"], subjectsEnjoyed: ["Accountancy", "Economics"], activityInterests: ["Working with numbers", "Business / Entrepreneurship"] };
const DESIGN = { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Art", "English"], subjectsEnjoyed: ["Art"], activityInterests: ["Designing", "Creating content"] };
const LAW = { gradeLevel: "CLASS_12", subjectsStudied: ["Political Science", "History", "English"], subjectsEnjoyed: ["Political Science", "History"], activityInterests: ["Communication", "Writing"] };

async function main() {
  await setup();
  const cases = [
    { label: "CS rich", profile: CS, assessments: [{ dimension: "APTITUDE", value: "logical_reasoning", assessment: "intelligences" }, { dimension: "WORK_ENVIRONMENT", value: "independent_preference", assessment: "ideal" }, { dimension: "INTEREST", value: "technology", assessment: "ideal" }] },
    { label: "PCB rich", profile: PCB, assessments: [{ dimension: "APTITUDE", value: "attention_to_detail", assessment: "intelligences" }, { dimension: "WORK_ENVIRONMENT", value: "prefers_structure", assessment: "ideal" }, { dimension: "INTEREST", value: "research", assessment: "ideal" }] },
    { label: "Commerce rich", profile: COMMERCE, assessments: [{ dimension: "APTITUDE", value: "logical_mathematical", assessment: "intelligences" }, { dimension: "WORK_ENVIRONMENT", value: "prefers_structure", assessment: "ideal" }] },
    { label: "Design rich", profile: DESIGN, assessments: [{ dimension: "APTITUDE", value: "visual_spatial", assessment: "intelligences" }, { dimension: "WORK_ENVIRONMENT", value: "prefers_autonomy", assessment: "ideal" }] },
    { label: "Law rich", profile: LAW, assessments: [{ dimension: "APTITUDE", value: "linguistic", assessment: "intelligences" }, { dimension: "APTITUDE", value: "interpersonal", assessment: "intelligences" }, { dimension: "WORK_ENVIRONMENT", value: "collaborative_preference", assessment: "ideal" }] },
  ];
  const out = { cases: [] };
  const famFreq = {};
  for (const c of cases) {
    const r = await run(c.profile, c.assessments);
    const fams = [...new Set(r.top10.map((m) => m.fam))];
    for (const f of fams) famFreq[f] = (famFreq[f] || 0) + 1;
    out.cases.push({ label: c.label, topConf: r.topConf, confFactors: r.confFactors, distinctFamiliesTop10: fams.length, top10: r.top10.map((m) => `${m.name}[${m.score}/${m.conf}/${m.level}](${m.fam})`) });
    console.log(`\n[${c.label}] topConf=${r.topConf.level} maxConfScore=${r.topConf.maxConf} families=${fams.length}`);
    console.log("  factors:", JSON.stringify(r.confFactors));
    r.top10.forEach((m, i) => console.log(`   ${i + 1}. ${m.name.padEnd(34)} ${m.score}/${m.conf}/${m.level} (${m.fam})`));
  }

  // Differentiation: compare whether CS-rich and PCB-rich students share the same
  // top-ranking (they should NOT). Cross-overlap of top-5 names between very
  // different profiles.
  const csTop5 = (await run(CS, cases[0].assessments)).top10.slice(0, 5).map((m) => m.name);
  const pcbTop5 = (await run(PCB, cases[1].assessments)).top10.slice(0, 5).map((m) => m.name);
  const overlap = csTop5.filter((n) => pcbTop5.includes(n));
  console.log("\n[DIFFERENTIATION] CS-top5 vs PCB-top5 overlap:", overlap.length, "of", csTop5.length, "->", overlap.join(", ") || "none");
  out.differentiation = { csTop5, pcbTop5, overlap: overlap.length };
  out.familyFreqInTop10AcrossCases = famFreq;

  writeFileSync(new URL("./phase16d-differentiation.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
  console.log("\ndifferentiation written to scripts/audit/phase16d-differentiation.json");
  console.log("FAMILY_FREQ_TOP10=" + JSON.stringify(famFreq));
}

try { await main(); } finally {
  try {
    const cp = await prisma.studentCareerProfile.findUnique({ where: { studentId: user.id } });
    if (cp) await prisma.studentCareerSignal.deleteMany({ where: { profileId: cp.id } });
    await prisma.studentCareerProfile.deleteMany({ where: { studentId: user.id } });
    await prisma.studentProfile.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  } catch (e) { console.log("teardown warn: " + e.message.split("\n")[0]); }
  await prisma.$disconnect();
}