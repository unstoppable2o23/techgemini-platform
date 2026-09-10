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
  assessmentTotal: 0,
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
  let topCareerMatches: any[] = [];
  let careerMatchDisclaimer: string | null = null;
  let topCareerId: string | null = null;
  let trendingCareers: any[] = [];
  let trendingResult: PersonalizedTrendingResult | null = null;

  // The three big loads are independent of each other, so run them concurrently
  // instead of serially. Pathways + university matches still wait on the top
  // career id produced by the career-matches load.
  const [basicsRes, matchesRes, trendingRes] = await Promise.allSettled([
    getStudentBasics(userId),
    getCareerMatches(userId, { limit: 3 }),
    getStudentTrendingCareers(userId, { limit: 6 }),
  ]);

  if (basicsRes.status === "fulfilled") {
    basics = basicsRes.value;
  } else {
    console.error("[dashboard] getStudentBasics failed:", basicsRes.reason);
  }

  if (matchesRes.status === "fulfilled") {
    topCareerMatches = matchesRes.value.matches;
    careerMatchDisclaimer = matchesRes.value.disclaimer ?? null;
    topCareerId = topCareerMatches[0]?.career?.id ?? null;
  } else {
    console.error("[dashboard] getCareerMatches failed:", matchesRes.reason);
    careerMatchDisclaimer = "Career matches are currently unavailable.";
  }

  if (trendingRes.status === "fulfilled") {
    trendingResult = trendingRes.value;
    trendingCareers = trendingRes.value.items.map((item) => ({
      career: { id: item.careerId, name: item.name, slug: item.slug, title: item.title, category: item.category },
      relevanceScore: item.relevanceScore,
      trendScore: item.trendScore,
      trendCategory: item.trendCategory,
    }));
  } else {
    console.error("[dashboard] personalized trending failed:", trendingRes.reason);
  }

  let educationPathways: any = null;
  let universityMatches: any = null;
  let universityMatchDisclaimer: string | null = null;

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
