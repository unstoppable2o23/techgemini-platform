import { prisma } from "@/lib/prisma";
import {
  buildStudentCareerProfile,
  type AssessmentKind,
  type RawAssessmentResults,
  type StudentCareerProfile,
} from "./career-intelligence";
import type { ExamReport } from "./tests";

const KINDS: AssessmentKind[] = [
  "stream",
  "ideal",
  "personality",
  "intelligences",
  "learning",
];

/**
 * Loads the student's latest COMPLETED result per assessment kind and
 * aggregates them into a unified 0-100 dimension profile used by the
 * career matching engine.
 */
export async function getStudentAssessmentProfile(
  userId: string
): Promise<StudentCareerProfile> {
  const assignments = await prisma.testAssignment.findMany({
    where: {
      studentId: userId,
      status: "COMPLETED",
      kind: { in: KINDS },
    },
    orderBy: { createdAt: "desc" },
    select: { kind: true, result: true, completedAt: true },
  });

  const latest: RawAssessmentResults = {};
  const seen = new Set<string>();
  for (const a of assignments) {
    if (seen.has(a.kind)) continue;
    seen.add(a.kind);
    if (a.result && typeof a.result === "object") {
      (latest as Record<string, ExamReport>)[a.kind] = a.result as ExamReport;
    }
  }

  return buildStudentCareerProfile(latest);
}
