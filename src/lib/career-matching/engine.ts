import { prisma } from "../prisma.ts";
import type { TraitDimension } from "@prisma/client";
import { generateStudentCareerProfile } from "../career-profile/generate.ts";
import { scoreCareer, rankMatches } from "./score";
import type { CareerCandidate, CareerMatch, CareerMatchInput, MatchResult } from "./types";
import { NO_ASSESSMENT_DISCLAIMER } from "./config";
import { resolvePreferredCareer, type PreferredCareerResolution } from "./preferred-career";

const ALL_KINDS = ["stream", "ideal", "personality", "intelligences", "learning"];

export type CareerMatchOptions = {
  limit?: number;
  refresh?: boolean;
};

/**
 * Generates career matches for a student.
 * Loads the student's career profile (generating it if needed), loads all
 * active careers, and scores each career against the student's signals.
 */
export async function getCareerMatches(
  userId: string,
  options: CareerMatchOptions = {}
): Promise<MatchResult> {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 200);

  // ---- ensure profile is up to date ----
  if (options.refresh) {
    await generateStudentCareerProfile(userId);
  }

  // ---- load student career profile ----
  let profile = await prisma.studentCareerProfile.findUnique({
    where: { studentId: userId },
    include: { signals: true },
  });

  if (!profile) {
    // try generating
    await generateStudentCareerProfile(userId);
    profile = await prisma.studentCareerProfile.findUnique({
      where: { studentId: userId },
      include: { signals: true },
    });
  }

  // ---- load student signals ----
  const studentSignals: CareerMatchInput[] = (profile?.signals ?? []).map((s) => ({
    dimension: s.dimension as TraitDimension,
    value: s.value,
    score: s.score,
    confidence: s.confidence,
    sourceType: s.sourceType,
    sourceAssessment: s.sourceAssessment,
  }));

  // ---- load preferred career from StudentProfile ----
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { preferredCareer: true, preferredCareerId: true },
  });

  // ---- load all active careers with traits + education paths ----
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      title: true,
      category: true,
      subcategory: true,
      shortDescription: true,
      demandLevel: true,
      jobGrowth: true,
      salaryEntry: true,
      salarySenior: true,
      minStudyLevel: true,
      isEmerging: true,
      technicalSkills: true,
      softSkills: true,
      interests: true,
      personalityTraits: true,
      recommendedDegrees: true,
      recommendedSubjects: true,
      toolsAndTechnologies: true,
      workActivities: true,
      workEnvironment: true,
      traits: {
        select: { dimension: true, value: true, weight: true },
      },
      careerEducationPathways: {
        select: {
          degree: { select: { name: true } },
          specialization: { select: { name: true } },
          priority: true,
        },
      },
    },
  });

  // ---- resolve preferred career (canonical id first, legacy name fallback) ----
  const preferredCareer = studentProfile?.preferredCareer || null;
  const preferredCareerId = studentProfile?.preferredCareerId || null;
  const preferred: PreferredCareerResolution = resolvePreferredCareer(
    preferredCareerId,
    preferredCareer,
    careers.map((c) => ({ id: c.id, name: c.name }))
  );

  // ---- score each career ----
  const candidates: CareerCandidate[] = careers.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    title: c.title,
    category: c.category,
    subcategory: c.subcategory,
    shortDescription: c.shortDescription,
    demandLevel: c.demandLevel,
    jobGrowth: c.jobGrowth,
    salaryEntry: c.salaryEntry,
    salarySenior: c.salarySenior,
    minStudyLevel: c.minStudyLevel,
    isEmerging: c.isEmerging,
    technicalSkills: c.technicalSkills,
    softSkills: c.softSkills,
    interests: c.interests,
    personalityTraits: c.personalityTraits,
    recommendedDegrees: c.recommendedDegrees,
    recommendedSubjects: c.recommendedSubjects,
    educationPaths: c.careerEducationPathways.map((p) => ({
      degreeName: p.degree?.name ?? null,
      specializationName: p.specialization?.name ?? null,
      priority: p.priority,
    })),
    traits: c.traits.map((t) => ({
      dimension: t.dimension as TraitDimension,
      value: t.value,
      weight: t.weight,
    })),
  }));

  const scored: CareerMatch[] = candidates.map((career) =>
    scoreCareer(career, studentSignals, preferred)
  );

  const ranked = rankMatches(scored);
  const hasAssessmentData = studentSignals.some(
    (s) => s.sourceType === "ASSESSMENT"
  );

  const testAssignments = await prisma.testAssignment.findMany({
    where: { studentId: userId, status: "COMPLETED", kind: { in: ALL_KINDS } },
    select: { kind: true },
  });
  const completedKinds = [...new Set(testAssignments.map((a) => a.kind))];

  return {
    matches: ranked.slice(0, limit),
    totalCareersScored: candidates.length,
    studentSignalsUsed: studentSignals.length,
    assessmentCoverage: completedKinds,
    hasAssessmentData,
    disclaimer: hasAssessmentData
      ? null
      : NO_ASSESSMENT_DISCLAIMER,
  };
}

/**
 * Gets a detailed match explanation for a single career.
 */
export async function getCareerMatchDetail(
  userId: string,
  careerId: string
): Promise<CareerMatch | null> {
  const result = await getCareerMatches(userId, { limit: 200 });
  return result.matches.find((m) => m.careerId === careerId) ?? null;
}

/**
 * Strips the internal match trace before a result is exposed to students.
 * The trace contains internal scoring metadata and is not student-facing.
 */
export function sanitizeCareerMatch(
  match: CareerMatch
): Omit<CareerMatch, "trace"> {
  const { trace: _trace, ...rest } = match;
  return rest;
}
