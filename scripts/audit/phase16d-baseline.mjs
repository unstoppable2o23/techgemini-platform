// Phase 16D — Step 2: score-distribution baseline.
// Read-only diagnostics on the CURRENT (16C) engine. Produces:
//   scripts/audit/phase16d-baseline.json
//   scripts/audit/phase16d-baseline.md
//
// Leverages the reusable golden harness logic but adds the fine-grained score
// and confidence buckets, family-diversity, broad-career and preferred-career
// measures requested in the phase brief. NO scoring changes here.

import { PrismaClient } from "@prisma/client";
import { getCareerMatches } from "../../src/lib/career-matching/engine.ts";
import { generateStudentCareerProfile } from "../../src/lib/career-profile/generate.ts";
import { writeFileSync } from "node:fs";

const OUT_REL = "phase16d-baseline";
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

// Reuse the same golden profile definitions as the 16B harness.
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
  { id: "O", label: "Interested in business / entrepreneurship", profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Business Studies", "Economics"], subjectsEnjoyed: ["Business Studies"], activityInterests: ["Business / Entrepreneurship", "Leadership"], preferredCareer: "Entrepreneur" }, expectedFamilies: ["business", "finance", "marketing"] },
  { id: "P", label: "Interested in law", profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Political Science", "History", "English"], subjectsEnjoyed: ["Political Science", "History"], activityInterests: ["Communication", "Writing"], preferredCareer: "Lawyer" }, expectedFamilies: ["law", "government", "humanities"] },
  { id: "Q", label: "Interested in architecture / design", profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Art", "Mathematics", "Physics"], subjectsEnjoyed: ["Art"], activityInterests: ["Designing", "Building / Making things"], preferredCareer: "Architect" }, expectedFamilies: ["architecture", "design", "engineering"] },
  { id: "R", label: "Undecided, broad interests", profile: { gradeLevel: "CLASS_11", subjectsStudied: ["Physics", "Biology", "Business Studies"], subjectsEnjoyed: ["Physics"], activityInterests: ["Solving problems", "Helping people", "Coding / Technology", "Designing"] }, expectedFamilies: ["engineering", "technology", "medicine", "business"] },
  { id: "S", label: "Profile with assessments only", profile: {}, assessmentSignals: [{ dimension: "INTEREST", value: "logical_reasoning", score: 85, sourceType: "ASSESSMENT", sourceAssessment: "ideal", confidence: 0.8 }, { dimension: "APTITUDE", value: "logical_mathematical", score: 85, sourceType: "ASSESSMENT", sourceAssessment: "intelligences", confidence: 0.8 }], expectedFamilies: ["technology", "engineering"] },
  { id: "T", label: "Registration / profile data only", profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Physics", "Chemistry", "Mathematics"], subjectsEnjoyed: ["Physics", "Mathematics"], activityInterests: ["Working with numbers", "Coding / Technology"] }, expectedFamilies: ["engineering", "technology", "finance"] },
  { id: "U", label: "Almost no data", profile: {}, expectedFamilies: [], noData: true },
  { id: "V", label: "Conflicting evidence profile", profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Biology", "Physics"], subjectsEnjoyed: ["Biology"], activityInterests: ["Coding / Technology", "Working with numbers"] }, expectedFamilies: ["lifescience", "technology", "medicine"] },
  { id: "W", label: "Preferred-career-only profile", profile: {}, preferredCareer: "Management Consultant", assessmentSignals: [], expectedFamilies: ["business", "finance"], preferredOnly: true },
];

const str = (m) => ({ name: m.career.name, category: m.career.category, family: CATEGORY_TO_FAMILY[m.career.category] ?? m.career.category, score: m.matchScore, conf: m.confidenceScore, level: m.confidenceDetail.level, dims: (m.dimensionScores || []).filter((d) => d.matchedCount > 0).map((d) => `${d.dimension}:${d.score}`), nDims: m.supportedDimensions, prefBoost: m.preferenceBoost, strength: m.matchStrength, types: m.matchTypes });
const bucket = (v, edges) => edges.map(([lo, hi, label]) => (v >= lo && v <= hi ? label : null)).find(Boolean) ?? "0";
const SCORE_EDGES = [[90,100,"90-100"],[70,89,"70-89"],[60,69,"60-69"],[50,59,"50-59"],[40,49,"40-49"],[30,39,"30-39"],[20,29,"20-29"],[1,19,"1-19"],[0,0,"0"]];
const CONF_EDGES = [[0.7,1,"0.70-1.00"],[0.4,0.69,"0.40-0.69"],[0.1,0.39,"0.10-0.39"],[0,0.09,"<0.10"]];

let tenant, user, studentProfileId;
const report = { generatedAt: new Date().toISOString(), profiles: [], aggregate: {} };

async function main() {
  tenant = await prisma.tenant.create({ data: { name: "16D", slug: `g16d-${suffix}`, subdomain: `g16d-${suffix}` } });
  user = await prisma.user.create({ data: { email: `g16d-${suffix}@x.com`, passwordHash: "x", firstName: "G16", lastName: "D", role: "STUDENT", tenantId: tenant.id } });
  studentProfileId = (await prisma.studentProfile.create({ data: { userId: user.id } })).id;
  report.careersScored = await prisma.career.count({ where: { isActive: true } });

  for (const gp of GOLDEN_PROFILES) report.profiles.push(await runProfile(gp));
  report.aggregate = aggregate(report.profiles);
  report.dataQuality = await dataQuality();

  const md = buildMarkdown(report);
  writeFileSync(new URL(`./phase16d-baseline.json`, import.meta.url), JSON.stringify(report, null, 2), "utf8");
  writeFileSync(new URL(`./phase16d-baseline.md`, import.meta.url), md, "utf8");
  console.log("baseline written to scripts/audit/phase16d-baseline.json/.md");
  console.log("SCORE_BUCKETS=" + JSON.stringify(report.aggregate.scoreBuckets));
  console.log("CONF_BUCKETS=" + JSON.stringify(report.aggregate.confBuckets));
  console.log("DISTINCT_FAMILIES_PER_TOP10 avg=" + report.aggregate.avgFamiliesTop10 + " min=" + report.aggregate.minFamiliesTop10);
  console.log("TOP_SCORING_CAREERS=" + JSON.stringify(report.aggregate.topScoringCareers.slice(0, 10)));
}

async function runProfile(gp) {
  await prisma.studentProfile.update({ where: { id: studentProfileId }, data: { preferredCareer: null, preferredCareerId: null, gradeLevel: null, studyLevel: null, highestEducation: null, subjectsStudied: [], subjectsEnjoyed: [], activityInterests: [], exams: [] } });
  const profileRow = await prisma.studentCareerProfile.findUnique({ where: { studentId: user.id }, include: { signals: { select: { id: true } } } });
  if (profileRow?.signals?.length) await prisma.studentCareerSignal.deleteMany({ where: { profileId: profileRow.id } });
  if (gp.profile && Object.keys(gp.profile).length) await prisma.studentProfile.update({ where: { id: studentProfileId }, data: gp.profile });
  if (gp.preferredCareer) await prisma.studentProfile.update({ where: { id: studentProfileId }, data: { preferredCareer: gp.preferredCareer } });
  await generateStudentCareerProfile(user.id);
  if (gp.assessmentSignals?.length) {
    const pr2 = await prisma.studentCareerProfile.findUnique({ where: { studentId: user.id } });
    await prisma.studentCareerSignal.createMany({ data: gp.assessmentSignals.map((s) => ({ profileId: pr2.id, dimension: s.dimension, value: s.value, score: s.score, sourceType: "ASSESSMENT", sourceAssessment: s.sourceAssessment, confidence: s.confidence ?? 0.8, sourceVersion: "1.0" })) });
  }
  const res = await getCareerMatches(user.id, { limit: 20 });
  const top5 = res.matches.slice(0, 5).map(str);
  const top10 = res.matches.slice(0, 10).map(str);
  const top20 = res.matches.slice(0, 20).map(str);
  const fam10 = new Set(top10.map((m) => m.family));
  const prefHit = res.matches.find((m) => m.preferenceBoost);
  const dimCounts = {};
  for (const m of top20) { dimCounts[m.nDims] = (dimCounts[m.nDims] || 0) + 1; }
  return {
    id: gp.id, label: gp.label, noData: !!gp.noData, preferredOnly: !!gp.preferredOnly,
    expectedFamilies: gp.expectedFamilies,
    top5, top10, top20,
    scoreDist: { min: Math.min(...top20.map((m) => m.score)), max: Math.max(...top20.map((m) => m.score)), avg: Math.round(top20.reduce((a, m) => a + m.score, 0) / (top20.length || 1)) },
    confDist: { min: Math.min(...top20.map((m) => m.conf)), max: Math.max(...top20.map((m) => m.conf)) },
    distinctFamiliesTop10: fam10.size,
    top10Families: [...fam10],
    dimensionUsageTop20: dimCounts,
    prefBehavior: prefHit ? { name: prefHit.career.name, rank: res.matches.indexOf(prefHit) + 1, confLevel: prefHit.confidenceDetail.level } : null,
    familyCoverageTop5: [...new Set(top5.map((m) => m.family))],
    familyCoverageTop10: [...fam10],
  };
}

function aggregate(profiles) {
  const allScores = [], allConf = [], famTop10 = [], topScoring = new Map();
  for (const p of profiles) {
    for (const m of p.top20) { allScores.push(m.score); allConf.push(m.level); }
    famTop10.push(p.distinctFamiliesTop10);
    for (const m of p.top10) topScoring.set(m.name, (topScoring.get(m.name) || 0) + 1);
  }
  const buckets = {};
  for (const v of allScores) { const k = bucket(v, SCORE_EDGES); buckets[k] = (buckets[k] || 0) + 1; }
  const confB = {};
  const confOf = (l) => (l === "HIGH" ? 0.85 : l === "MODERATE" ? 0.5 : 0.2);
  for (const v of allConf) { const k = bucket(confOf(v), CONF_EDGES); confB[k] = (confB[k] || 0) + 1; }
  return {
    scoreBuckets: buckets, confBuckets: confB,
    confLevelCounts: profiles.map((p) => p.top20.reduce((a, m) => { a[m.level] = (a[m.level] || 0) + 1; return a; }, {})).reduce((a, c) => { for (const k of Object.keys(c)) a[k] = (a[k] || 0) + c[k]; return a; }, {}),
    avgFamiliesTop10: Math.round(famTop10.reduce((a, b) => a + b, 0) / famTop10.length * 10) / 10,
    minFamiliesTop10: Math.min(...famTop10), maxFamiliesTop10: Math.max(...famTop10),
    topScoringCareers: [...topScoring.entries()].sort((a, b) => b[1] - a[1]),
  };
}



async function dataQuality() {
  const careers = await prisma.career.findMany({ where: { isActive: true }, select: { name: true, category: true, interests: true, technicalSkills: true, softSkills: true, personalityTraits: true, recommendedSubjects: true, recommendedDegrees: true, traits: { select: { dimension: true, value: true } }, careerEducationPathways: { select: { id: true } } } });
  const gaps = [];
  for (const c of careers) {
    const problems = [];
    if (!(c.interests && c.interests.length)) problems.push("no interests");
    if (!(c.technicalSkills && c.technicalSkills.length) && !(c.softSkills && c.softSkills.length)) problems.push("no skills");
    if (!(c.personalityTraits && c.personalityTraits.length)) problems.push("no personalityTraits");
    if (!(c.recommendedSubjects && c.recommendedSubjects.length)) problems.push("no recommendedSubjects");
    if (!(c.recommendedDegrees && c.recommendedDegrees.length)) problems.push("no recommendedDegrees");
    if (!(c.careerEducationPathways && c.careerEducationPathways.length)) problems.push("no education pathway");
    if (!c.traits || c.traits.length === 0) problems.push("no CareerTrait records");
    if (problems.length) gaps.push({ name: c.name, category: c.category, problems });
  }
  return { audited: careers.length, totalWithGaps: gaps.length };
}

function buildMarkdown(report) {
  const L = [];
  L.push("# Phase 16D — Baseline (current 16C engine)\n");
  L.push(`Generated ${report.generatedAt} · active careers scored: ${report.careersScored} · profiles: ${report.profiles.length}\n`);
  L.push("## Score buckets (all top-20)\n| Bucket | Count |");
  L.push("|---|---|");
  for (const k of Object.keys(OrderedScore)) L.push(`| ${k} | ${report.aggregate.scoreBuckets[k] || 0} |`);
  L.push("\n## Confidence levels (all top-20)\n| Level | Count |");
  L.push("|---|---|");
  const lv = report.aggregate.confLevelCounts;
  for (const k of ["HIGH", "MODERATE", "LOW"]) L.push(`| ${k} | ${lv[k] || 0} |`);
  L.push("\n## Family diversity in top-10\n" + `distinct families avg=${report.aggregate.avgFamiliesTop10}, min=${report.aggregate.minFamiliesTop10}, max=${report.aggregate.maxFamiliesTop10}`);
  L.push("\n## Per-profile\n| ID | Label | score | conf(level) | families(top10) | pref |");
  L.push("|---|---|---|---|---|---|");
  for (const p of report.profiles) {
    const pref = p.prefBehavior ? `${p.prefBehavior.name}#${p.prefBehavior.rank}` : "-";
    L.push(`| ${p.id} | ${p.label} | ${p.scoreDist.min}-${p.scoreDist.max} avg${p.scoreDist.avg} | ${p.confDist.min}-${p.confDist.max} | ${p.distinctFamiliesTop10} | ${pref} |`);
  }
  L.push("\n## Most frequent top-10 careers\n| Career | Profiles |");
  L.push("|---|---|");
  for (const [name, n] of report.aggregate.topScoringCareers.slice(0, 25)) L.push(`| ${name} | ${n} |`);
  return L.join("\n");
}
const OrderedScore = { "90-100": 1, "70-89": 1, "60-69": 1, "50-59": 1, "40-49": 1, "30-39": 1, "20-29": 1, "1-19": 1, "0": 1 };

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