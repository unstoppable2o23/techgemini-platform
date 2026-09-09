import { prisma } from "../prisma.ts";
import type { AssessmentProgress } from "./types.ts";
import {
  ASSESSMENT_KINDS,
  ASSESSMENT_KIND_LABELS,
  summarizeAssignments,
} from "./assessments.ts";

const KIND_LABELS: Record<string, string> = {
  stream: "Stream Assessment",
  ideal: "Ideal Career",
  personality: "Personality Profile",
  intelligences: "Multiple Intelligences",
  learning: "Learning Style",
};

export interface StudentBasics {
  profileCompleteness: number;
  hasAssessments: boolean;
  assessmentProgress: AssessmentProgress[];
  assessmentCompletedCount: number;
  assessmentTotal: number;
  savedCount: number;
  savedItems: Array<{
    id: string;
    itemType: string;
    itemId: string;
    title: string | null;
    note: string | null;
  }>;
  nextSteps: string[];
}

export async function getStudentBasics(userId: string): Promise<StudentBasics> {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  const [
    assignments,
    saved,
  ] = await Promise.all([
    prisma.testAssignment.findMany({
      where: {
        studentId: userId,
        kind: { in: ASSESSMENT_KINDS as unknown as string[] },
      },
      select: { kind: true, status: true },
    }),
    prisma.studentShortlist.findMany({
      where: { studentId: userId },
      select: { id: true, itemType: true, itemId: true, note: true },
    }),
  ]);

  const summary = summarizeAssignments(assignments);
  const hasAssessments = summary.hasAssignments;

  const profileCompleteness = computeProfileCompleteness(studentProfile);
  const statusByKind = new Map<string, "ASSIGNED" | "IN_PROGRESS" | "COMPLETED">(
    summary.completedKinds.map((k) => [k, "COMPLETED"])
  );
  for (const k of summary.inProgressKinds) statusByKind.set(k, "IN_PROGRESS");
  for (const k of summary.notStartedKinds) statusByKind.set(k, "ASSIGNED");
  const assessmentProgress: AssessmentProgress[] = ASSESSMENT_KINDS.map(
    (kind) => ({
      kind,
      label: KIND_LABELS[kind] ?? ASSESSMENT_KIND_LABELS[kind] ?? kind,
      completed: statusByKind.get(kind) === "COMPLETED",
      assigned: statusByKind.has(kind),
      status: statusByKind.get(kind) ?? null,
    })
  );

  const nextSteps = buildNextSteps({
    hasProfile: profileCompleteness > 0,
    hasAssessments,
    savedCount: saved.length,
  });

  return {
    profileCompleteness,
    hasAssessments,
    assessmentProgress,
    assessmentCompletedCount: summary.completedCount,
    assessmentTotal: summary.assignedTotal,
    savedCount: saved.length,
    savedItems: saved.map((s) => ({
      id: s.id,
      itemType: s.itemType,
      itemId: s.itemId,
      title: null,
      note: s.note,
    })),
    nextSteps,
  };
}

/**
 * Phase 26 — profile completeness is also needed by the journey-state engine
 * (and the counselor 360 journey block), so it is exported here.
 */
export function computeProfileCompleteness(profile: any): number {
  if (!profile) return 0;
  const signals = [
    profile.gradeLevel,
    profile.studyLevel,
    profile.nationality,
    profile.state,
    profile.targetCountry,
    profile.highestEducation,
    profile.averageGrade,
    profile.preferredCareer,
    profile.careerPrefsFilled,
    profile.gender,
    profile.dateOfBirth,
    profile.mobile,
  ];
  const filled = signals.filter(Boolean).length;
  return Math.round((filled / signals.length) * 100);
}

function buildNextSteps(opts: {
  hasProfile: boolean;
  hasAssessments: boolean;
  savedCount: number;
}): string[] {
  const steps: string[] = [];
  if (!opts.hasProfile) {
    steps.push("Complete your career profile to personalize recommendations.");
  }
  if (!opts.hasAssessments) {
    steps.push("Take your assessments to unlock interest- and aptitude-based matches.");
  }
  steps.push("Explore careers in the Career Library and review your top matches.");
  if (opts.savedCount === 0) {
    steps.push("Save careers and universities you like to track them here.");
  }
  steps.push("Discuss your options with your counselor when you are ready.");
  return steps;
}
