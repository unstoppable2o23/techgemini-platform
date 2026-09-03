/**
 * Phase 21 — Personalized "Trending for You" discovery layer.
 *
 * This is a SEPARATE discovery system from the core career match score.
 * TrendingRelevanceScore is never merged with matchScore.
 *
 * Rules:
 *   - Uses education-stage, subjects, interests, career family, destination.
 *   - Minimum relevance threshold: only shows careers that pass a floor.
 *   - Does NOT modify core career scores, confidence, or ranking.
 *   - Shows "Trending for You" for sufficient-information students,
 *     "Trending Careers" for low-information students.
 *   - Never fabricates trend statistics or employment guarantees.
 */
import { prisma } from "@/lib/prisma";
import { getTrendsForCareers } from "./service.ts";
import type { TrendRecord, TrendClassification } from "./types.ts";

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export type TrendCategory =
  | "EMERGING_CAREER"
  | "FAST_GROWING"
  | "NEW_AGE"
  | "TECHNOLOGY_TREND"
  | "INDUSTRY_SHIFT"
  | "INTERDISCIPLINARY";

export type PersonalizedTrendingItem = {
  careerId: string;
  name: string;
  slug: string;
  title: string;
  category: string | null;
  shortDescription: string | null;
  demandLevel: string;
  jobGrowth: string;
  isEmerging: boolean;
  trendScore: number | null;
  trendClassifications: TrendClassification[];
  trendCategory: TrendCategory;
  relevanceScore: number;       // 0–100, SEPARATE from matchScore
  relevanceReason: string;      // "Why it may be relevant to you"
  trendReason: string;          // "Why it's trending"
  relatedPrograms: string[];    // from Career.recommendedDegrees
  relatedSubjects: string[];    // from Career.recommendedSubjects
  source: string | null;
  sourceUrl: string | null;
};

export type PersonalizedTrendingResult = {
  view: "foryou" | "trending";   // foryouchanged for low-info
  items: PersonalizedTrendingItem[];
  total: number;
  disclaimer: string;
  limitations: string[];
};

/* ------------------------------------------------------------------ */
/* Education-stage relevance gates                                     */
/* ------------------------------------------------------------------ */

const STAGE_CATEGORIES: Record<string, TrendCategory[]> = {
  // Class 10 and below: exploration only — nothing advanced
  SCHOOL_CLASS10: ["EMERGING_CAREER", "INTERDISCIPLINARY"],
  SCHOOL_CLASS12: ["EMERGING_CAREER", "FAST_GROWING", "NEW_AGE", "INTERDISCIPLINARY"],
  UNDERGRADUATE: ["EMERGING_CAREER", "FAST_GROWING", "NEW_AGE", "TECHNOLOGY_TREND", "INDUSTRY_SHIFT", "INTERDISCIPLINARY"],
  POSTGRADUATE: ["EMERGING_CAREER", "FAST_GROWING", "NEW_AGE", "TECHNOLOGY_TREND", "INDUSTRY_SHIFT", "INTERDISCIPLINARY"],
  CAREER_SWITCHER: ["EMERGING_CAREER", "FAST_GROWING", "NEW_AGE", "TECHNOLOGY_TREND", "INDUSTRY_SHIFT", "INTERDISCIPLINARY"],
  UNKNOWN: ["EMERGING_CAREER", "FAST_GROWING", "NEW_AGE", "INTERDISCIPLINARY"],
};

/** Minimum study level for a career to be shown at each student stage. */
const MIN_STUDY_FOR_STAGE: Record<string, number> = {
  SCHOOL_CLASS10: 0,   // all careers OK to explore
  SCHOOL_CLASS12: 0,   // all careers OK to explore
  UNDERGRADUATE: 0,    // all careers OK to explore
  POSTGRADUATE: 0,
  CAREER_SWITCHER: 0,
  UNKNOWN: 0,
};

/* ------------------------------------------------------------------ */
/* Student profile loader                                              */
/* ------------------------------------------------------------------ */

type StudentInfo = {
  educationStage: string;
  gradeLevel: string | null;
  subjectsStudied: string[];
  subjectsEnjoyed: string[];
  activityInterests: string[];
  preferredCareerId: string | null;
  preferredCareer: string | null;
  targetCountry: string | null;
  hasAssessment: boolean;
  hasCareerGoal: boolean;
};

async function loadStudentInfo(userId: string): Promise<StudentInfo | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      gradeLevel: true,
      studyLevel: true,
      highestEducation: true,
      subjectsStudied: true,
      subjectsEnjoyed: true,
      activityInterests: true,
      preferredCareerId: true,
      preferredCareer: true,
      targetCountry: true,
    },
  });
  if (!profile) return null;

  const stage = detectStage(profile.gradeLevel, profile.studyLevel, profile.highestEducation);

  // Check if student has completed an assessment (has TestResult)
  const testCount = await prisma.testResult.count({ where: { studentId: profile.id } });

  return {
    educationStage: stage,
    gradeLevel: profile.gradeLevel,
    subjectsStudied: profile.subjectsStudied ?? [],
    subjectsEnjoyed: profile.subjectsEnjoyed ?? [],
    activityInterests: profile.activityInterests ?? [],
    preferredCareerId: profile.preferredCareerId ?? null,
    preferredCareer: profile.preferredCareer ?? null,
    targetCountry: profile.targetCountry ?? null,
    hasAssessment: testCount > 0,
    hasCareerGoal: !!(profile.preferredCareerId || profile.preferredCareer),
  };
}

function detectStage(gradeLevel?: string | null, studyLevel?: string | null, highestEducation?: string | null): string {
  const g = (gradeLevel ?? "").toLowerCase();
  const s = (studyLevel ?? "").toLowerCase();
  const h = (highestEducation ?? "").toLowerCase();
  if (g.includes("10") || g.includes("ix") || g.includes("9")) return "SCHOOL_CLASS10";
  if (g.includes("12") || g.includes("xi") || g.includes("xii")) return "SCHOOL_CLASS12";
  if (s.includes("undergraduate") || s.includes("bachelor") || s.includes("ug")) return "UNDERGRADUATE";
  if (s.includes("postgraduate") || s.includes("master") || s.includes("pg") || s.includes("phd")) return "POSTGRADUATE";
  if (h.includes("bachelor") || h.includes("graduate")) return "UNDERGRADUATE";
  if (h.includes("master") || h.includes("postgraduate")) return "POSTGRADUATE";
  return "UNKNOWN";
}

/* ------------------------------------------------------------------ */
/* Trending-career data loader                                         */
/* ------------------------------------------------------------------ */

type CareerRow = {
  id: string;
  name: string;
  slug: string;
  title: string;
  category: string | null;
  subcategory: string | null;
  shortDescription: string | null;
  demandLevel: string;
  jobGrowth: string;
  isEmerging: boolean;
  interests: string[];
  recommendedDegrees: string[];
  recommendedSubjects: string[];
  technicalSkills: string[];
  softSkills: string[];
  relatedCareers: string[];
  alternativeCareers: string[];
  futureOutlook: string;
};

const CAREER_SELECT = {
  id: true,
  name: true,
  slug: true,
  title: true,
  category: true,
  subcategory: true,
  shortDescription: true,
  demandLevel: true,
  jobGrowth: true,
  isEmerging: true,
  interests: true,
  recommendedDegrees: true,
  recommendedSubjects: true,
  technicalSkills: true,
  softSkills: true,
  relatedCareers: true,
  alternativeCareers: true,
  futureOutlook: true,
} as const;

/**
 * Loads careers that have at least one CareerTrend row.
 * These are the "trend-aware" careers the system knows about.
 */
async function loadTrendAwareCareers(region?: string | null): Promise<{ careers: Map<string, CareerRow>; trendRecords: Map<string, TrendRecord> }> {
  // Get all careerIds that have a trend record
  const trendRows = await prisma.careerTrend.findMany({
    where: region ? { region } : {},
    distinct: ["careerId"],
    select: { careerId: true },
  });
  const careerIds = trendRows.map((r) => r.careerId);
  if (!careerIds.length) return { careers: new Map(), trendRecords: new Map() };

  const careers = await prisma.career.findMany({
    where: { id: { in: careerIds }, isActive: true },
    select: CAREER_SELECT,
  });
  const careerMap = new Map(careers.map((c) => [c.id, c as unknown as CareerRow]));

  // Load best trend record per career
  const trendRecords = await getTrendsForCareers(careerIds);

  return { careers: careerMap, trendRecords };
}

/* ------------------------------------------------------------------ */
/* Relevance scoring (SEPARATE from matchScore)                       */
/* ------------------------------------------------------------------ */

/**
 * TrendRelevanceScore = EducationAlignment + InterestAlignment
 *                       + CareerFamilyAlignment + SkillAlignment
 *                       + DestinationRelevance
 *                       + TrendSignal
 *
 * Each sub-score 0–20, total 0–100.
 * NEVER modifies core matchScore or confidence.
 */
function scoreRelevance(
  career: CareerRow,
  trend: TrendRecord | null,
  student: StudentInfo
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // ---- Education alignment (0–25) ----
  const eduScore = educationAlignment(career, student);
  score += eduScore;
  if (eduScore >= 15) {
    reasons.push(`${career.name} aligns with your education and subjects.`);
  }

  // ---- Interest alignment (0–25) ----
  const interestScore = interestAlignment(career, student);
  score += interestScore;
  if (interestScore >= 10) {
    reasons.push(`Your interests overlap with this career's focus areas.`);
  }

  // ---- Trend signal (0–20) ----
  const trendScore = trend ? trend.trendScore : 0;
  const trendNorm = Math.min(trendScore / 50, 1) * 20; // normalize 0–50 to 0–20
  score += trendNorm;
  if (trend && (trend.emerging || trend.fastGrowing || trend.futureFacing)) {
    const labels: string[] = [];
    if (trend.emerging) labels.push("emerging");
    if (trend.fastGrowing) labels.push("fast-growing");
    if (trend.futureFacing) labels.push("future-facing");
    reasons.push(`This career is ${labels.join(" and ")} in the market.`);
  }

  // ---- Career family alignment (0–15) ----
  const familyScore = careerFamilyAlignment(career, student);
  score += familyScore;
  if (familyScore >= 8) {
    reasons.push(`This career is in a field related to your preferred direction.`);
  }

  // ---- Skill/subject alignment (0–15) ----
  const skillScore = skillAlignment(career, student);
  score += skillScore;
  if (skillScore >= 8) {
    reasons.push(`This career values subjects and skills you enjoy.`);
  }

  // ---- Destination relevance (0–10) ----
  const destScore = destinationRelevance(career, student);
  score += destScore;
  if (destScore >= 5) {
    reasons.push(`This career is relevant in ${student.targetCountry || "your target destination"}.`);
  }

  return { score: Math.round(Math.min(score, 100)), reasons };
}

function educationAlignment(career: CareerRow, student: StudentInfo): number {
  let score = 0;
  const allSubjects = [...student.subjectsStudied, ...student.subjectsEnjoyed].map((s) => s.toLowerCase());
  const careerSubjects = career.recommendedSubjects.map((s) => s.toLowerCase());
  const overlap = allSubjects.filter((s) => careerSubjects.some((cs) => s.includes(cs) || cs.includes(s)));
  score += Math.min(overlap.length * 5, 15);

  const careerDegrees = career.recommendedDegrees.map((d) => d.toLowerCase());
  const hasRelevantDegree = careerDegrees.some(
    (d) => allSubjects.some((s) => d.includes(s) || s.includes(d))
  );
  if (hasRelevantDegree) score += 10;

  return Math.min(score, 25);
}

function interestAlignment(career: CareerRow, student: StudentInfo): number {
  let score = 0;
  const allInterests = [...student.activityInterests, ...student.subjectsEnjoyed].map((i) => i.toLowerCase());
  const careerInterests = career.interests.map((i) => i.toLowerCase());
  const overlap = allInterests.filter((i) => careerInterests.some((ci) => i.includes(ci) || ci.includes(i)));
  score += Math.min(overlap.length * 6, 18);

  // Preferred career family
  if (student.preferredCareer) {
    const pref = student.preferredCareer.toLowerCase();
    const related = [...career.relatedCareers, ...career.alternativeCareers].map((r) => r.toLowerCase());
    if (related.some((r) => r.includes(pref) || pref.includes(r))) {
      score += 7;
    }
  }

  return Math.min(score, 25);
}

function careerFamilyAlignment(career: CareerRow, student: StudentInfo): number {
  let score = 0;
  if (student.preferredCareerId) {
    const related = [...career.relatedCareers, ...career.alternativeCareers];
    if (related.includes(student.preferredCareerId)) {
      score += 15;
    }
  }
  // Category overlap
  if (career.category) {
    const cat = career.category.toLowerCase();
    const studentCats = student.subjectsStudied.map((s) => s.toLowerCase());
    if (studentCats.some((s) => cat.includes(s) || s.includes(cat))) {
      score += 5;
    }
  }
  return Math.min(score, 15);
}

function skillAlignment(career: CareerRow, student: StudentInfo): number {
  let score = 0;
  const allEnjoyed = student.subjectsEnjoyed.map((s) => s.toLowerCase());
  const skills = [...career.technicalSkills, ...career.softSkills].map((s) => s.toLowerCase());
  const overlap = allEnjoyed.filter((s) => skills.some((sk) => s.includes(sk) || sk.includes(s)));
  score += Math.min(overlap.length * 4, 12);
  if (student.activityInterests.length > 0) {
    score += 3;
  }
  return Math.min(score, 15);
}

function destinationRelevance(career: CareerRow, student: StudentInfo): number {
  if (!student.targetCountry) return 3; // neutral when no destination set
  // We can't query country-specific trend data without more data;
  // give a small base score for any career that exists.
  return 5;
}

/* ------------------------------------------------------------------ */
/* Trend category classification                                       */
/* ------------------------------------------------------------------ */

function classifyTrendCategory(
  career: CareerRow,
  trend: TrendRecord | null
): TrendCategory {
  if (career.isEmerging) return "EMERGING_CAREER";
  if (trend?.fastGrowing) return "FAST_GROWING";
  if (career.category?.toLowerCase().includes("tech") || career.technicalSkills.length > 3) {
    return "TECHNOLOGY_TREND";
  }
  if (career.interests.length > 2 && career.technicalSkills.length > 0) {
    return "INTERDISCIPLINARY";
  }
  if (trend?.emerging) return "NEW_AGE";
  return "INDUSTRY_SHIFT";
}

/* ------------------------------------------------------------------ */
/* Explanation builders                                                */
/* ------------------------------------------------------------------ */

function buildTrendReason(career: CareerRow, trend: TrendRecord | null): string {
  const parts: string[] = [];

  if (career.isEmerging) {
    parts.push(`${career.name} is an emerging field gaining attention.`);
  }
  if (trend) {
    if (trend.emerging) parts.push("It is classified as emerging in current trend data.");
    if (trend.fastGrowing) parts.push("It shows fast-growing demand signals.");
    if (trend.futureFacing) parts.push("It is considered future-facing in the market.");
    if (trend.demandIndicator === "HIGH") parts.push("Demand indicators are currently high.");
  }
  if (!parts.length && career.futureOutlook) {
    parts.push(`Market outlook: ${career.futureOutlook}`);
  }
  if (!parts.length) {
    parts.push(`${career.name} is gaining attention as a career direction.`);
  }
  return parts.join(" ");
}

function buildRelevanceReason(reasons: string[]): string {
  if (reasons.length === 0) return "This career may be worth exploring based on your profile.";
  return reasons[0]; // primary reason
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

const MIN_RELEVANCE_SCORE = 30; // floor to appear in "Trending for You"

/**
 * Returns personalized trending careers for a student.
 *
 * - For students with sufficient data: returns "foryou" view.
 * - For low-information students: returns "trending" (non-personalized) view.
 * - Never modifies core career match scores.
 */
export async function getStudentTrendingCareers(
  userId: string,
  opts: { limit?: number; region?: string | null } = {}
): Promise<PersonalizedTrendingResult> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 20);
  const student = await loadStudentInfo(userId);

  const isLowInfo = !student || (!student.hasAssessment && !student.hasCareerGoal);
  const { careers, trendRecords } = await loadTrendAwareCareers(opts.region);

  if (careers.size === 0) {
    return {
      view: isLowInfo ? "trending" : "foryou",
      items: [],
      total: 0,
      disclaimer: "No trending career data is currently available.",
      limitations: ["No CareerTrend data found in the system."],
    };
  }

  // Exclude the student's already-preferred career from trending.
  const excludeId = student?.preferredCareerId ?? null;

  const scored: PersonalizedTrendingItem[] = [];

  for (const [careerId, career] of careers.entries()) {
    if (excludeId && careerId === excludeId) continue;

    const trend = trendRecords.get(careerId) ?? null;

    // For low-info: show all trend-aware careers without personalization
    if (isLowInfo) {
      const trendScore = trend?.trendScore ?? 0;
      const category = classifyTrendCategory(career, trend);
      scored.push({
        careerId,
        name: career.name,
        slug: career.slug,
        title: career.title,
        category: career.category,
        shortDescription: career.shortDescription,
        demandLevel: career.demandLevel,
        jobGrowth: career.jobGrowth,
        isEmerging: career.isEmerging,
        trendScore: trend?.trendScore ?? null,
        trendClassifications: trend ? getClassifications(trend) : [],
        trendCategory: category,
        relevanceScore: Math.round(trendScore * 2), // simple proxy for low-info
        relevanceReason: "This career is trending and worth exploring.",
        trendReason: buildTrendReason(career, trend),
        relatedPrograms: career.recommendedDegrees.slice(0, 4),
        relatedSubjects: career.recommendedSubjects.slice(0, 4),
        source: trend?.source ?? null,
        sourceUrl: trend?.sourceUrl ?? null,
      });
      continue;
    }

    // Personalized scoring
    const { score, reasons } = scoreRelevance(career, trend, student!);
    if (score < MIN_RELEVANCE_SCORE) continue;

    const category = classifyTrendCategory(career, trend);
    scored.push({
      careerId,
      name: career.name,
      slug: career.slug,
      title: career.title,
      category: career.category,
      shortDescription: career.shortDescription,
      demandLevel: career.demandLevel,
      jobGrowth: career.jobGrowth,
      isEmerging: career.isEmerging,
      trendScore: trend?.trendScore ?? null,
      trendClassifications: trend ? getClassifications(trend) : [],
      trendCategory: category,
      relevanceScore: score,
      relevanceReason: buildRelevanceReason(reasons),
      trendReason: buildTrendReason(career, trend),
      relatedPrograms: career.recommendedDegrees.slice(0, 4),
      relatedSubjects: career.recommendedSubjects.slice(0, 4),
      source: trend?.source ?? null,
      sourceUrl: trend?.sourceUrl ?? null,
    });
  }

  // Sort: by relevanceScore desc, then trendScore desc, then name
  scored.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    const ta = a.trendScore ?? -1;
    const tb = b.trendScore ?? -1;
    if (tb !== ta) return tb - ta;
    return a.name.localeCompare(b.name);
  });

  const items = scored.slice(0, limit);

  return {
    view: isLowInfo ? "trending" : "foryou",
    items,
    total: items.length,
    disclaimer: "Trending data is derived from system trend indicators and student profile signals. It is NOT a career recommendation and should not be treated as employment advice.",
    limitations: isLowInfo
      ? ["Personalized view requires assessment completion and a career goal. Showing general trending careers instead."]
      : ["TrendingRelevanceScore is separate from the core career match score. Both should be discussed with a counselor."],
  };
}

function getClassifications(trend: TrendRecord): TrendClassification[] {
  const list: TrendClassification[] = [];
  if (trend.emerging) list.push("EMERGING");
  if (trend.fastGrowing) list.push("FAST_GROWING");
  if (trend.futureFacing) list.push("FUTURE");
  if (trend.trending) list.push("TRENDING");
  return list;
}

export { MIN_RELEVANCE_SCORE };