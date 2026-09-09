/**
 * Central assessment-state helper.
 *
 * Assessments are COUNSELLOR-ASSIGNED: a student only sees/answers the kinds a
 * counselor assigned to them. Completeness denominators are therefore derived
 * from the row set for that student (the "assigned suite"), never a fixed 5.
 *
 *  - ASSIGNED   = assigned, not started
 *  - IN_PROGRESS = saved partial answers
 *  - COMPLETED  = submitted (completedAt set)
 *
 * A student with zero assignments has an empty suite: nothing is incomplete
 * and nothing is blocked. Pure `summarize*` functions keep the batch loader
 * (command center) and the per-student loaders consistent without extra DB
 * calls.
 */
import { prisma } from "../prisma.ts";

export const ASSESSMENT_KINDS = [
  "stream",
  "ideal",
  "personality",
  "intelligences",
  "learning",
] as const;

export const ASSESSMENT_KIND_LABELS: Record<string, string> = {
  stream: "Stream Selector",
  ideal: "Ideal Career Test",
  personality: "Personality Profile",
  intelligences: "Multiple Intelligences",
  learning: "Learning & Productivity",
};

export interface AssessmentSummary {
  hasAssignments: boolean;
  /** Distinct assigned kinds (the denominator for this student). */
  assignedKinds: string[];
  completedKinds: string[];
  inProgressKinds: string[];
  notStartedKinds: string[];
  assignedTotal: number;
  completedCount: number;
}

export interface AssessmentRowShape {
  kind: string;
  status: string;
}

export function summarizeAssignments(rows: AssessmentRowShape[]): AssessmentSummary {
  const KINDS = ASSESSMENT_KINDS as readonly string[];
  const assigned = new Set<string>();
  const completed = new Set<string>();
  const inProgress = new Set<string>();
  for (const r of rows) {
    if (!KINDS.includes(r.kind)) continue;
    assigned.add(r.kind);
    if (r.status === "COMPLETED") completed.add(r.kind);
    else if (r.status === "IN_PROGRESS") inProgress.add(r.kind);
  }

  const assignedKinds = KINDS.filter((k) => assigned.has(k));
  return {
    hasAssignments: assignedKinds.length > 0,
    assignedKinds,
    completedKinds: KINDS.filter((k) => completed.has(k)),
    inProgressKinds: KINDS.filter(
      (k) => assigned.has(k) && !completed.has(k) && inProgress.has(k)
    ),
    notStartedKinds: KINDS.filter(
      (k) => assigned.has(k) && !completed.has(k) && !inProgress.has(k)
    ),
    assignedTotal: assignedKinds.length,
    completedCount: KINDS.filter((k) => completed.has(k)).length,
  };
}

export interface AssessmentStudentRowShape extends AssessmentRowShape {
  studentId: string;
}

/** Batch variant for roster loaders (e.g. counselor command center). */
export function summarizeAssignmentsByStudent(
  rows: AssessmentStudentRowShape[]
): Map<string, AssessmentSummary> {
  const byStudent = new Map<string, AssessmentRowShape[]>();
  for (const r of rows) {
    const list = byStudent.get(r.studentId) ?? [];
    list.push({ kind: r.kind, status: r.status });
    byStudent.set(r.studentId, list);
  }
  const out = new Map<string, AssessmentSummary>();
  for (const [studentId, list] of byStudent) {
    out.set(studentId, summarizeAssignments(list));
  }
  return out;
}

export async function getAssessmentSummary(userId: string): Promise<AssessmentSummary> {
  const rows = await prisma.testAssignment.findMany({
    where: { studentId: userId, kind: { in: [...ASSESSMENT_KINDS] } },
    select: { kind: true, status: true },
  });
  return summarizeAssignments(rows);
}