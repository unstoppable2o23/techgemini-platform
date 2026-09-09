/**
 * Phase 30 — Decision Pack server loader.
 *
 * Gathers the same persisted inputs the Decision Center uses and composes the
 * deterministic Decision Pack. The frozen career engine runs EXACTLY once per
 * pack: `getCareerMatches` output is passed into `getDecisionCenter` so no
 * second engine computation occurs (mirrors the counselor 360 pattern).
 */
import { prisma } from "../prisma.ts";
import { getCareerMatches } from "../career-matching/engine.ts";
import { getDecisionCenter } from "../decision-center/center.ts";
import { ASSESSMENT_KINDS } from "../student/journey-state.ts";
import { listCareerDecisions, listProgramPlans } from "../counselor/planning.ts";
import { composeDecisionPack } from "./compose.ts";
import type { DecisionPackInputs, DecisionPackStudentInput } from "./compose.ts";
import type { CounselorInput } from "./counselor.ts";
import type { DecisionPack } from "./types.ts";

/**
 * Builds the Decision Pack for a student.
 *
 * @param userId        session user id (self-scoped: never a client-supplied id)
 * @param includeCounselor includes counselor-only planning records (notes,
 *                         decisions, plans, open actions) in `pack.counselor`.
 *                         Callers must have already authorized access.
 * Returns null when the user is not a STUDENT or has no profile.
 */
export async function getDecisionPack(
  userId: string,
  opts: { includeCounselor?: boolean } = {}
): Promise<DecisionPack | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: {
        include: {
          counselor: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });
  if (!user || user.role !== "STUDENT" || !user.studentProfile) return null;
  const profile = user.studentProfile;

  try {
    const matchesRes = await getCareerMatches(userId, { limit: 10 });
    const careerMatches = matchesRes.matches;
    const center = await getDecisionCenter(userId, { careerMatches });
    if (!center) return null;

    const assessments = await loadAssessments(userId);
    const catalog = await loadKnowledgeDegrees(careerMatches);
    const counselor = opts.includeCounselor
      ? await loadCounselor(profile.id)
      : null;

    const student: DecisionPackStudentInput = {
      id: user.id,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      gradeLevel: profile.gradeLevel ?? null,
      studyLevel: profile.studyLevel ?? null,
      educationStageLabel: center.header.educationStageLabel ?? null,
      targetCountry: profile.targetCountry ?? null,
      preferredIntake: profile.preferredIntake ?? null,
      preferredYear: profile.preferredYear ?? null,
      currentProgram: profile.currentProgram ?? null,
      state: profile.state ?? null,
    };

    const inputs: DecisionPackInputs = {
      student,
      assessments,
      careerMatches,
      center,
      catalog,
      careerNameById: {},
      programNameById: {},
      counselor,
    };

    if (counselor) {
      inputs.careerNameById = await resolveCareerNames(counselor);
      inputs.programNameById = await resolveProgramNames(counselor);
    }

    return composeDecisionPack(inputs);
  } catch {
    return null;
  }
}

async function loadAssessments(userId: string): Promise<DecisionPackInputs["assessments"]> {
  const assignments = await prisma.testAssignment.findMany({
    where: { studentId: userId },
    orderBy: { createdAt: "desc" },
  });
  const completed: string[] = [];
  for (const kind of ASSESSMENT_KINDS) {
    const rows = assignments.filter((a) => a.kind === kind);
    if (rows.some((a) => a.status === "COMPLETED")) completed.push(kind);
  }
  const remaining = ASSESSMENT_KINDS.filter((k) => !completed.includes(k));
  return {
    completed: [...completed].sort(),
    remaining: [...remaining].sort(),
    completedCount: completed.length,
    total: ASSESSMENT_KINDS.length,
  };
}

async function loadKnowledgeDegrees(
  careerMatches: DecisionPackInputs["careerMatches"]
): Promise<DecisionPackInputs["catalog"]> {
  const top = careerMatches[0];
  if (!top?.career?.id) return [];

  const rows = await prisma.careerEducationPathway.findMany({
    where: { careerId: top.career.id, type: "DEGREE_PATHWAY" },
    include: {
      degree: { select: { name: true, educationLevel: true } },
    },
    orderBy: [{ priority: "asc" }, { degree: { name: "asc" } }],
  });

  if (rows.length === 0) return [];

  return rows.map((r) => ({
    careerId: top.career!.id,
    careerName: String(top.career!.name ?? top.careerId ?? "Career"),
    degreeName: r.degree?.name ?? "—",
    degreeLevel: r.degree?.educationLevel ?? null,
    priority: r.priority,
  }));
}

async function loadCounselor(studentProfileId: string): Promise<CounselorInput> {
  const [decisions, programPlans, notes, openActions, profile] = await Promise.all([
    listCareerDecisions(studentProfileId),
    listProgramPlans(studentProfileId),
    prisma.counselorNote.findMany({
      where: { studentId: studentProfileId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.counselorAction.findMany({
      where: { studentId: studentProfileId, completed: false },
      orderBy: { dueDate: "asc" },
    }),
    prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { counselor: { include: { user: { select: { firstName: true, lastName: true } } } } },
    }),
  ]);

  const counselor =
    profile?.counselor?.user?.firstName ?? profile?.counselor?.user?.lastName
      ? `${profile.counselor.user.firstName ?? ""} ${profile.counselor.user.lastName ?? ""}`.trim()
      : null;

  return {
    counselorName: counselor,
    careerDecisions: decisions.map((d) => ({
      id: d.id,
      careerId: d.careerId,
      shortlistedCareer: d.shortlistedCareer ?? false,
      selectedPathway: d.selectedPathway ?? false,
      followUpRequired: d.followUpRequired ?? false,
      counselorRecommendation: d.counselorRecommendation ?? null,
      studentInterest: d.studentInterest ?? false,
      createdAt: d.createdAt,
    })),
    programPlans: programPlans.map((p) => ({
      id: p.id,
      programId: p.programId,
      shortlisted: p.shortlisted ?? false,
      requiresResearch: p.requiresResearch ?? false,
      studentInterested: p.studentInterested ?? false,
    })),
    notes: notes.map((n) => ({
      id: n.id,
      content: n.content,
      type: n.type,
      createdAt: n.createdAt,
    })),
    openActions: openActions.map((a) => ({
      id: a.id,
      title: a.title,
      dueDate: a.dueDate ?? null,
    })),
  };
}

async function resolveCareerNames(
  counselor: CounselorInput
): Promise<Record<string, string>> {
  if (counselor.careerDecisions.length === 0) return {};
  const ids = counselor.careerDecisions.map((d) => d.careerId);
  const rows = await prisma.career.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  return Object.fromEntries(rows.map((r) => [r.id, r.name ?? r.id]));
}

async function resolveProgramNames(
  counselor: CounselorInput
): Promise<Record<string, string>> {
  if (counselor.programPlans.length === 0) return {};
  const ids = counselor.programPlans.map((p) => p.programId);
  const rows = await prisma.academicProgram.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  return Object.fromEntries(rows.map((r) => [r.id, r.name ?? r.id]));
}