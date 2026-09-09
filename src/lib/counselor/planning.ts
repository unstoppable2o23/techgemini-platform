/**
 * Phase 27 — Counselor planning records (Parts 6 & 7).
 *
 * Career decisions and program-plan flags are ADVISOR CONTEXT only:
 *  - they never replace StudentProfile.preferredCareerId
 *  - they are never fed to the frozen career engine
 *  - program flags sit against canonical AcademicProgram rows (via
 *    CareerProgramMapping), never invented in the UI
 */
import { prisma } from "../prisma.ts";

export type CareerDecisionInput = {
  studentProfileId: string;
  createdById: string;
  careerId: string;
  discussed?: boolean;
  studentInterest?: boolean;
  shortlistedCareer?: boolean;
  selectedPathway?: boolean;
  counselorRecommendation?: string | null;
  followUpRequired?: boolean;
  note?: string | null;
};

export type ProgramPlanInput = {
  studentProfileId: string;
  createdById: string;
  careerId: string;
  programId: string;
  discussed?: boolean;
  shortlisted?: boolean;
  requiresResearch?: boolean;
  studentInterested?: boolean;
  note?: string | null;
};

export async function listCareerDecisions(studentProfileId: string) {
  return prisma.counselorCareerDecision.findMany({
    where: { studentId: studentProfileId },
    orderBy: [{ selectedPathway: "desc" }, { updatedAt: "desc" }],
  });
}

export async function upsertCareerDecision(input: CareerDecisionInput) {
  const changes: Record<string, unknown> = { createdById: input.createdById };
  for (const key of [
    "discussed",
    "studentInterest",
    "shortlistedCareer",
    "selectedPathway",
    "followUpRequired",
  ] as const) {
    if (input[key] !== undefined) changes[key] = input[key];
  }
  if (input.counselorRecommendation !== undefined) {
    changes.counselorRecommendation = input.counselorRecommendation ?? null;
  }
  if (input.note !== undefined) changes.note = input.note ?? null;
  return prisma.counselorCareerDecision.upsert({
    where: {
      studentId_careerId: {
        studentId: input.studentProfileId,
        careerId: input.careerId,
      },
    },
    create: { studentId: input.studentProfileId, careerId: input.careerId, ...changes },
    update: changes,
  });
}

export async function listProgramPlans(studentProfileId: string) {
  return prisma.counselorProgramPlan.findMany({
    where: { studentId: studentProfileId },
    orderBy: [{ shortlisted: "desc" }, { updatedAt: "desc" }],
  });
}

export async function upsertProgramPlan(input: ProgramPlanInput) {
  const changes: Record<string, unknown> = { createdById: input.createdById };
  for (const key of ["discussed", "shortlisted", "requiresResearch", "studentInterested"] as const) {
    if (input[key] !== undefined) changes[key] = input[key];
  }
  if (input.note !== undefined) changes.note = input.note ?? null;
  return prisma.counselorProgramPlan.upsert({
    where: {
      studentId_careerId_programId: {
        studentId: input.studentProfileId,
        careerId: input.careerId,
        programId: input.programId,
      },
    },
    create: { studentId: input.studentProfileId, careerId: input.careerId, programId: input.programId, ...changes },
    update: changes,
  });
}