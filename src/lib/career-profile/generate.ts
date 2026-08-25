import { prisma } from "@/lib/prisma";
import type { TraitDimension } from "@prisma/client";
import type { ExamReport } from "../tests";
import { normalizeAssessmentReport } from "./normalize";
import { calculateCompleteness } from "./completeness";

const KINDS: string[] = ["stream", "ideal", "personality", "intelligences", "learning"];

export type ProfileGenerationResult = {
  profileId: string;
  completeness: number;
  level: string;
  signals: number;
  assessmentCoverage: string[];
  created: boolean;
};

/**
 * Generates (or regenerates) the normalized Student Career Profile from the
 * student's latest COMPLETED assessment assignments.
 *
 * Idempotent: signals are replaced wholesale inside a transaction and the
 * profile row is upserted, so running this any number of times produces the
 * same final state.
 */
export async function generateStudentCareerProfile(
  userId: string
): Promise<ProfileGenerationResult | null> {
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
      completedAt: true,
      assessmentVersion: true,
    },
  });

  const latestByKind = new Map<string, (typeof assignments)[number]>();
  for (const a of assignments) {
    if (!latestByKind.has(a.kind)) latestByKind.set(a.kind, a);
  }

  const completedAssessments: string[] = [];
  const allSignals: Array<{
    dimension: TraitDimension;
    value: string;
    score: number;
    confidence: number;
    sourceAssessment: string;
    sourceAssignmentId: string;
    sourceVersion: string;
  }> = [];
  const primaryInterests = new Set<string>();
  const strengths = new Set<string>();
  const processedAssignments: string[] = [];

  for (const kind of KINDS) {
    const assignment = latestByKind.get(kind);
    if (!assignment || !assignment.result) continue;
    completedAssessments.push(kind);
    processedAssignments.push(assignment.id);

    const report = assignment.result as ExamReport;
    const { signals, primaryInterests: pi, strengths: strengthsList } = normalizeAssessmentReport(
      kind,
      report,
      {
        assignmentId: assignment.id,
        version: assignment.assessmentVersion || "1.0",
      }
    );
    for (const s of signals) {
      allSignals.push({ ...s, sourceAssignmentId: assignment.id });
    }
    for (const p of pi) primaryInterests.add(p);
    for (const s2 of strengthsList) strengths.add(s2);
  }

  const dimensionsWithSignals = [
    ...new Set(allSignals.map((s) => s.dimension as string)),
  ];
  const completeness = calculateCompleteness({
    completedAssessments,
    dimensionsWithSignals,
  });

  const profile = await prisma.$transaction(async (tx) => {
    const existing = await tx.studentCareerProfile.findUnique({
      where: { studentId: userId },
    });

    const upserted = existing
      ? await tx.studentCareerProfile.update({
          where: { id: existing.id },
          data: {
            completeness: completeness.score,
            level: completeness.level,
            primaryInterests: [...primaryInterests].slice(0, 10),
            strengths: [...strengths].slice(0, 12),
            lastCalculatedAt: new Date(),
            metadata: {
              assessmentCoverage: completeness.assessmentCoverage,
              dimensionBreakdown: completeness.dimensionBreakdown,
              completedAssessments,
            },
          },
        })
      : await tx.studentCareerProfile.create({
          data: {
            studentId: userId,
            completeness: completeness.score,
            level: completeness.level,
            primaryInterests: [...primaryInterests].slice(0, 10),
            strengths: [...strengths].slice(0, 12),
            metadata: {
              assessmentCoverage: completeness.assessmentCoverage,
              dimensionBreakdown: completeness.dimensionBreakdown,
              completedAssessments,
            },
          },
        });

    await tx.studentCareerSignal.deleteMany({ where: { profileId: upserted.id } });
    if (allSignals.length > 0) {
      await tx.studentCareerSignal.createMany({
        data: allSignals.map((s) => ({
          profileId: upserted.id,
          dimension: s.dimension,
          value: s.value,
          score: s.score,
          sourceAssessment: s.sourceAssessment,
          sourceAssignmentId: s.sourceAssignmentId,
          confidence: s.confidence,
          sourceVersion: s.sourceVersion,
        })),
      });
    }

    return upserted;
  });

  // mark assignments as profile-processed (non-blocking, best-effort)
  if (processedAssignments.length > 0) {
    await prisma.testAssignment.updateMany({
      where: { id: { in: processedAssignments } },
      data: { profileProcessedAt: new Date() },
    });
  }

  return {
    profileId: profile.id,
    completeness: profile.completeness,
    level: profile.level,
    signals: allSignals.length,
    assessmentCoverage: completedAssessments,
    created: !latestByKind.size ? false : true,
  };
}
