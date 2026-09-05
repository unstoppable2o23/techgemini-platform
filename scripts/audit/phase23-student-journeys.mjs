/**
 * Phase 23 — Real-world launch verification: realistic student journeys.
 *
 * Creates 8 transient production-safe test students matching the pilot
 * personas (A–H), and runs the REAL pipeline for each:
 *   career profile + careers  -> getCareerMatches
 *   personalized trending     -> getStudentTrendingCareers
 *   study roadmap             -> generateRoadmap
 *   university matches        -> getUniversityMatchesForStudent
 *
 * Verifies: every page/engine stage loads, returns correct data, handles
 * empty/low-information state, and yields a sensible next action — with no
 * recommendation-engine changes (read-only on the engine).
 *
 * TEST/validation only: creates NO production student accounts (transient
 * INACTIVE tenant, deleted in teardown). Never modifies University,
 * IndianInstitution, Program, or career-engine data.
 */
import { PrismaClient } from "@prisma/client";
import { getCareerMatches } from "../../src/lib/career-matching/engine.ts";
import { generateStudentCareerProfile } from "../../src/lib/career-profile/generate.ts";
import { getStudentTrendingCareers } from "../../src/lib/career-trends/personalization.ts";
import { generateRoadmap } from "../../src/lib/roadmap/service.ts";
import { getUniversityMatchesForStudent } from "../../src/lib/university-matching/engine.ts";

const prisma = new PrismaClient();
const T = `P23J${Date.now().toString(36)}`;
const tenantSlug = `${T}-t`;

const PROFILES = [
  { id: "A", label: "Class 10 -> Engineering -> India", gradeLevel: "Class 10", studyLevel: null, highestEducation: null, subjectsStudied: ["Physics", "Chemistry", "Mathematics"], subjectsEnjoyed: ["Physics", "Mathematics"], activityInterests: ["Working with numbers", "Coding / Technology"], exams: ["JEE"], preferredCareer: "Mechanical Engineering", targetCountry: "India" },
  { id: "B", label: "Class 12 Science -> Computer Science -> Abroad", gradeLevel: "Class 12", studyLevel: null, highestEducation: null, subjectsStudied: ["Physics", "Chemistry", "Mathematics", "Computer Science"], subjectsEnjoyed: ["Computer Science", "Mathematics"], activityInterests: ["Coding / Technology", "AI"], exams: ["SAT"], preferredCareer: "Software Engineering", targetCountry: "USA" },
  { id: "C", label: "Class 12 Biology -> Medicine -> India", gradeLevel: "Class 12", studyLevel: null, highestEducation: null, subjectsStudied: ["Physics", "Chemistry", "Biology"], subjectsEnjoyed: ["Biology", "Chemistry"], activityInterests: ["Research", "Science / Experiments", "Health"], exams: ["NEET"], preferredCareer: "Medicine", targetCountry: "India" },
  { id: "D", label: "Class 12 Commerce -> Business/Finance -> India", gradeLevel: "Class 12", studyLevel: null, highestEducation: null, subjectsStudied: ["Accountancy", "Business Studies", "Economics", "Mathematics"], subjectsEnjoyed: ["Business Studies", "Economics"], activityInterests: ["Finance", "Marketing"], exams: ["CUET"], preferredCareer: "Chartered Accountancy", targetCountry: "India" },
  { id: "E", label: "Class 12 Humanities -> Media/Policy/History -> India", gradeLevel: "Class 12", studyLevel: null, highestEducation: null, subjectsStudied: ["History", "Political Science", "Economics", "English"], subjectsEnjoyed: ["History", "Political Science"], activityInterests: ["Writing", "Research", "Public Service"], exams: ["CUET"], preferredCareer: "Journalism", targetCountry: "India" },
  { id: "F", label: "Undergraduate CS -> Data/AI -> Abroad", gradeLevel: "UG", studyLevel: "undergraduate", highestEducation: "bachelor", subjectsStudied: ["Computer Science", "Mathematics"], subjectsEnjoyed: ["Computer Science"], activityInterests: ["Coding", "AI", "Data"], exams: ["GRE", "IELTS"], preferredCareer: "Data Science", targetCountry: "USA" },
  { id: "G", label: "Architecture/Design -> Architecture/Design", gradeLevel: "UG", studyLevel: "undergraduate", highestEducation: null, subjectsStudied: ["Art", "Design", "Mathematics"], subjectsEnjoyed: ["Art", "Design"], activityInterests: ["Design", "Built Environment"], exams: ["NATA"], preferredCareer: "Architecture", targetCountry: "India" },
  { id: "H", label: "Low-information student", gradeLevel: null, studyLevel: null, highestEducation: null, subjectsStudied: [], subjectsEnjoyed: [], activityInterests: [], exams: [], preferredCareer: null, targetCountry: null },
];

let results = [];

const added = { test: false };

async function main() {
  const tenant = await prisma.tenant.create({
    data: { name: T, slug: tenantSlug, subdomain: tenantSlug, isActive: false },
  });

  const author = await prisma.user.create({
    data: { email: `${T}author@test.local`, passwordHash: "x", firstName: "A", lastName: "UT", role: "STUDENT", tenantId: tenant.id },
  });

  let testId = null;
  const anyTest = await prisma.test.findFirst({ include: { results: { take: 1 } } });
  if (anyTest) {
    testId = anyTest.id;
  } else {
    const created = await prisma.test.create({
      data: { tenantId: tenant.id, title: "P23 Journey Test", subject: "General", description: "p23", durationMins: 30, totalMarks: 100, status: "ACTIVE", createdById: author.id },
    });
    testId = created.id;
    added.test = true;
  }

  const createdUsers = [];
  for (const p of PROFILES) {
    let careerId = null;
    if (p.preferredCareer) {
      const c = await prisma.career.findUnique({ where: { name: p.preferredCareer } });
      careerId = c ? c.id : null;
    }
    const user = await prisma.user.create({
      data: {
        email: `${T}${p.id}@test.local`, passwordHash: "x", firstName: p.id, lastName: "P23", role: "STUDENT", tenantId: tenant.id,
        studentProfile: { create: { gradeLevel: p.gradeLevel, studyLevel: p.studyLevel, highestEducation: p.highestEducation, subjectsStudied: p.subjectsStudied, subjectsEnjoyed: p.subjectsEnjoyed, activityInterests: p.activityInterests, exams: p.exams, preferredCareer: p.preferredCareer, preferredCareerId: careerId, targetCountry: p.targetCountry } },
      },
      include: { studentProfile: true },
    });
    createdUsers.push({ user, p });
    if (p.id !== "H" && testId) {
      await prisma.testResult.create({ data: { studentId: user.studentProfile.id, testId, score: 70, totalMarks: 100, percentage: 70, answers: { kind: "g" } } });
    }
  }

  for (const { user, p } of createdUsers) {
    const r = { id: p.id, label: p.label };

    // 1. Career profile + career matches
    try {
      await generateStudentCareerProfile(user.id);
      const matches = await getCareerMatches(user.id, { limit: 10 });
      const m = matches.matches || [];
      r.careerMatches = m.slice(0, 5).map((x) => `${x.career?.name || x.career?.title}(${x.matchScore})`);
      r.careersOK = m.length >= 1;
      r.matchDisclaimer = matches.disclaimer ?? null;
      r.topCareerId = m[0]?.career?.id ?? null;
      r.topCareerName = m[0]?.career?.name ?? null;
    } catch (e) {
      r.careersOK = false;
      r.careerError = String(e.message || e).slice(0, 120);
    }

    // 2. Trending for you
    try {
      const tr = await getStudentTrendingCareers(user.id, { limit: 12 });
      r.trendingView = tr.view;
      r.trendingCount = tr.items.length;
      r.trendingOK = tr.items.length >= 1 && tr.items.every((i) => i.name && i.relevanceReason && i.trendReason);
      r.trendingTop = tr.items.slice(0, 3).map((i) => i.name);
    } catch (e) {
      r.trendingOK = false;
      r.trendingError = String(e.message || e).slice(0, 120);
    }

    // 3. Roadmap
    try {
      const map = await generateRoadmap({ userId: user.id });
      r.steps = map.steps.length;
      r.milestones = map.milestones.length;
      r.pathType = map.pathType ?? map.destinationLabel ?? "n/a";
      r.progress = map.progress ?? 0;
      r.roadmapOK = map.steps.length >= 3 && map.milestones.length >= 3 && !/guarantee/i.test(map.steps.map((s) => s.title + " " + s.description).join(" "));
      r.stepCategories = [...new Set(map.steps.map((s) => s.category))].slice(0, 5);
    } catch (e) {
      r.roadmapOK = false;
      r.roadmapError = String(e.message || e).slice(0, 120);
    }

    // 4. University matches
    try {
      const uni = await getUniversityMatchesForStudent(user.id, { careerId: r.topCareerId ?? undefined, limit: 5 });
      r.universityCount = uni.matches?.length ?? 0;
      r.universityOK = Array.isArray(uni.matches); // empty ok, must not throw/blank
      r.universityTop = (uni.matches || []).slice(0, 2).map((x) => x.institution?.name);
    } catch (e) {
      r.universityOK = false;
      r.universityError = String(e.message || e).slice(0, 120);
    }

    results.push(r);
  }

  console.log("\n=== PHASE 23 STUDENT JOURNEYS (transient) ===\n");
  console.log("ID | Label | Matches(Top5) | View | Roadmap steps/path | Univ");
  for (const r of results) {
    console.log(`\n[${r.id}] ${r.label}`);
    console.log(`  Careers : ${r.careerMatches ? r.careerMatches.join(", ") : r.careerError || "none"} (${r.careersOK ? "OK" : "FAIL"})${r.matchDisclaimer ? ` | disclaimer: ${r.matchDisclaimer}` : ""}`);
    console.log(`  Trending: view=${r.trendingView ?? r.trendingError} count=${r.trendingCount ?? "-"} ${r.trendingTop ? r.trendingTop.join(", ") : ""} (${r.trendingOK ? "OK" : "FAIL"})`);
    console.log(`  Roadmap : steps=${r.steps ?? r.roadmapError} milestones=${r.milestones ?? "-"} path=${r.pathType ?? "-"} progress=${r.progress ?? "-"} cats=${(r.stepCategories || []).join("/")} (${r.roadmapOK ? "OK" : "FAIL"})`);
    console.log(`  Univ    : matches=${r.universityCount ?? r.universityError} ${r.universityTop ? r.universityTop.join(", ") : ""} (${r.universityOK ? "OK" : "FAIL"})`);
  }

  const pass = results.every((r) => r.careersOK && r.trendingOK && r.roadmapOK && r.universityOK);
  console.log(`\nTOTAL: ${results.length} journeys, ALL_ENGINE_STAGES_OK=${pass}`);
  results.forEach((r) => { if (!(r.careersOK && r.trendingOK && r.roadmapOK && r.universityOK)) console.log("  FAILING:", r.id, (r.careerError || "") + (r.trendingError || "") + (r.roadmapError || "") + (r.universityError || "")); });

  // Cleanup
  if (added.test) await prisma.test.deleteMany({ where: { tenantId: tenant.id } });
  const delUsers = await prisma.user.deleteMany({ where: { email: { startsWith: `${T}` } } });
  console.log("cleanup users:", delUsers.count);
  await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  await prisma.$disconnect();
  process.exit(pass ? 0 : 1);
}

main().catch(async (e) => { console.error("FATAL", e); try { await prisma.$disconnect(); } catch {} process.exit(2); });