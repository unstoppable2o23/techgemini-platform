import { prisma } from "../prisma.ts";
import type { TraitDimension } from "@prisma/client";
import type { ExamReport } from "../tests";
import { normalizeAssessmentReport } from "./normalize";
import { calculateAssessmentCompleteness, calculateProfileCompleteness } from "./completeness";

const KINDS: string[] = ["stream", "ideal", "personality", "intelligences", "learning"];

export type ProfileSignalInput = {
  dimension: TraitDimension;
  value: string;
  score: number;
  sourceType: string;
  sourceAssessment: string | null;
  sourceAssignmentId: string | null;
  sourceVersion: string;
  confidence: number;
};

export type ProfileGenerationResult = {
  profileId: string;
  profileCompleteness: number;
  assessmentCompleteness: number;
  level: string;
  signals: number;
  assessmentCoverage: string[];
  hasAssessmentData: boolean;
  hasProfileData: boolean;
};

function mapStudentProfileToSignals(
  profile: {
    gradeLevel: string | null;
    studyLevel: string | null;
    exams: string[];
    state: string | null;
    preferredCareer: string | null;
    highestEducation: string | null;
    averageGrade: string | null;
    targetCountry: string | null;
    careerPlanNotes: string | null;
    tuitionBudget: string | null;
    subjectsStudied: string[];
    subjectsEnjoyed: string[];
    activityInterests: string[];
  }
): ProfileSignalInput[] {
  const signals: ProfileSignalInput[] = [];
  const push = (
    dimension: TraitDimension,
    value: string,
    score: number,
    sourceType: string
  ) => {
    if (!value?.trim()) return;
    signals.push({
      dimension,
      value: value.trim(),
      score,
      sourceType,
      sourceAssessment: null,
      sourceAssignmentId: null,
      sourceVersion: "1.0",
      confidence: 1,
    });
  };

  if (profile.preferredCareer) {
    push("INTEREST", profile.preferredCareer, 100, "STUDENT_PROFILE");
  }
  if (profile.studyLevel) {
    push("EDUCATION", `study_level:${profile.studyLevel}`, 100, "STUDENT_PROFILE");
  }
  if (profile.highestEducation) {
    push("EDUCATION", `highest_education:${profile.highestEducation}`, 100, "ACADEMIC");
  }
  if (profile.gradeLevel) {
    push("EDUCATION", `grade_level:${profile.gradeLevel}`, 100, "ACADEMIC");
  }
  if (profile.averageGrade) {
    push("EDUCATION", `average_grade:${profile.averageGrade}`, 100, "ACADEMIC");
  }
  for (const exam of profile.exams || []) {
    if (exam?.trim()) push("EDUCATION", `exam:${exam.trim()}`, 100, "ACADEMIC");
  }
  if (profile.state) {
    push("WORK_ENVIRONMENT", `state:${profile.state}`, 100, "STUDENT_PROFILE");
  }
  if (profile.targetCountry) {
    push("WORK_ENVIRONMENT", `target_country:${profile.targetCountry}`, 100, "PREFERENCE");
  }
  if (profile.tuitionBudget) {
    push("WORK_ENVIRONMENT", `budget:${profile.tuitionBudget}`, 100, "PREFERENCE");
  }
  if (profile.careerPlanNotes) {
    for (const line of profile.careerPlanNotes.split(/[.\n]/)) {
      const trimmed = line.trim();
      if (trimmed.length > 10) {
        push("INTEREST", `career_note:${trimmed.slice(0, 100)}`, 50, "STUDENT_PROFILE");
      }
    }
  }

  for (const subject of profile.subjectsStudied || []) {
    if (subject?.trim()) push("INTEREST", `subject_studied:${subject.trim()}`, 85, "STUDENT_PROFILE");
  }
  for (const subject of profile.subjectsEnjoyed || []) {
    if (subject?.trim()) push("INTEREST", `subject_enjoyed:${subject.trim()}`, 80, "STUDENT_PROFILE");
  }
  for (const activity of profile.activityInterests || []) {
    if (activity?.trim()) push("INTEREST", `activity:${activity.trim()}`, 80, "STUDENT_PROFILE");
  }

  return signals;
}

/**
 * Generates (or regenerates) the Student Career Profile from ALL available
 * sources: completed assessments AND StudentProfile non-psychometric data.
 *
 * Idempotent: signals are replaced wholesale inside a transaction.
 * Zero-assessment students get a valid profile from StudentProfile alone.
 */
export async function generateStudentCareerProfile(
  userId: string
): Promise<ProfileGenerationResult | null> {
  // ---- load latest COMPLETED assessment per kind ----
  const assignments = await prisma.testAssignment.findMany({
    where: {
      studentId: userId,
      status: "COMPLETED",
      kind: { in: KINDS },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      result: true,
      assessmentVersion: true,
    },
  });

  const latestByKind = new Map<string, (typeof assignments)[number]>();
  for (const a of assignments) {
    if (!latestByKind.has(a.kind)) latestByKind.set(a.kind, a);
  }

  const completedAssessments: string[] = [];
  const processedAssignments: string[] = [];
  const assessmentSignals: ProfileSignalInput[] = [];
  const primaryInterests = new Set<string>();
  const strengths = new Set<string>();

  for (const kind of KINDS) {
    const assignment = latestByKind.get(kind);
    if (!assignment || !assignment.result) continue;
    completedAssessments.push(kind);
    processedAssignments.push(assignment.id);

    const report = assignment.result as ExamReport;
    const version = assignment.assessmentVersion || "1.0";
    const { signals, primaryInterests: pi, strengths: sl } =
      normalizeAssessmentReport(kind, report, {
        assignmentId: assignment.id,
        version,
      });
    for (const s of signals) {
      assessmentSignals.push({
        dimension: s.dimension,
        value: s.value,
        score: s.score,
        sourceType: "ASSESSMENT",
        sourceAssessment: s.sourceAssessment,
        sourceAssignmentId: assignment.id,
        sourceVersion: s.sourceVersion || version,
        confidence: s.confidence,
      });
    }
    for (const p of pi) primaryInterests.add(p);
    for (const s of sl) strengths.add(s);
  }

  // ---- load StudentProfile non-psychometric data ----
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: {
      gradeLevel: true,
      studyLevel: true,
      exams: true,
      state: true,
      preferredCareer: true,
      highestEducation: true,
      averageGrade: true,
      targetCountry: true,
      careerPlanNotes: true,
      tuitionBudget: true,
      subjectsStudied: true,
      subjectsEnjoyed: true,
      activityInterests: true,
    },
  });

  const profileSignals = studentProfile
    ? mapStudentProfileToSignals(studentProfile)
    : [];

  const allSignals = [...assessmentSignals, ...profileSignals];

  // ---- dual completeness ----
  const assessmentCompleteness = calculateAssessmentCompleteness(completedAssessments);
  const dimensionsWithSignals = [...new Set(allSignals.map((s) => s.dimension as string))];
  const profileCompleteness = calculateProfileCompleteness({
    completedAssessments,
    dimensionsWithSignals,
    hasProfileData: profileSignals.length > 0,
    hasPreferredCareer: Boolean(studentProfile?.preferredCareer),
  });

  // ---- persist ----
  const profile = await prisma.$transaction(async (tx) => {
    const existing = await tx.studentCareerProfile.findUnique({
      where: { studentId: userId },
    });

    const profileData = {
      completeness: profileCompleteness.score,
      assessmentCompleteness: assessmentCompleteness.score,
      level: profileCompleteness.level,
      primaryInterests: [...primaryInterests].slice(0, 10),
      strengths: [...strengths].slice(0, 12),
      lastCalculatedAt: new Date(),
      metadata: {
        assessmentCoverage: completedAssessments,
        dimensionBreakdown: profileCompleteness.dimensionBreakdown,
        completedAssessments,
        hasAssessmentData: assessmentSignals.length > 0,
        hasProfileData: profileSignals.length > 0,
        profileSignalCount: profileSignals.length,
        assessmentSignalCount: assessmentSignals.length,
      },
    };

    const upserted = existing
      ? await tx.studentCareerProfile.update({
          where: { id: existing.id },
          data: profileData,
        })
      : await tx.studentCareerProfile.create({
          data: { studentId: userId, ...profileData },
        });

    await tx.studentCareerSignal.deleteMany({ where: { profileId: upserted.id } });
    if (allSignals.length > 0) {
      await tx.studentCareerSignal.createMany({
        data: allSignals.map((s) => ({
          profileId: upserted.id,
          dimension: s.dimension,
          value: s.value,
          score: s.score,
          sourceType: s.sourceType,
          sourceAssessment: s.sourceAssessment,
          sourceAssignmentId: s.sourceAssignmentId,
          sourceVersion: s.sourceVersion,
          confidence: s.confidence,
        })),
      });
    }

    return upserted;
  });

  if (processedAssignments.length > 0) {
    await prisma.testAssignment.updateMany({
      where: { id: { in: processedAssignments } },
      data: { profileProcessedAt: new Date() },
    });
  }

  return {
    profileId: profile.id,
    profileCompleteness: profile.completeness,
    assessmentCompleteness: profile.assessmentCompleteness,
    level: profile.level,
    signals: allSignals.length,
    assessmentCoverage: completedAssessments,
    hasAssessmentData: assessmentSignals.length > 0,
    hasProfileData: profileSignals.length > 0,
  };
}
