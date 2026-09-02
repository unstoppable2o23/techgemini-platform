// Phase 16C.1 — sections 5, 6, 7.
// 5) Assessment-only profile (golden S): BEFORE vs AFTER 16C.
// 6) Profile + assessment: representative students via live engine.
// 7) Generic-career domination: top-5 frequency of broad careers across golden profiles.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { generateStudentCareerProfile } from "../../src/lib/career-profile/generate.ts";
import { getCareerMatches } from "../../src/lib/career-matching/engine.ts";

const prisma = new PrismaClient();
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

const BROAD_CAREERS = ["Agricultural Engineering", "Actuarial Science", "Chemical Engineering", "Software Engineering", "Data Science", "AI", "Artificial Intelligence"];

async function makeStudent() {
  const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  const tenant = await prisma.tenant.create({ data: { name: "P48", slug: `p48-${suffix}`, subdomain: `p48-${suffix}` } });
  const user = await prisma.user.create({ data: { email: `p48-${suffix}@x.com`, passwordHash: "x", firstName: "P48", lastName: "C", role: "STUDENT", tenantId: tenant.id } });
  const sp = await prisma.studentProfile.create({ data: { userId: user.id } });
  const cp = await prisma.studentCareerProfile.create({ data: { studentId: user.id } });
  return { tenant, user, sp, cp };
}
async function destroy(s) {
  await prisma.studentCareerSignal.deleteMany({ where: { profileId: s.cp.id } });
  await prisma.studentCareerProfile.deleteMany({ where: { id: s.cp.id } });
  await prisma.studentProfile.deleteMany({ where: { id: s.sp.id } });
  await prisma.user.deleteMany({ where: { id: s.user.id } });
  await prisma.tenant.deleteMany({ where: { id: s.tenant.id } });
}
async function seedAssessments(cpId, dims) {
  await prisma.studentCareerSignal.createMany({
    data: dims.map((d) => ({
      profileId: cpId, dimension: d.dimension, value: d.value, score: d.score ?? 88,
      sourceType: "ASSESSMENT", sourceAssessment: d.assessment ?? "ideal", confidence: 0.8, sourceVersion: "1.0",
    })),
  });
}

// ---------------- Section 5: assessment-only (golden S) BEFORE/AFTER ----------------
const before = JSON.parse(readFileSync(new URL("../../scripts/audit/phase16c-golden-before.json", import.meta.url), "utf8"));
const after = JSON.parse(readFileSync(new URL("../../scripts/audit/phase16c-golden-after.json", import.meta.url), "utf8"));
const sb = before.profiles.find((p) => p.id === "S");
const sa = after.profiles.find((p) => p.id === "S");
console.log("=== Phase 16C.1 — section 5: assessment-only profile (golden S) ===");
const summarize = (p, label) => {
  const nonzero = p.top20.filter((m) => m.score > 0).length;
  const nonzero10 = p.top20.slice(0, 10).filter((m) => m.score > 0).length;
  return {
    label,
    nonzeroMatchesTop20: nonzero,
    nonzeroMatchesTop10: nonzero10,
    top5: p.top5.map((m) => `${m.name}(${m.score}/${m.confidence}/${m.supportedDimensions})`),
    top10Names: p.top10.map((m) => m.name),
    expectedHitTop10: p.expectedFamiliesHitInTop10,
    scoreDist: p.scoreDistribution,
    anyAptReason: p.top20.some((m) => (m.topDimensionScores || []).some((d) => d.startsWith("APTITUDE"))),
    anyWeReason: p.top20.some((m) => (m.topDimensionScores || []).some((d) => d.startsWith("WORK_ENVIRONMENT"))),
    topDimScoresSample: p.top5.map((m) => `${m.name}:[${m.topDimensionScores.join(",")}]`),
  };
};
console.log("BEFORE:", JSON.stringify(summarize(sb, "BEFORE"), null, 1));
console.log("AFTER :", JSON.stringify(summarize(sa, "AFTER"), null, 1));

// ---------------- Section 7: generic-career top-5 frequency BEFORE/AFTER ----------------
console.log("\n=== Phase 16C.1 — section 7: generic-career top-5 frequency across golden profiles ===");
const cap = (p, list) => list?.slice(0, 5).map((m) => m.name) ?? [];
const freq = {};
const freqAfter = {};
for (const p of before.profiles) for (const name of cap(p, p.top5)) freq[name] = (freq[name] || 0) + 1;
for (const p of after.profiles) for (const name of cap(p, p.top5)) freqAfter[name] = (freqAfter[name] || 0) + 1;
const broad = {};
for (const name of BROAD_CAREERS) {
  const hitsBefore = before.profiles.filter((p) => cap(p, p.top5).includes(name)).length;
  const hitsAfter = after.profiles.filter((p) => cap(p, p.top5).includes(name)).length;
  broad[name] = { before: hitsBefore, after: hitsAfter };
}
console.log("Broad-career top-5 occurrences (of 23 profiles):");
for (const [name, v] of Object.entries(broad)) console.log(`  ${name.padEnd(28)} before=${v.before} after=${v.after}`);
console.log("\nMost-frequent top-5 careers AFTER (whole catalog):");
const afterSorted = Object.entries(freqAfter).sort((a, b) => b[1] - a[1]).slice(0, 15);
for (const [name, n] of afterSorted) console.log(`  ${n}x  ${name}`);

// ---------------- Section 6: profile + assessment representative students ----------------
console.log("\n=== Phase 16C.1 — section 6: profile + assessment representative students ===");
const PROFILES = [
  { label: "CS student", profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Computer Science", "Mathematics"], subjectsEnjoyed: ["Computer Science"], activityInterests: ["Coding / Technology", "Solving problems"] }, aptitudes: [{ dimension: "APTITUDE", value: "logical_reasoning" }, { dimension: "APTITUDE", value: "logical_mathematical" }], env: [{ dimension: "WORK_ENVIRONMENT", value: "independent_preference" }], expected: ["technology", "engineering"] },
  { label: "PCB student", profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Biology", "Chemistry"], subjectsEnjoyed: ["Biology"], activityInterests: ["Research", "Science / Experiments"] }, aptitudes: [{ dimension: "APTITUDE", value: "attention_to_detail" }], env: [{ dimension: "WORK_ENVIRONMENT", value: "prefers_structure" }], expected: ["lifescience", "medicine"] },
  { label: "architecture student", profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Art", "Mathematics", "Physics"], subjectsEnjoyed: ["Art"], activityInterests: ["Designing", "Building / Making things"] }, aptitudes: [{ dimension: "APTITUDE", value: "visual_spatial" }], env: [{ dimension: "WORK_ENVIRONMENT", value: "prefers_autonomy" }], expected: ["architecture", "design", "engineering"] },
  { label: "psychology student", profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Psychology", "Sociology"], subjectsEnjoyed: ["Psychology"], activityInterests: ["Helping people", "Writing"] }, aptitudes: [{ dimension: "APTITUDE", value: "interpersonal" }, { dimension: "APTITUDE", value: "emotional_intelligence" }], env: [{ dimension: "WORK_ENVIRONMENT", value: "collaborative_preference" }], expected: ["psychology", "education"] },
  { label: "commerce student", profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Accountancy", "Business Studies", "Economics"], subjectsEnjoyed: ["Accountancy"], activityInterests: ["Working with numbers", "Business / Entrepreneurship"] }, aptitudes: [{ dimension: "APTITUDE", value: "logical_mathematical" }, { dimension: "APTITUDE", value: "attention_to_detail" }], env: [{ dimension: "WORK_ENVIRONMENT", value: "prefers_structure" }], expected: ["finance", "business"] },
  { label: "humanities student", profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["History", "Political Science", "English"], subjectsEnjoyed: ["History", "English"], activityInterests: ["Writing", "Communication"] }, aptitudes: [{ dimension: "APTITUDE", value: "linguistic" }, { dimension: "APTITUDE", value: "interpersonal" }], env: [{ dimension: "WORK_ENVIRONMENT", value: "collaborative_preference" }], expected: ["humanities", "law", "education"] },
  { label: "mechanical student", profile: { studyLevel: "Year 1 Undergraduate", subjectsStudied: ["Physics", "Mathematics"], subjectsEnjoyed: ["Physics"], activityInterests: ["Working with machines", "Building / Making things"] }, aptitudes: [{ dimension: "APTITUDE", value: "bodily_kinesthetic" }, { dimension: "APTITUDE", value: "visual_spatial" }], env: [{ dimension: "WORK_ENVIRONMENT", value: "collaborative_preference" }], expected: ["engineering", "manufacturing"] },
];

for (const p of PROFILES) {
  const s = await makeStudent();
  try {
    if (p.profile && Object.keys(p.profile).length) await prisma.studentProfile.update({ where: { id: s.sp.id }, data: p.profile });
    await generateStudentCareerProfile(s.user.id);
    const cp2 = await prisma.studentCareerProfile.findUnique({ where: { studentId: s.user.id } });
    await seedAssessments(cp2.id, [...p.aptitudes, ...p.env]);
    const res = await getCareerMatches(s.user.id, { limit: 8 });
    const famOf = (c) => CATEGORY_TO_FAMILY[c.category] ?? c.category;
    const top8 = res.matches.slice(0, 8);
    const covered = new Set(top8.map((m) => famOf(m.career)));
    const hit = covered.has(p.expected[0]) || covered.has(p.expected[1]);
    const dimReport = (m) => m.dimensionScores.filter((d) => d.matchedCount > 0).map((d) => `${d.dimension}:${d.score}`).join(",");
    console.log(`\n[${p.label}] expected=${p.expected.join("/")} topExpectedHit=${hit}`);
    top8.forEach((m, i) => console.log(`   ${i + 1}. ${m.career.name.padEnd(42)} ${m.career.category} score=${m.matchScore} dims=[${dimReport(m)}]`));
  } finally { await destroy(s); }
}

await prisma.$disconnect();