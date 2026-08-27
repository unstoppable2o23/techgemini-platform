import { prisma } from "../prisma.ts";

export type NoteType =
  | "GENERAL"
  | "CAREER"
  | "EDUCATION"
  | "UNIVERSITY"
  | "FOLLOW_UP";

export type ActionType =
  | "FOLLOW_UP"
  | "ASSESSMENT"
  | "CAREER_REVIEW"
  | "EDUCATION_REVIEW"
  | "UNIVERSITY_REVIEW"
  | "GENERAL";

export async function listNotes(studentProfileId: string) {
  return prisma.counselorNote.findMany({
    where: { studentId: studentProfileId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createNote(input: {
  studentId: string;
  counselorId: string;
  type?: string;
  content: string;
}) {
  return prisma.counselorNote.create({
    data: {
      studentId: input.studentId,
      counselorId: input.counselorId,
      type: (input.type as NoteType) ?? "GENERAL",
      content: input.content,
    },
  });
}

export async function listActions(studentProfileId: string) {
  return prisma.counselorAction.findMany({
    where: { studentId: studentProfileId },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
  });
}

export async function createAction(input: {
  studentId: string;
  counselorId: string;
  type?: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
}) {
  return prisma.counselorAction.create({
    data: {
      studentId: input.studentId,
      counselorId: input.counselorId,
      type: (input.type as ActionType) ?? "GENERAL",
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    },
  });
}

export async function updateAction(
  actionId: string,
  counselorId: string,
  data: { completed?: boolean; title?: string; description?: string | null; dueDate?: string | null }
) {
  return prisma.counselorAction.updateMany({
    where: { id: actionId, counselorId },
    data: {
      ...(data.completed !== undefined ? { completed: data.completed } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.dueDate !== undefined
        ? { dueDate: data.dueDate ? new Date(data.dueDate) : null }
        : {}),
    },
  });
}

export async function listFeedback(studentProfileId: string) {
  return prisma.counselorRecommendationFeedback.findMany({
    where: { studentId: studentProfileId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createFeedback(input: {
  studentId: string;
  counselorId: string;
  recommendationType: "CAREER" | "UNIVERSITY";
  careerId?: string | null;
  institutionId?: string | null;
  institutionType?: string | null;
  decision: string;
  note?: string | null;
}) {
  return prisma.counselorRecommendationFeedback.create({
    data: {
      studentId: input.studentId,
      counselorId: input.counselorId,
      recommendationType: input.recommendationType,
      careerId: input.careerId ?? null,
      institutionId: input.institutionId ?? null,
      institutionType: input.institutionType ?? null,
      decision: input.decision,
      note: input.note ?? null,
    },
  });
}
