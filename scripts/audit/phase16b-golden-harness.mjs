// Phase 16B — Career Matching Quality Validation V1 — golden harness.
//
// Reusable, deterministic audit: seeds a transient test student per golden
// profile, runs the REAL engine (generateStudentCareerProfile -> getCareerMatches)
// against the REAL active career catalog, and emits a machine-readable JSON
// report plus a concise prose summary.
//
// Usage: node --import ./scripts/register-loader.mjs scripts/audit/phase16b-golden-harness.mjs
//         optional arg: --out=<path> to write the JSON report
//
// This is TEST/validation code only. It creates NO production student accounts
// (transient tenant/user/studentProfile, deleted in teardown). University and
// IndianInstitution data are never read beyond the careers used by existing
// engine tests, and are never modified.

import { PrismaClient } from "@prisma/client";
import { getCareerMatches } from "../../src/lib/career-matching/engine.ts";
import { generateStudentCareerProfile } from "../../src/lib/career-profile/generate.ts";
import { writeFileSync } from "node:fs";

const OUT_ARG = process.argv.find((a) => a.startsWith("--out="));
const OUT_PATH = OUT_ARG ? OUT_ARG.slice("--out=".length) : null;

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

// ---------------------------------------------------------------------------
// Career family taxonomy (category -> family)
// ---------------------------------------------------------------------------
const CATEGORY_TO_FAMILY = {
  "Technology & Software": "technology",
  "Data & AI": "technology",
  Engineering: "engineering",
  "Healthcare & Medicine": "medicine",
  "Life Sciences": "lifescience",
  "Finance & Accounting": "finance",
  "Business & Management": "business",
  "Marketing & Advertising": "business",
  Sales: "business",
  Law: "law",
  "Government & Public Services": "government",
  Humanities: "humanities",
  Education: "education",
  "Psychology & Social Sciences": "psychology",
  "Design & Creative": "design",
  "Media & Communication": "media",
  "Architecture & Planning": "architecture",
  "Environment & Sustainability": "environment",
  Agriculture: "agriculture",
  Manufacturing: "manufacturing",
  "Logistics & Supply Chain": "logistics",
  "Sports & Fitness": "sports",
  "Hospitality & Tourism": "hospitality",
};

// ---------------------------------------------------------------------------
// Golden profiles. Each has: id, label, profile (StudentProfile fields),
// optional preferredCareer, optional assessmentSignals (StudentCareerSignal rows),
// and expectedFamilies (list of family ids required in top-N).
// ---------------------------------------------------------------------------
const GOLDEN_PROFILES = [
  {
    id: "A", label: "Class 8 Science-oriented",
    profile: { gradeLevel: "CLASS_8", subjectsStudied: ["Physics", "Chemistry", "Biology"], subjectsEnjoyed: ["Biology", "Physics"], activityInterests: ["Science / Experiments"] },
    expectedFamilies: ["lifescience", "medicine", "engineering"],
  },
  {
    id: "B", label: "Class 10 science + mathematics",
    profile: { gradeLevel: "CLASS_10", subjectsStudied: ["Physics", "Mathematics", "Chemistry"], subjectsEnjoyed: ["Physics", "Mathematics"], activityInterests: ["Working with numbers"] },
    expectedFamilies: ["engineering", "technology", "lifescience"],
  },
  {
    id: "C", label: "Class 11 PCM student",
    profile: { gradeLevel: "CLASS_11", subjectsStudied: ["Physics", "Chemistry", "Mathematics"], subjectsEnjoyed: ["Physics", "Mathematics"], activityInterests: ["Working with numbers", "Coding / Technology"], highestEducation: "Class 11" },
    expectedFamilies: ["engineering", "technology", "finance"],
  },
  {
    id: "D", label: "Class 11 PCB student",
    profile: { gradeLevel: "CLASS_11", subjectsStudied: ["Physics", "Chemistry", "Biology"], subjectsEnjoyed: ["Biology", "Chemistry"], activityInterests: ["Research", "Science / Experiments"], highestEducation: "Class 11" },
    expectedFamilies: ["medicine", "lifescience", "agriculture"],
  },
  {
    id: "E", label: "Class 12 commerce student",
    profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Business Studies", "Accountancy", "Economics"], subjectsEnjoyed: ["Business Studies", "Economics"], activityInterests: ["Working with numbers", "Business / Entrepreneurship"], highestEducation: "Class 12" },
    expectedFamilies: ["finance", "business", "law"],
  },
  {
    id: "F", label: "Class 12 humanities student",
    profile: { gradeLevel: "CLASS_12", subjectsStudied: ["History", "Political Science", "Sociology", "English"], subjectsEnjoyed: ["History", "English"], activityInterests: ["Writing", "Communication"], highestEducation: "Class 12" },
    expectedFamilies: ["humanities", "law", "education", "government"],
  },
  {
    id: "G", label: "Undergraduate CS student",
    profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Computer Science", "Mathematics"], subjectsEnjoyed: ["Computer Science"], activityInterests: ["Coding / Technology", "Solving problems"] },
    expectedFamilies: ["technology", "engineering"],
  },
  {
    id: "H", label: "Undergraduate mechanical student",
    profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Physics", "Mathematics"], subjectsEnjoyed: ["Physics"], activityInterests: ["Working with machines", "Building / Making things"] },
    expectedFamilies: ["engineering", "technology", "manufacturing"],
  },
  {
    id: "I", label: "Biotechnology / life-science student",
    profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Biology", "Chemistry"], subjectsEnjoyed: ["Biology"], activityInterests: ["Research", "Science / Experiments"], preferredCareer: "Biotechnologist" },
    expectedFamilies: ["lifescience", "medicine", "agriculture"],
  },
  {
    id: "J", label: "Commerce / accounting student",
    profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Accountancy", "Business Studies", "Economics"], subjectsEnjoyed: ["Accountancy"], activityInterests: ["Working with numbers", "Business / Entrepreneurship"] },
    expectedFamilies: ["finance", "business"],
  },
  {
    id: "K", label: "Arts / design student",
    profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Art", "English"], subjectsEnjoyed: ["Art"], activityInterests: ["Designing", "Creating content", "Writing"] },
    expectedFamilies: ["design", "media", "architecture"],
  },
  {
    id: "L", label: "Psychology / social-science student",
    profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Psychology", "Sociology"], subjectsEnjoyed: ["Psychology"], activityInterests: ["Helping people", "Writing"] },
    expectedFamilies: ["psychology", "education", "medicine"],
  },
  {
    id: "M", label: "Strong interest in medicine",
    profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Biology", "Chemistry", "Physics"], subjectsEnjoyed: ["Biology"], activityInterests: ["Helping people", "Research"], preferredCareer: "Medicine" },
    expectedFamilies: ["medicine", "lifescience"],
  },
  {
    id: "N", label: "Strong interest in AI / software",
    profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Computer Science", "Mathematics"], subjectsEnjoyed: ["Computer Science"], activityInterests: ["Coding / Technology", "Solving problems"], preferredCareer: "Software Engineer" },
    expectedFamilies: ["technology", "engineering"],
  },
  {
    id: "O", label: "Interested in business / entrepreneurship",
    profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Business Studies", "Economics"], subjectsEnjoyed: ["Business Studies"], activityInterests: ["Business / Entrepreneurship", "Leadership"], preferredCareer: "Entrepreneur" },
    expectedFamilies: ["business", "finance", "marketing"],
  },
  {
    id: "P", label: "Interested in law",
    profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Political Science", "History", "English"], subjectsEnjoyed: ["Political Science", "History"], activityInterests: ["Communication", "Writing"], preferredCareer: "Lawyer" },
    expectedFamilies: ["law", "government", "humanities"],
  },
  {
    id: "Q", label: "Interested in architecture / design",
    profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Art", "Mathematics", "Physics"], subjectsEnjoyed: ["Art"], activityInterests: ["Designing", "Building / Making things"], preferredCareer: "Architect" },
    expectedFamilies: ["architecture", "design", "engineering"],
  },
  {
    id: "R", label: "Undecided, broad interests",
    profile: { gradeLevel: "CLASS_11", subjectsStudied: ["Physics", "Biology", "Business Studies"], subjectsEnjoyed: ["Physics"], activityInterests: ["Solving problems", "Helping people", "Coding / Technology", "Designing"] },
    expectedFamilies: ["engineering", "technology", "medicine", "business"],
  },
  {
    id: "S", label: "Profile with assessments only",
    profile: {},
    assessmentSignals: [
      { dimension: "INTEREST", value: "logical_reasoning", score: 85, sourceType: "ASSESSMENT", sourceAssessment: "ideal", confidence: 0.8 },
      { dimension: "APTITUDE", value: "logical_mathematical", score: 85, sourceType: "ASSESSMENT", sourceAssessment: "intelligences", confidence: 0.8 },
      { dimension: "APITTUDE_IGNORE_PLACEHOLDER", value: "", score: 0, sourceType: "ASSESSMENT", sourceAssessment: null, confidence: 0 },
    ].filter((s) => s.dimension !== "APITTUDE_IGNORE_PLACEHOLDER"),
    expectedFamilies: ["technology", "engineering"],
  },
  {
    id: "T", label: "Registration / profile data only",
    profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Physics", "Chemistry", "Mathematics"], subjectsEnjoyed: ["Physics", "Mathematics"], activityInterests: ["Working with numbers", "Coding / Technology"] },
    expectedFamilies: ["engineering", "technology", "finance"],
  },
  {
    id: "U", label: "Almost no data",
    profile: {},
    expectedFamilies: [],
    noData: true,
  },
  {
    id: "V", label: "Conflicting evidence profile",
    profile: { gradeLevel: "CLASS_12", subjectsStudied: ["Biology", "Physics"], subjectsEnjoyed: ["Biology"], activityInterests: ["Coding / Technology", "Working with numbers"] },
    expectedFamilies: ["lifescience", "technology", "medicine"],
  },
  {
    id: "W", label: "Preferred-career-only profile",
    profile: {},
    preferredCareer: "Management Consultant",
    assessmentSignals: [],
    expectedFamilies: ["business", "finance"],
    preferredOnly: true,
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const report = {
  generatedAt: new Date().toISOString(),
  profileCount: GOLDEN_PROFILES.length,
  careersScored: null,
  profiles: [],
};

let tenant, user, studentProfileId;

try {
  tenant = await prisma.tenant.create({ data: { name: "16B", slug: `g16b-${suffix}`, subdomain: `g16b-${suffix}` } });
  user = await prisma.user.create({
    data: {
      email: `g16b-${suffix}@x.com`,
      passwordHash: "x",
      firstName: "G16",
      lastName: "B",
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });
  studentProfileId = (await prisma.studentProfile.create({ data: { userId: user.id } })).id;

  const activeCount = await prisma.career.count({ where: { isActive: true } });
  report.careersScored = activeCount;

  for (const gp of GOLDEN_PROFILES) {
    const result = await runProfile(gp);
    report.profiles.push(result);
  }

  // -------------------------------------------------------------------------
  // Section 9 & 10: career-family + score distribution across profiles
  // -------------------------------------------------------------------------
  const aggregate = aggregateAcrossProfiles(report.profiles);
  report.aggregate = aggregate;
  report.dataQuality = await dataQualityCheck();
  report.familyInventory = await familyInventoryCheck();

  if (OUT_PATH) writeFileSync(OUT_PATH, JSON.stringify(report, null, 2), "utf8");

  printSummary(report);
} finally {
  await teardown();
  await prisma.$disconnect();
}

// ---------------------------------------------------------------------------
// Run one profile
// ---------------------------------------------------------------------------
async function runProfile(gp) {
  // Reset studentProfile to a clean slate, then apply profile data.
  await prisma.studentProfile.update({
    where: { id: studentProfileId },
    data: {
      preferredCareer: null,
      preferredCareerId: null,
      gradeLevel: null,
      studyLevel: null,
      highestEducation: null,
      averageGrade: null,
      state: null,
      tuitionBudget: null,
      targetCountry: null,
      careerPlanNotes: null,
      subjectsStudied: [],
      subjectsEnjoyed: [],
      activityInterests: [],
      exams: [],
    },
  });
  // delete existing signals for a clean start
  const profileRow = await prisma.studentCareerProfile.findUnique({ where: { studentId: user.id }, include: { signals: { select: { id: true } } } });
  if (profileRow?.signals?.length) {
    await prisma.studentCareerSignal.deleteMany({ where: { profileId: profileRow.id } });
  }

  if (gp.profile && Object.keys(gp.profile).length) {
    await prisma.studentProfile.update({ where: { id: studentProfileId }, data: gp.profile });
  }
  if (gp.preferredCareer) {
    await prisma.studentProfile.update({ where: { id: studentProfileId }, data: { preferredCareer: gp.preferredCareer } });
  }

  // Always regenerate so the CAREER profile + generated profile signals match.
  await generateStudentCareerProfile(user.id);

  // Seed extra ASSESSMENT signals if the profile is assessment-focused.
  if (gp.assessmentSignals?.length) {
    const profileRow2 = await prisma.studentCareerProfile.findUnique({ where: { studentId: user.id } });
    await prisma.studentCareerSignal.createMany({
      data: gp.assessmentSignals.map((s) => ({
        profileId: profileRow2.id,
        dimension: s.dimension,
        value: s.value,
        score: s.score,
        sourceType: "ASSESSMENT",
        sourceAssessment: s.sourceAssessment,
        confidence: s.confidence ?? 0.8,
        sourceVersion: "1.0",
      })),
    });
  }

  const res = await getCareerMatches(user.id, { limit: 20 });

  const top5 = res.matches.slice(0, 5);
  const top10 = res.matches.slice(0, 10);
  const top20 = res.matches.slice(0, 20);

  // Family coverage: fraction of top-N belonging to an expected family.
  const familyOf = (category) => CATEGORY_TO_FAMILY[category] ?? category ?? "unknown";

  const coverage = (list, families) => {
    const want = new Set(families);
    let covered = 0;
    for (const m of list) if (want.has(familyOf(m.career.category))) covered++;
    return { covered, total: list.length, pct: list.length ? Math.round((covered / list.length) * 100) : 100 };
  };

  // Expected-family hit at top-N: which expected families appear anywhere in top-N.
  const presentFamilies = (list) => [...new Set(list.map((m) => familyOf(m.career.category)))];
  const expectedHit = gp.expectedFamilies.filter((f) => presentFamilies([...top10]).includes(f));

  // preferred career behavior
  const preferredHit = res.matches.find((m) => m.preferenceBoost);

  return {
    id: gp.id,
    label: gp.label,
    noData: !!gp.noData,
    preferredOnly: !!gp.preferredOnly,
    expectedFamilies: gp.expectedFamilies,
    expectedFamiliesHitInTop10: expectedHit,
    top5: top5.map(serializeMatch),
    top10: top10.map(serializeMatch),
    top20: top20.map(serializeMatch),
    coverageTop5: coverage(top5, gp.expectedFamilies),
    coverageTop10: coverage(top10, gp.expectedFamilies),
    coverageTop20: coverage(top20, gp.expectedFamilies),
    top5Categories: [...new Set(top5.map((m) => m.career.category))],
    top10Categories: [...new Set(top10.map((m) => m.career.category))],
    scoreDistribution: {
      min: Math.min(...top20.map((m) => m.matchScore)), max: Math.max(...top20.map((m) => m.matchScore)),
      avg: Math.round(top20.reduce((a, m) => a + m.matchScore, 0) / (top20.length || 1)),
    },
    confidenceDistribution: {
      levels: groupBy(top20, (m) => m.confidenceDetail.level),
      min: Math.min(...top20.map((m) => m.confidenceScore)), max: Math.max(...top20.map((m) => m.confidenceScore)),
    },
    supportedDimensions: top5.map((m) => `${m.career.name}:${m.supportedDimensions}`),
    hasAssessmentData: res.hasAssessmentData,
    studentSignalsUsed: res.studentSignalsUsed,
    preferredCareerBehavior: preferredHit ? { name: preferredHit.career.name, rank: res.matches.indexOf(preferredHit) + 1 } : null,
  };
}

function serializeMatch(m) {
  return {
    name: m.career.name,
    category: m.career.category,
    score: m.matchScore,
    confidence: m.confidenceScore,
    level: m.confidenceDetail.level,
    supportedDimensions: m.supportedDimensions,
    matchStrength: m.matchStrength,
    preferenceBoost: m.preferenceBoost,
    isEmerging: m.career.isEmerging,
    matchTypes: m.matchTypes,
    topReasons: (m.reasons || []).slice(0, 3).map((r) => r.text),
    topDimensionScores: m.dimensionScores.filter((d) => d.matchedCount > 0).map((d) => `${d.dimension}:${d.score}`),
  };
}

function aggregateAcrossProfiles(profiles) {
  const allScores = [];
  const allConf = [];
  const emergingInTop10 = [];
  const preferredInflation = [];
  for (const p of profiles) {
    for (const m of p.top20 ?? []) {
      allScores.push(m.score);
      allConf.push(m.confidence);
    }
    for (const m of p.top10 ?? []) {
      if (m.isEmerging) emergingInTop10.push(`${p.id}:${m.name}`);
    }
    if (p.preferredCareerBehavior && p.preferredCareerBehavior.rank <= 1) {
      preferredInflation.push(`${p.id}:${p.preferredCareerBehavior.name}@#${p.preferredCareerBehavior.rank}`);
    }
  }
  const bucket = (arr) => {
    const b = { "90-100": 0, "70-89": 0, "50-69": 0, "30-49": 0, "1-29": 0, "0": 0 };
    for (const v of arr) {
      if (v >= 90) b["90-100"]++;
      else if (v >= 70) b["70-89"]++;
      else if (v >= 50) b["50-69"]++;
      else if (v >= 30) b["30-49"]++;
      else if (v > 0) b["1-29"]++;
      else b["0"]++;
    }
    return b;
  };
  const confLevel = profiles.map((p) => p.confidenceDistribution?.levels || {}).reduce((a, c) => {
    for (const k of Object.keys(c)) a[k] = (a[k] || 0) + c[k];
    return a;
  }, {});
  return {
    matchScoreBuckets: bucket(allScores),
    confidenceLevelCounts: confLevel,
    emergingInTop10,
    preferredRankedFirst: preferredInflation,
    totalProfiles: profiles.length,
  };
}

function groupBy(list, fn) {
  const out = {};
  for (const item of list) {
    const k = fn(item);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Section 11: data-quality audit (matching-critical fields)
// ---------------------------------------------------------------------------
async function dataQualityCheck() {
  const careers = await prisma.career.findMany({ where: { isActive: true }, select: { name: true, category: true, interests: true, technicalSkills: true, softSkills: true, personalityTraits: true, recommendedSubjects: true, recommendedDegrees: true, traits: { select: { dimension: true, value: true } }, careerEducationPathways: { select: { id: true } } } });
  const gaps = [];
  for (const c of careers) {
    const problems = [];
    const categories = (c.category || "").toLowerCase();
    const hasEducationPath = c.careerEducationPathways.length > 0;
    if (!(c.interests && c.interests.length)) problems.push("no interests");
    if (!(c.technicalSkills && c.technicalSkills.length) && !(c.softSkills && c.softSkills.length)) problems.push("no skills");
    if (!(c.personalityTraits && c.personalityTraits.length)) problems.push("no personalityTraits");
    if (!(c.recommendedSubjects && c.recommendedSubjects.length)) problems.push("no recommendedSubjects");
    if (!(c.recommendedDegrees && c.recommendedDegrees.length)) problems.push("no recommendedDegrees");
    if (!hasEducationPath) problems.push("no education pathway");
    if (!c.traits || c.traits.length === 0) problems.push("no CareerTrait records");
    if (problems.length) gaps.push({ name: c.name, category: c.category, problems });
  }
  return { audited: careers.length, careersWithGaps: gaps.slice(0, 400), totalWithGaps: gaps.length };
}

// ---------------------------------------------------------------------------
// Section 10: career-family inventory
// ---------------------------------------------------------------------------
async function familyInventoryCheck() {
  const careers = await prisma.career.findMany({ where: { isActive: true }, select: { name: true, category: true, isEmerging: true } });
  const byFamily = {};
  for (const c of careers) {
    const f = CATEGORY_TO_FAMILY[c.category] ?? c.category ?? "unknown";
    byFamily[f] = byFamily[f] || [];
    byFamily[f].push(c.name);
  }
  const out = {};
  for (const f of Object.keys(byFamily)) {
    out[f] = { count: byFamily[f].length, emerging: byFamily[f].filter((n) => careers.find((c) => c.name === n)?.isEmerging).length };
  }
  return { categories: Object.keys(CATEGORY_TO_FAMILY).length, familyCounts: out };
}

// ---------------------------------------------------------------------------
// Print a concise summary to the console.
// ---------------------------------------------------------------------------
function printSummary(report) {
  const lines = [];
  lines.push("=== Phase 16B Golden Harness ===\n");
  lines.push(`Careers scored: ${report.careersScored}`);
  lines.push(`Profiles: ${report.profileCount}\n`);
  for (const p of report.profiles) {
    const c5 = p.coverageTop5;
    const c10 = p.coverageTop10;
    lines.push(`[${p.id}] ${p.label}`);
    lines.push(`  top5: ${c5.covered}/${c5.total} expected · top10: ${c10.covered}/${c10.total}`);
    lines.push(`  top5 cats: ${p.top5Categories.join(", ")}`);
    lines.push(`  score ${p.scoreDistribution.min}-${p.scoreDistribution.max} · conf ${p.confidenceDistribution.min}-${p.confidenceDistribution.max}`);
    if (p.preferredCareerBehavior) lines.push(`  preferred: ${p.preferredCareerBehavior.name} #${p.preferredCareerBehavior.rank}`);
    if (p.noData) lines.push(`  (no-data profile, low-confidence expected)`);
    lines.push("");
  }
  if (report.aggregate) {
    lines.push("=== Aggregate ===");
    lines.push(`matchScore buckets: ${JSON.stringify(report.aggregate.matchScoreBuckets)}`);
    lines.push(`confidence levels: ${JSON.stringify(report.aggregate.confidenceLevelCounts)}`);
    lines.push(`emerging in top10: ${report.aggregate.emergingInTop10.length}`);
    if (report.aggregate.emergingInTop10.length) lines.push(`  ${report.aggregate.emergingInTop10.join(", ")}`);
    lines.push(`preferred ranked #1: ${report.aggregate.preferredRankedFirst.length ? report.aggregate.preferredRankedFirst.join(", ") : "none"}`);
  }
  if (report.dataQuality) {
    lines.push(`\n=== Data quality ===`);
    lines.push(`audited ${report.dataQuality.audited}; careers with gaps: ${report.dataQuality.totalWithGaps}`);
  }
  if (report.familyInventory) {
    lines.push(`\n=== Family inventory ===`);
    lines.push(JSON.stringify(report.familyInventory.familyCounts));
  }
  console.log(lines.join("\n"));
}

async function teardown() {
  try {
    const careerProfile = await prisma.studentCareerProfile.findUnique({ where: { studentId: user.id } });
    if (careerProfile) await prisma.studentCareerSignal.deleteMany({ where: { profileId: careerProfile.id } });
    await prisma.studentCareerProfile.deleteMany({ where: { studentId: user.id } });
    await prisma.studentProfile.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  } catch (e) {
    console.log("teardown warning: " + e.message.split("\n")[0]);
  }
}