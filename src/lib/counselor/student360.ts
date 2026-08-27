import { prisma } from "../prisma.ts";
import { getCareerMatches } from "../career-matching/engine.ts";
import { getUniversityMatchesForStudent } from "../university-matching/engine.ts";

const ASSESSMENT_KINDS = ["stream", "ideal", "personality", "intelligences", "learning"];

export type Student360 = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  profile: Record<string, any> | null;
  assessmentByKind: Record<
    string,
    {
      kind: string;
      assigned: boolean;
      completed: boolean;
      completedAt: string | null;
      version: string | null;
    }
  >;
  assessmentCompletedCount: number;
  assessmentTotal: number;
  careerProfile: Record<string, any> | null;
  careerMatches: any[];
  careerMatchDisclaimer: string | null;
  educationPathways: any | null;
  universityMatches: any | null;
  notes: any[];
  actions: any[];
  feedback: any[];
  appointments: any[];
  chats: any[];
};

export async function getStudent360(
  studentUserId: string,
  opts?: { counselorUserId?: string }
): Promise<Student360 | null> {
  const user = await prisma.user.findUnique({
    where: { id: studentUserId },
    include: {
      studentProfile: {
        include: {
          counselor: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
          featureAccess: true,
        },
      },
      careerProfile: { include: { signals: true } },
    },
  });

  if (!user || !user.studentProfile) return null;
  const profile = user.studentProfile;

  // ---- Assessments (5 kinds) ----
  const assignments = await prisma.testAssignment.findMany({
    where: { studentId: studentUserId },
    orderBy: { createdAt: "desc" },
  });
  const assessmentByKind: Student360["assessmentByKind"] = {};
  for (const kind of ASSESSMENT_KINDS) {
    const all = assignments.filter((a) => a.kind === kind);
    const completed = all.find((a) => a.status === "COMPLETED");
    assessmentByKind[kind] = {
      kind,
      assigned: all.length > 0,
      completed: !!completed,
      completedAt: completed?.completedAt ? completed.completedAt.toISOString() : null,
      version: completed?.assessmentVersion ?? all[0]?.assessmentVersion ?? null,
    };
  }
  const assessmentCompletedCount = ASSESSMENT_KINDS.filter(
    (k) => assessmentByKind[k].completed
  ).length;

  // ---- Career matches (Phase 4 engine) ----
  let careerMatches: any[] = [];
  let careerMatchDisclaimer: string | null = null;
  try {
    const res = await getCareerMatches(studentUserId, { limit: 10 });
    careerMatches = res.matches;
    careerMatchDisclaimer = res.disclaimer ?? null;
  } catch {
    careerMatchDisclaimer = "Career matches are currently unavailable for this student.";
  }
  const topCareerId = careerMatches[0]?.career?.id ?? null;

  // ---- Education pathways (Phase 5 data) for top career ----
  let educationPathways: any = null;
  if (topCareerId) {
    const pathways = await prisma.careerEducationPathway.findMany({
      where: { careerId: topCareerId, type: "DEGREE_PATHWAY" },
      include: { degree: true, specialization: true },
      orderBy: [{ priority: "asc" }, { degree: { name: "asc" } }],
    });
    const subjectLinks = await prisma.careerEducationPathway.findMany({
      where: { careerId: topCareerId, type: "SUBJECT_LINK" },
      include: { subject: true },
      orderBy: { subject: { name: "asc" } },
    });
    educationPathways = {
      primary: pathways.filter((p) => p.priority === "PRIMARY"),
      alternative: pathways.filter((p) => p.priority === "ALTERNATIVE"),
      optional: pathways.filter((p) => p.priority === "OPTIONAL"),
      recommendedSubjects: subjectLinks
        .map((s) => s.subject)
        .filter(Boolean),
    };
  }

  // ---- University matches (Phase 7 engine) ----
  let universityMatches: any = null;
  if (topCareerId) {
    try {
      universityMatches = await getUniversityMatchesForStudent(studentUserId, {
        careerId: topCareerId,
        limit: 8,
      });
    } catch {
      universityMatches = null;
    }
  }

  // ---- Counselor data ----
  const notes = await prisma.counselorNote.findMany({
    where: { studentId: profile.id },
    orderBy: { createdAt: "desc" },
  });
  const actions = await prisma.counselorAction.findMany({
    where: { studentId: profile.id },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
  });
  const feedback = await prisma.counselorRecommendationFeedback.findMany({
    where: { studentId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  // ---- Appointments ----
  const appointments = await prisma.appointment.findMany({
    where: { studentId: profile.id },
    orderBy: { startTime: "desc" },
    include: { counselor: { select: { firstName: true, lastName: true } } },
  });

  // ---- Chats (scoped to this counselor when provided) ----
  const chatWhere: Record<string, any> = { studentId: studentUserId };
  if (opts?.counselorUserId) chatWhere.counselorId = opts.counselorUserId;
  const chats = await prisma.chat.findMany({
    where: chatWhere,
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
    profile: profile as unknown as Record<string, any>,
    assessmentByKind,
    assessmentCompletedCount,
    assessmentTotal: ASSESSMENT_KINDS.length,
    careerProfile: (user.careerProfile as unknown as Record<string, any>) ?? null,
    careerMatches,
    careerMatchDisclaimer,
    educationPathways,
    universityMatches,
    notes,
    actions,
    feedback,
    appointments,
    chats,
  };
}
