import { prisma } from "../prisma.ts";
import { getStudentBasics, type StudentBasics } from "./basics.ts";
import { getCareerMatches } from "../career-matching/engine.ts";
import { getUniversityMatchesForStudent } from "../university-matching/engine.ts";
import { getStudentTrendingCareers, type PersonalizedTrendingResult } from "../career-trends/personalization.ts";

const FALLBACK_BASICS: StudentBasics = {
  profileCompleteness: 0,
  hasAssessments: false,
  assessmentProgress: [],
  assessmentCompletedCount: 0,
  savedCount: 0,
  savedItems: [],
  nextSteps: ["Complete your profile to see personalized recommendations."],
};

export type StudentDashboard = StudentBasics & {
  topCareerMatches: any[];
  careerMatchDisclaimer: string | null;
  educationPathways: any | null;
  universityMatches: any | null;
  universityMatchDisclaimer: string | null;
  trendingCareers: any[];
  trendingResult: PersonalizedTrendingResult | null;
  topCareerId: string | null;
};

export async function getStudentDashboard(userId: string): Promise<StudentDashboard> {
  let basics: StudentBasics = FALLBACK_BASICS;
  try {
    basics = await getStudentBasics(userId);
  } catch (e) {
    console.error("[dashboard] getStudentBasics failed:", e);
  }

  let topCareerMatches: any[] = [];
  let careerMatchDisclaimer: string | null = null;
  let topCareerId: string | null = null;
  let educationPathways: any = null;
  let universityMatches: any = null;
  let universityMatchDisclaimer: string | null = null;

  try {
    const matches = await getCareerMatches(userId, { limit: 3 });
    topCareerMatches = matches.matches;
    careerMatchDisclaimer = matches.disclaimer ?? null;
    topCareerId = topCareerMatches[0]?.career?.id ?? null;
  } catch (e) {
    console.error("[dashboard] getCareerMatches failed:", e);
    careerMatchDisclaimer = "Career matches are currently unavailable.";
  }

  if (topCareerId) {
    try {
      educationPathways = await prismaPathways(topCareerId);
    } catch (e) {
      console.error("[dashboard] education pathways failed:", e);
      educationPathways = null;
    }
    try {
      const uni = await getUniversityMatchesForStudent(userId, {
        careerId: topCareerId,
        limit: 3,
      });
      universityMatches = uni.matches;
      universityMatchDisclaimer = uni.disclaimer ?? null;
    } catch (e) {
      console.error("[dashboard] university matches failed:", e);
      universityMatches = null;
      universityMatchDisclaimer = "Personalized university matches are currently unavailable.";
    }
  }

  let trendingCareers: any[] = [];
  let trendingResult: PersonalizedTrendingResult | null = null;
  try {
    const t = await getStudentTrendingCareers(userId, { limit: 6 });
    trendingResult = t;
    trendingCareers = t.items.map((item) => ({
      career: { id: item.careerId, name: item.name, slug: item.slug, title: item.title, category: item.category },
      relevanceScore: item.relevanceScore,
      trendScore: item.trendScore,
      trendCategory: item.trendCategory,
    }));
  } catch (e) {
    console.error("[dashboard] personalized trending failed:", e);
    trendingCareers = [];
    trendingResult = null;
  }

  return {
    ...basics,
    topCareerMatches,
    careerMatchDisclaimer,
    educationPathways,
    universityMatches,
    universityMatchDisclaimer,
    trendingCareers,
    trendingResult,
    topCareerId,
  };
}

async function prismaPathways(careerId: string) {
  const pathways = await prisma.careerEducationPathway.findMany({
    where: { careerId, type: "DEGREE_PATHWAY" },
    include: { degree: true, specialization: true },
    orderBy: [{ priority: "asc" }, { degree: { name: "asc" } }],
  });
  const subjectLinks = await prisma.careerEducationPathway.findMany({
    where: { careerId, type: "SUBJECT_LINK" },
    include: { subject: true },
    orderBy: { subject: { name: "asc" } },
  });
  return {
    primary: pathways.filter((p) => p.priority === "PRIMARY"),
    alternative: pathways.filter((p) => p.priority === "ALTERNATIVE"),
    optional: pathways.filter((p) => p.priority === "OPTIONAL"),
    recommendedSubjects: subjectLinks.map((s) => s.subject).filter(Boolean),
  };
}
