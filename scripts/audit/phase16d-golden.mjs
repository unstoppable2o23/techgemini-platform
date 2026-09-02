// Phase 16D — Step 13 parameterized golden runner.
// Usage:
//   node --import ./scripts/register-loader.mjs scripts/audit/phase16d-golden.mjs --mode=before
//     (sets CAREER_MATCH__SPECIFICITY=0 => pre-16D engine behavior)
//   node --import ./scripts/register-loader.mjs scripts/audit/phase16d-golden.mjs --mode=after
//     (default engine => 16D behavior)
// Writes scripts/audit/phase16d-golden-{mode}.json and emits differentiation,
// broad-career frequency and family-diversity metrics for the final report.
import { PrismaClient } from "@prisma/client";
import { getCareerMatches } from "../../src/lib/career-matching/engine.ts";
import { generateStudentCareerProfile } from "../../src/lib/career-profile/generate.ts";
import { writeFileSync } from "node:fs";

const MODE = process.argv.find((a) => a.startsWith("--mode="))?.slice("--mode=".length) ?? "after";
if (MODE === "before") process.env.CAREER_MATCH__SPECIFICITY = "0";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

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

const GOLDEN_PROFILES = [
  { id: "A", label: "Class 8 Science-oriented", profile: { gradeLevel: "CLASS_8", subjectsStudied: ["Physics", "Chemistry", "Biology"], subjectsEnjoyed: ["Biology", "Physics"], activityInterests: ["Science / Experiments"] }, expectedFamilies: ["lifescience", "medicine", "engineering"] },
  { id: "B", label: "Class 10 science + mathematics", profile: { gradeLevel: "CLASS_10", subjectsStudied: ["Physics", "Mathematics", "Chemistry"], subjectsEnjoyed: ["Physics", "Mathematics"], activityInterests: ["Working with numbers"] }, expectedFamilies: ["engineering", "technology", "lifescience"] },
  { id: "C", label: "Class 11 PCM student", profile: { gradeLevel: "CLASS_11", subjectsStudied: ["Physics", "Chemistry", "Mathematics"], subjectsEnjoyed: ["Physics", "Mathematics"], activityInterests: ["Working with numbers", "Coding / Technology"], highestEducation: "Class 11" }, expectedFamilies: ["engineering", "technology", "finance"] },
  { id: "D", label: "Class 11 PCB student", profile: { gradeLevel: "CLASS_11", subjectsStudied: ["Physics", "Chemistry", "Biology"], subjectsEnjoyed: ["Biology", "Chemistry"], activityInterests: ["Research", "Science / Experiments"], highestEducation: "Class 11" }, expectedFamilies: ["medicine", "lifescience", "agriculture"] },
  { id: "E", label: "Class 12 commerce student", profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Business Studies", "Accountancy", "Economics"], subjectsEnjoyed: ["Business Studies", "Economics"], activityInterests: ["Working with numbers", "Business / Entrepreneurship"], highestEducation: "Class 12" }, expectedFamilies: ["finance", "business", "law"] },
  { id: "F", label: "Class 12 humanities student", profile: { gradeLevel: "CLASS_12", subjectsStudied: ["History", "Political Science", "Sociology", "English"], subjectsEnjoyed: ["History", "English"], activityInterests: ["Writing", "Communication"], highestEducation: "Class 12" }, expectedFamilies: ["humanities", "law", "education", "government"] },
  { id: "G", label: "Undergraduate CS student", profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Computer Science", "Mathematics"], subjectsEnjoyed: ["Computer Science"], activityInterests: ["Coding / Technology", "Solving problems"] }, expectedFamilies: ["technology", "engineering"] },
  { id: "H", label: "Undergraduate mechanical student", profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Physics", "Mathematics"], subjectsEnjoyed: ["Physics"], activityInterests: ["Working with machines", "Building / Making things"] }, expectedFamilies: ["engineering", "technology", "manufacturing"] },
  { id: "I", label: "Biotechnology / life-science student", profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Biology", "Chemistry"], subjectsEnjoyed: ["Biology"], activityInterests: ["Research", "Science / Experiments"], preferredCareer: "Biotechnologist" }, expectedFamilies: ["lifescience", "medicine", "agriculture"] },
  { id: "J", label: "Commerce / accounting student", profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Accountancy", "Business Studies", "Economics"], subjectsEnjoyed: ["Accountancy"], activityInterests: ["Working with numbers", "Business / Entrepreneurship"] }, expectedFamilies: ["finance", "business"] },
  { id: "K", label: "Arts / design student", profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Art", "English"], subjectsEnjoyed: ["Art"], activityInterests: ["Designing", "Creating content", "Writing"] }, expectedFamilies: ["design", "media", "architecture"] },
  { id: "L", label: "Psychology / social-science student", profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Psychology", "Sociology"], subjectsEnjoyed: ["Psychology"], activityInterests: ["Helping people", "Writing"] }, expectedFamilies: ["psychology", "education", "medicine"] },
  { id: "M", label: "Strong interest in medicine", profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Biology", "Chemistry", "Physics"], subjectsEnjoyed: ["Biology"], activityInterests: ["Helping people", "Research"], preferredCareer: "Medicine" }, expectedFamilies: ["medicine", "lifescience"] },
  { id: "N", label: "Strong interest in AI / software", profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Computer Science", "Mathematics"], subjectsEnjoyed: ["Computer Science"], activityInterests: ["Coding / Technology", "Solving problems"], preferredCareer: "Software Engineer" }, expectedFamilies: ["technology", "engineering"] },
  { id: "O", label: "Interested in business / entrepreneurship", profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Business Studies", "Economics"], subjectsEnjoyed: ["Business Studies"], activityInterests: ["Business / Entrepreneurship", "Leadership"], preferredCareer: "Entrepreneur" }, expectedFamilies: ["business", "finance"] },
  { id: "P", label: "Interested in law", profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Political Science", "History", "English"], subjectsEnjoyed: ["Political Science", "History"], activityInterests: ["Communication", "Writing"], preferredCareer: "Lawyer" }, expectedFamilies: ["law", "government", "humanities"] },
  { id: "Q", label: "Interested in architecture / design", profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Art", "Mathematics", "Physics"], subjectsEnjoyed: ["Art"], activityInterests: ["Designing", "Building / Making things"], preferredCareer: "Architect" }, expectedFamilies: ["architecture", "design", "engineering"] },
  { id: "R", label: "Undecided, broad interests", profile: { gradeLevel: "CLASS_11", subjectsStudied: ["Physics", "Biology", "Business Studies"], subjectsEnjoyed: ["Physics"], activityInterests: ["Solving problems", "Helping people", "Coding / Technology", "Designing"] }, expectedFamilies: ["engineering", "technology", "medicine", "business"] },
  { id: "S", label: "Profile with assessments only", profile: {}, assessmentSignals: [{ dimension: "INTEREST", value: "logical_reasoning", score: 85, sourceType: "ASSESSMENT", sourceAssessment: "ideal", confidence: 0.8 }, { dimension: "APTITUDE", value: "logical_mathematical", score: 85, sourceType: "ASSESSMENT", sourceAssessment: "intelligences", confidence: 0.8 }], expectedFamilies: ["technology", "engineering"] },
  { id: "T", label: "Registration / profile data only", profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Physics", "Chemistry", "Mathematics"], subjectsEnjoyed: ["Physics", "Mathematics"], activityInterests: ["Working with numbers", "Coding / Technology"] }, expectedFamilies: ["engineering", "technology", "finance"] },
  { id: "U", label: "Almost no data", profile: {}, expectedFamilies: [], noData: true },
  { id: "V", label: "Conflicting evidence profile", profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Biology", "Physics"], subjectsEnjoyed: ["Biology"], activityInterests: ["Coding / Technology", "Working with numbers"] }, expectedFamilies: ["lifescience", "technology", "medicine"] },
  { id: "W", label: "Preferred-career-only profile", profile: {}, preferredCareer: "Management Consultant", assessmentSignals: [], expectedFamilies: ["business", "finance"], preferredOnly: true },
];

let tenant, user, spId;

const report = {
  generatedAt: new Date().toISOString(),
  mode: MODE,
  specificityEnabled: process.env.CAREER_MATCH__SPECIFICITY !== "0",
  profileCount: GOLDEN_PROFILES.length,
  profiles: [],
  aggregate: {},
};

async function main() {
  tenant = await prisma.tenant.create({ data: { name: "16D", slug: `g16d-${suffix}`, subdomain: `g16d-${suffix}` } });
  user = await prisma.user.create({ data: { email: `g16d-${suffix}@x.com`, passwordHash: "x", firstName: "G16", lastName: "D", role: "STUDENT", tenantId: tenant.id } });
  spId = (await prisma.studentProfile.create({ data: { userId: user.id } })).id;
  report.careersScored = await prisma.career.count({ where: { isActive: true } });

  for (const gp of GOLDEN_PROFILES) report.profiles.push(await runProfile(gp));
  report.aggregate = aggregate(report.profiles);

  writeFileSync(new URL(`./phase16d-golden-${MODE}.json`, import.meta.url), JSON.stringify(report, null, 2), "utf8");
  console.log("report written: phase16d-golden-" + MODE + ".json");
  console.log("SPECIFICITY=" + report.specificityEnabled);
  console.log("SCORE_B=" + JSON.stringify(report.aggregate.scoreBuckets));
  console.log("CONF_L=" + JSON.stringify(report.aggregate.confLevels));
  console.log("FAMILIES_AVG=" + report.aggregate.avgFamiliesTop10);
  console.log("TOP5_BROAD=" + JSON.stringify(report.aggregate.broadTop5));
  console.log("PREFERRED#1=" + report.aggregate.preferredRankedFirst.join(","));
  console.log("LOW_INFO_PROFILES=" + report.aggregate.lowInfoProfiles.join(","));
  console.log("DUPLICATE_SCORE_TOPTEN_avg=" + report.aggregate.dupScoreSpanTop10);
}

async function reset() {
  await prisma.studentProfile.update({ where: { id: spId }, data: { preferredCareer: null, preferredCareerId: null, gradeLevel: null, studyLevel: null, highestEducation: null, subjectsStudied: [], subjectsEnjoyed: [], activityInterests: [], exams: [] } });
  const cp = await prisma.studentCareerProfile.findUnique({ where: { studentId: user.id }, include: { signals: { select: { id: true } } } });
  if (cp?.signals?.length) await prisma.studentCareerSignal.deleteMany({ where: { profileId: cp.id } });
}

async function runProfile(gp) {
  await reset();
  if (gp.profile && Object.keys(gp.profile).length) await prisma.studentProfile.update({ where: { id: spId }, data: gp.profile });
  if (gp.preferredCareer) await prisma.studentProfile.update({ where: { id: spId }, data: { preferredCareer: gp.preferredCareer } });
  await generateStudentCareerProfile(user.id);
  if (gp.assessmentSignals?.length) {
    const cp2 = await prisma.studentCareerProfile.findUnique({ where: { studentId: user.id } });
    await prisma.studentCareerSignal.createMany({ data: gp.assessmentSignals.map((s) => ({ profileId: cp2.id, dimension: s.dimension, value: s.value, score: s.score, sourceType: "ASSESSMENT", sourceAssessment: s.sourceAssessment, confidence: s.confidence ?? 0.8, sourceVersion: "1.0" })) });
  }
  const res = await getCareerMatches(user.id, { limit: 20 });
  const fam = (c) => CATEGORY_TO_FAMILY[c.category] ?? c.category ?? "unknown";
  const ser = (m) => ({ name: m.career.name, category: m.career.category, family: fam(m.career), score: m.matchScore, conf: m.confidenceScore, level: m.confidenceDetail.level, dims: m.supportedDimensions, pref: m.preferenceBoost, nDims: m.supportedDimensions });
  const top5 = res.matches.slice(0, 5).map(ser);
  const top10 = res.matches.slice(0, 10).map(ser);
  const top20 = res.matches.slice(0, 20).map(ser);
  const present = (list) => [...new Set(list.map((m) => m.family))];
  const expectedHit = gp.expectedFamilies.filter((f) => present(top10).includes(f));
  const prefHit = res.matches.find((m) => m.preferenceBoost);
  // score spread within top-10 (duplicate-score problem)
  const scoresTop10 = top10.map((m) => m.score);
  const spread = Math.max(...scoresTop10) - Math.min(...scoresTop10);
  const topScore = new Map();
  for (const m of top10) topScore.set(m.score, (topScore.get(m.score) || 0) + 1);
  const dupScoreCount = Math.max(...topScore.values());
  return {
    id: gp.id, label: gp.label, noData: !!gp.noData, preferredOnly: !!gp.preferredOnly,
    expectedFamilies: gp.expectedFamilies, expectedHitTop10: expectedHit,
    top5, top10, top20,
    presentFamiliesTop10: present(top10),
    distinctFamiliesTop10: present(top10).length,
    scoreDist: { min: Math.min(...top20.map((m) => m.score)), max: Math.max(...top20.map((m) => m.score)), avg: Math.round(top20.reduce((a, m) => a + m.score, 0) / (top20.length || 1)) },
    scoreSpreadTop10: spread,
    maxDupScoreTop10: dupScoreCount,
    confDist: { levels: group(top20, (m) => m.level), min: Math.min(...top20.map((m) => m.conf)), max: Math.max(...top20.map((m) => m.conf)) },
    prefBehavior: prefHit ? { name: prefHit.career.name, rank: res.matches.indexOf(prefHit) + 1 } : null,
    lowInformation: res.lowInformation,
    topMatchStrength: res.topMatchStrength,
  };
}

function group(list, fn) { const o = {}; for (const x of list) { const k = fn(x); o[k] = (o[k] || 0) + 1; } return o; }

function aggregate(profiles) {
  const allScores = [], confLevels = {}, lowInfo = [], broadTop5 = {}, pref1 = [], spreads = [];
  for (const p of profiles) {
    for (const m of p.top20) allScores.push(m.score);
    for (const [k, v] of Object.entries(p.confDist.levels)) confLevels[k] = (confLevels[k] || 0) + v;
    if (p.lowInformation) lowInfo.push(p.id);
    for (const m of p.top5) broadTop5[m.name] = (broadTop5[m.name] || 0) + 1;
    if (p.prefBehavior?.rank === 1) pref1.push(`${p.id}:${p.prefBehavior.name}`);
    spreads.push(p.scoreSpreadTop10);
  }
  const bucket = (v) => v >= 90 ? "90-100" : v >= 70 ? "70-89" : v >= 60 ? "60-69" : v >= 50 ? "50-59" : v >= 40 ? "40-49" : v >= 30 ? "30-39" : v >= 20 ? "20-29" : v >= 1 ? "1-19" : "0";
  const b = {};
  for (const s of allScores) { const k = bucket(s); b[k] = (b[k] || 0) + 1; }
  const avgSpread = Math.round((spreads.reduce((a, b2) => a + b2, 0) / (spreads.length || 1)) * 10) / 10;
  return {
    scoreBuckets: b,
    confLevels,
    avgFamiliesTop10: Math.round(profiles.reduce((a, p) => a + p.distinctFamiliesTop10, 0) / profiles.length * 10) / 10,
    avgScoreSpreadTop10: avgSpread,
    maxDupScoreTop10AcrossProfiles: Math.max(...profiles.map((p) => p.maxDupScoreTop10)),
    broadTop5,
    preferredRankedFirst: pref1,
    lowInfoProfiles: lowInfo,
    expectedFamilyHitRate: profiles.filter((p) => p.expectedHitTop10.length === p.expectedFamilies.length).length,
  };
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