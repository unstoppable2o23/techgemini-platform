import { prisma } from "../prisma.ts";
import { getCareerMatches } from "../career-matching/engine.ts";
import { getUniversityMatchesForStudent } from "../university-matching/engine.ts";
import { detectEducationStage } from "../roadmap/education-stage.ts";
import {
  getMedicalDisciplineForCareerName,
  getMedicalDisciplineForCareerSlug,
} from "../medical-education/registry.ts";
import { computeProfileCompleteness } from "../student/basics.ts";
import { attentionStates, primaryAttention } from "./attention.ts";
import type { AttentionState } from "./attention.ts";
import { listCareerDecisions, listProgramPlans } from "./planning.ts";
import { getDecisionCenter } from "../decision-center/center.ts";
import type { DecisionCenterState } from "../decision-center/center.ts";

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
  /** Phase 26 — derived career-journey block (profile, next action, roadmap). */
  journey: Record<string, any> | null;
  /** Phase 27 — deterministic attention state for this student. */
  attention: {
    states: AttentionState[];
    primary: AttentionState | null;
    lastActivityAt: string | null;
  };
  careerDecisions: any[];
  programPlans: any[];
  /** Phase 28 — resolved program shortlist for this student. */
  shortlistedPrograms: Array<{
    programId: string;
    programName: string;
    level: string | null;
    category: string | null;
    notedAt: Date;
  }>;
  /** Phase 29 — derived decision center state (option groups, gaps, brief). */
  decisionCenter: DecisionCenterState | null;
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
      roadmap: {
        select: {
          goalCareerId: true,
          progress: true,
          updatedAt: true,
          educationStage: true,
        },
      },
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

    // Phase 23.1 — Class-10 students must see BOTH post-Class-10 tracks in the
    // counselor view: the academic route (Class 11–12 → degree) and the
    // technical route (Diploma / Polytechnic), presented as distinct and equal.
    const studentStage = detectEducationStage({
      gradeLevel: profile.gradeLevel,
      studyLevel: profile.studyLevel,
      highestEducation: profile.highestEducation,
    });
    if (studentStage === "SCHOOL_CLASS10") {
      educationPathways.postClass10Pathways = [
        "Academic pathway — continue Class 11–12 and then a degree",
        "Technical pathway — Diploma / Polytechnic after Class 10 (a diploma is not a B.E./B.Tech degree)",
      ];
    }

    // Phase 23.2 (Part B) — Medical Education Knowledge. When the student's top
    // career is a healthcare/medical career, the counselor view gets a compact,
    // evidence-attributed medical-education note (entrance, degree, training,
    // registration, India-vs-abroad). Conservative, no fabricated details.
    const topCareer = careerMatches[0]?.career as { name?: string; slug?: string } | null | undefined;
    const medicalDiscipline = topCareer
      ? getMedicalDisciplineForCareerName(topCareer.name) ??
        getMedicalDisciplineForCareerSlug(topCareer.slug) ??
        null
      : null;
    if (medicalDiscipline) {
      educationPathways.medicalEducationPath = {
        title: medicalDiscipline.title,
        summary: medicalDiscipline.summary,
        entrance: medicalDiscipline.entrance,
        degree: medicalDiscipline.degree,
        internshipTraining: medicalDiscipline.internshipTraining,
        registration: medicalDiscipline.registration,
        indiaAbroad: medicalDiscipline.indiaAbroad,
        alternatives: medicalDiscipline.alternatives,
        sources: medicalDiscipline.sources,
        lastReviewed: medicalDiscipline.lastReviewed,
      };
    }
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

  // ---- Phase 27 — planning records + deterministic attention ----
  const [careerDecisions, programPlans, shortlistCounts, programShortlists] = await Promise.all([
    listCareerDecisions(profile.id),
    listProgramPlans(profile.id),
    prisma.studentShortlist.groupBy({
      by: ["studentId"],
      where: {
        studentId: studentUserId,
        itemType: { in: ["UNIVERSITY", "INDIAN_INSTITUTION"] },
      },
      _count: { _all: true },
    }),
    prisma.studentShortlist.findMany({
      where: { studentId: studentUserId, itemType: "PROGRAM" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);
  const universityShortlistCount = shortlistCounts[0]?._count._all ?? 0;

  // ---- Phase 28 — resolved program shortlist for the counselor (batched) ----
  const programShortlistIds = programShortlists.map((s) => s.itemId);
  const programShortlistMeta = new Map(
    (
      await prisma.academicProgram.findMany({
        where: { id: { in: programShortlistIds } },
        select: { id: true, name: true, level: true, category: true },
      })
    ).map((p) => [p.id, p])
  );
  const shortlistedPrograms = programShortlists.map((s) => {
    const p = programShortlistMeta.get(s.itemId);
    return {
      programId: s.itemId,
      programName: p?.name ?? s.itemId,
      level: p?.level ?? null,
      category: p?.category ?? null,
      notedAt: s.createdAt,
    };
  });
  const shortlistedProgramCount = shortlistedPrograms.length;

  const roadmap = user.roadmap ?? null;
  const roadmapProgress = roadmap?.progress ?? 0;
  const staleMs =
    roadmap && roadmap.progress > 0 && roadmap.progress < 100 && roadmap.updatedAt
      ? Date.now() - roadmap.updatedAt.getTime()
      : null;
  const openActions = actions.filter((a) => !a.completed);

  const profileCompleteness = Math.round(computeProfileCompleteness(profile));
  const hasCareerDirection = Boolean(
    profile.preferredCareerId ||
      roadmap?.goalCareerId ||
      careerDecisions.some(
        (d) => d.selectedPathway || d.shortlistedCareer || d.studentInterest
      )
  );
  const attentionOverview = {
    profileCompleteness,
    assessmentCompletedCount,
    assessmentTotal: ASSESSMENT_KINDS.length,
    hasCareerDirection,
    roadmapExists: Boolean(roadmap),
    roadmapProgress,
    roadmapStaleDays: staleMs === null ? null : Math.floor(staleMs / 86400000),
    universityShortlistCount,
    shortlistedProgramCount,
    hasOpenAction: openActions.length > 0,
    openActionDueInDays: (() => {
      if (openActions.length === 0) return null;
      const dueDates = openActions
        .filter((a) => a.dueDate)
        .map((a) => (new Date(a.dueDate!).getTime() - Date.now()) / 86400000);
      return dueDates.length ? Math.min(...dueDates) : null;
    })(),
    openActionCount: openActions.length,
    educationStage: roadmap?.educationStage ?? null,
    targetCountry: profile.targetCountry ?? null,
  };
  const attention = {
    states: attentionStates(attentionOverview),
    primary: primaryAttention(attentionOverview),
    lastActivityAt: null as string | null,
  };
  const seen = [user.lastSeen, profile.updatedAt, roadmap?.updatedAt].filter(
    (d): d is Date => Boolean(d)
  );
  if (seen.length > 0) {
    attention.lastActivityAt = new Date(
      Math.max(...seen.map((d) => new Date(d).getTime()))
    ).toISOString();
  }

  // ---- Journey state (Phase 26) — reuses the derived journey engine. We pass
  // the already-computed career matches so the engine does not run twice.
  let journey: Record<string, any> | null = null;
  try {
    const { getJourneyState } = await import("../student/journey-state.ts");
    journey = await getJourneyState(studentUserId, { careerMatches });
  } catch {
    journey = null;
  }

  // ---- Decision center (Phase 29) — composed from the same career matches,
  // so no second engine computation occurs in the counselor view either.
  let decisionCenter: DecisionCenterState | null = null;
  try {
    decisionCenter = await getDecisionCenter(studentUserId, { careerMatches });
  } catch {
    decisionCenter = null;
  }

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
    journey,
    attention,
    careerDecisions,
    programPlans,
    shortlistedPrograms,
    decisionCenter,
  };
}
