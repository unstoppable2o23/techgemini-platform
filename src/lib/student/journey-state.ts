/**
 * Phase 26 — Student career journey state engine.
 *
 * The journey is DERIVED from persisted data only (StudentProfile, completed
 * TestAssignments, ProductEvents, StudentShortlist, StudentRoadmap + steps,
 * counselor assignment). Everything is recomputable, so refresh/login always
 * shows the same consistent journey (Part 11 — no client-only state).
 *
 * Guardrails: this module never mutates the frozen engine, never scores
 * careers, and never writes journey rows. "Build my pathway" persistence
 * happens in `pathway.ts` (sets preferredCareer via the existing
 * StudentProfile field, then regenerates the roadmap around it).
 */
import { prisma } from "../prisma.ts";
import { getCareerMatches } from "../career-matching/engine.ts";
import { computeProfileCompleteness } from "./basics.ts";
import { summarizeAssignments, ASSESSMENT_KINDS } from "./assessments.ts";
// Back-compat export (decision-pack/loader and others import the suite here).
export { ASSESSMENT_KINDS } from "./assessments.ts";

export type JourneyStatus = "done" | "current" | "locked" | "upcoming";

export type JourneyStepId =
  | "profile"
  | "assessments"
  | "discovery"
  | "programs"
  | "universities"
  | "roadmap"
  | "progress";

export interface JourneyStep {
  id: JourneyStepId;
  title: string;
  description: string;
  /** null for the trailing "Progress" summary step. */
  href: string | null;
  status: JourneyStatus;
  /** Human-readable progress line, e.g. "3/5 completed" or "62%". */
  value: string;
  /** 0–100 progress within this step. */
  progress: number;
  optional?: boolean;
  lockedReason?: string | null;
}

export type NextBestActionCategory =
  | "PROFILE"
  | "ASSESSMENTS"
  | "DISCOVERY"
  | "PATHWAY"
  | "ROADMAP"
  | "SHORTLIST"
  | "UNIVERSITIES"
  | "COUNSELOR"
  | "COMPLETE";

export interface NextBestAction {
  id: string;
  category: NextBestActionCategory;
  label: string;
  detail: string;
  href: string;
}

export interface JourneyAction {
  id: string;
  category: NextBestActionCategory;
  label: string;
  href: string;
  reason?: string;
}

export interface JourneyState {
  profileCompleteness: number;
  assessmentCompletedCount: number;
  assessmentTotal: number;
  careerMatchCount: number;
  lowInformation: boolean;
  hasCareerDirection: boolean;
  goalCareerId: string | null;
  goalCareerName: string | null;
  preferredCareerSet: boolean;
  exploredCareerCount: number;
  shortlistedCareerCount: number;
  shortlistedUniversityCount: number;
  shortlistedProgramCount: number;
  programPathwayAvailable: boolean;
  roadmapExists: boolean;
  roadmapProgress: number;
  roadmapStepCount: number;
  roadmapCompletedCount: number;
  counselorAssigned: boolean;
  appointmentBooked: boolean;
  steps: JourneyStep[];
  nextBestAction: NextBestAction | null;
  actions: JourneyAction[];
  percentComplete: number;
}

export interface JourneyInputs {
  profileCompleteness: number;
  assessmentCompletedCount: number;
  assessmentTotal?: number;
  careerMatches: Array<{
    careerId: string;
    careerName?: string | null;
    matchScore?: number | null;
  }>;
  lowInformation?: boolean;
  exploredCareerIds?: string[];
  preferredCareerId?: string | null;
  preferredCareerName?: string | null;
  shortlistedCareerIds?: string[];
  shortlistedUniversityIds?: string[];
  shortlistedProgramCount?: number;
  programPathwayAvailable?: boolean;
  roadmap?: { progress: number; totalSteps: number; completedSteps: number } | null;
  counselorAssigned?: boolean;
  appointmentBooked?: boolean;
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

function baseStatus(
  done: boolean,
  opts: { locked?: boolean; partial?: boolean } = {}
): Exclude<JourneyStatus, "current" | "upcoming"> | undefined {
  if (done) return "done";
  if (opts.locked) return "locked";
  return undefined; // resolved to current/upcoming by the first-not-done pass
}

/**
 * Pure, deterministic journey computation — the single source of truth used by
 * the dashboard, the counselor 360 block, and the tests. No DB access.
 */
export function computeJourneyState(inputs: JourneyInputs): JourneyState {
  const total = inputs.assessmentTotal ?? ASSESSMENT_KINDS.length;
  const completedAssessments = clamp(inputs.assessmentCompletedCount, 0, total);
  const matches = inputs.careerMatches ?? [];
  const lowInformation =
    inputs.lowInformation ??
    (matches.length === 0 || (matches[0]?.matchScore ?? 0) <= 0);

  const topMatch = matches[0];
  const goalCareerIdRaw =
    inputs.preferredCareerId ?? (!lowInformation ? (topMatch?.careerId ?? null) : null);
  const goalCareerName =
    inputs.preferredCareerName ??
    (!lowInformation ? (topMatch?.careerName ?? null) : null);
  const hasCareerDirection = Boolean(goalCareerIdRaw);
  const preferredCareerSet = Boolean(inputs.preferredCareerId);

  const explored = inputs.exploredCareerIds ?? [];
  const shortlistedCareers = inputs.shortlistedCareerIds ?? [];
  const shortlistedUnis = inputs.shortlistedUniversityIds ?? [];
  const shortlistedPrograms = inputs.shortlistedProgramCount ?? 0;
  const programPathwayAvailable = hasCareerDirection && Boolean(inputs.programPathwayAvailable);

  const roadmap = inputs.roadmap ?? null;
  const roadmapExists = Boolean(roadmap);
  const roadmapDone =
    Boolean(roadmap) &&
    (roadmap?.totalSteps ?? 0) > 0 &&
    (roadmap?.progress ?? 0) >= 100;
  const roadmapInProgress =
    roadmapExists && (roadmap?.progress ?? 0) > 0 && !roadmapDone;
  const roadmapProgress = roadmap ? clamp(roadmap.progress, 0, 100) : 0;
  const roadmapCompletedCount = roadmap?.completedSteps ?? 0;
  const roadmapStepCount = roadmap?.totalSteps ?? 0;

  const profileProgress = clamp(inputs.profileCompleteness, 0, 100);
  const assessmentProgress =
    total > 0 ? Math.round((completedAssessments / total) * 100) : 100;

  const stepped: Array<{
    id: JourneyStepId;
    title: string;
    description: string;
    href: string | null;
    base: Exclude<JourneyStatus, "current" | "upcoming"> | undefined;
    value: string;
    progress: number;
    optional?: boolean;
    lockedReason?: string | null;
  }> = [
    {
      id: "profile",
      title: "Profile",
      description: "Add academics, interests and preferences.",
      href: "/career-preferences",
      base: baseStatus(profileProgress >= 60),
      value: `${Math.round(profileProgress)}% complete`,
      progress: profileProgress,
    },
    {
      id: "assessments",
      title: "Assessments",
      description: "Aptitude, personality and interest tests that personalize matches.",
      href: "/assessments",
      base: baseStatus(completedAssessments >= total),
      value:
        total === 0
          ? "No assessments assigned"
          : `${completedAssessments}/${total} completed`,
      progress: assessmentProgress,
      optional: true,
    },
    {
      id: "discovery",
      title: "Career Discovery",
      description: "Review your top career matches.",
      href: "/career-matches",
      base: baseStatus(!lowInformation && matches.length > 0),
      value: lowInformation
        ? "Add profile evidence to unlock matches"
        : `${matches.length} recommendation${matches.length === 1 ? "" : "s"}`,
      progress: !lowInformation && matches.length > 0 ? 100 : 0,
    },
    {
      id: "programs",
      title: "Programs",
      description: "Degrees and subjects for your pathway.",
      href: "/education",
      base: !hasCareerDirection
        ? "locked"
        : baseStatus(
            programPathwayAvailable &&
              (explored.length > 0 ||
                shortlistedCareers.includes(goalCareerIdRaw as string))
          ),
      value: programPathwayAvailable
        ? `Pathways ready for ${goalCareerName ?? "your career"}`
        : hasCareerDirection
          ? "No curated programs yet"
          : "Needs a career direction",
      progress: programPathwayAvailable ? 100 : 0,
      lockedReason: !hasCareerDirection
        ? "Choose a career direction to see matching programs."
        : null,
    },
    {
      id: "universities",
      title: "Universities",
      description: "Shortlist institutions that fit your pathway.",
      href: "/shortlist",
      base: !hasCareerDirection
        ? "locked"
        : baseStatus(shortlistedUnis.length > 0),
      value:
        shortlistedUnis.length > 0
          ? `${shortlistedUnis.length} university${shortlistedUnis.length === 1 ? "" : "s"} saved`
          : hasCareerDirection
            ? "Nothing shortlisted yet"
            : "Needs a career direction",
      progress: shortlistedUnis.length > 0 ? 100 : 0,
      lockedReason: !hasCareerDirection
        ? "Choose a career direction before shortlisting universities."
        : null,
    },
    {
      id: "roadmap",
      title: "Roadmap",
      description: "A personalized step-by-step study plan.",
      href: "/roadmap",
      base: !hasCareerDirection && !roadmapExists
        ? "locked"
        : roadmapDone
          ? "done"
          : roadmapExists
            ? undefined
            : undefined,
      value: roadmapExists
        ? roadmapDone
          ? "All actions complete!"
          : `${roadmapCompletedCount}/${roadmapStepCount} actions complete`
        : "Not started yet",
      progress: roadmapProgress,
      lockedReason: !hasCareerDirection && !roadmapExists
        ? "Choose a career direction to build your roadmap."
        : null,
    },
  ];

  // Own the trailing summary step.
  const realSteps = stepped.filter((s) => s.id !== "progress");
  const percentComplete = Math.round(
    realSteps.reduce((sum, s) => sum + s.progress, 0) / Math.max(1, realSteps.length)
  );
  stepped.push({
    id: "progress",
    title: "Progress",
    description: "Your overall career journey so far.",
    href: null,
    base: percentComplete >= 100 ? "done" : undefined,
    value: `${percentComplete}% journey complete`,
    progress: percentComplete,
  });

  // Resolve undefined statuses: first not-done (and not locked) step is
  // "current", everything after is "upcoming". Locked steps stay locked.
  const steps: JourneyStep[] = [];
  let currentAssigned = false;
  for (const s of stepped) {
    let status: JourneyStatus;
    if (s.base === "done" || s.base === "locked") {
      status = s.base;
    } else if (s.id === "progress") {
      status = currentAssigned ? "upcoming" : "current";
    } else if (!currentAssigned) {
      status = "current";
      currentAssigned = true;
    } else {
      status = "upcoming";
    }
    steps.push({
      id: s.id,
      title: s.title,
      description: s.description,
      href: s.href,
      status,
      value: s.value,
      progress: Math.round(clamp(s.progress, 0, 100)),
      optional: s.optional,
      lockedReason: s.lockedReason ?? null,
    });
  }

  const state: JourneyState = {
    profileCompleteness: Math.round(profileProgress),
    assessmentCompletedCount: completedAssessments,
    assessmentTotal: total,
    careerMatchCount: matches.length,
    lowInformation,
    hasCareerDirection,
    goalCareerId: goalCareerIdRaw,
    goalCareerName: goalCareerName ?? null,
    preferredCareerSet,
    exploredCareerCount: explored.length,
    shortlistedCareerCount: shortlistedCareers.length,
    shortlistedUniversityCount: shortlistedUnis.length,
    shortlistedProgramCount: shortlistedPrograms,
    programPathwayAvailable,
    roadmapExists,
    roadmapProgress,
    roadmapStepCount,
    roadmapCompletedCount,
    counselorAssigned: Boolean(inputs.counselorAssigned),
    appointmentBooked: Boolean(inputs.appointmentBooked),
    steps,
    nextBestAction: null as NextBestAction | null,
    actions: [],
    percentComplete,
  };

  state.nextBestAction = resolveNextBestAction(state);
  state.actions = buildAvailableActions(state);
  return state;
}

/**
 * Deterministic "next best action" — always the single most useful thing a
 * student can do next, derived from persisted state only (Part 13). The order
 * below is the priority contract; tests assert specific ids.
 */
export function resolveNextBestAction(state: JourneyState): NextBestAction | null {
  const profileDone = state.steps.find((s) => s.id === "profile")?.status === "done";
  const roadmapDone = state.roadmapStepCount > 0 && state.roadmapProgress >= 100;
  if (!profileDone) {
    return {
      id: "complete_profile",
      category: "PROFILE",
      label: "Complete your career profile",
      detail: "A complete profile powers accurate career matches and your roadmap.",
      href: "/career-preferences",
    };
  }

  if (state.assessmentCompletedCount < state.assessmentTotal) {
    const remaining = state.assessmentTotal - state.assessmentCompletedCount;
    return {
      id: "take_assessments",
      category: "ASSESSMENTS",
      label: "Take your assessments",
      detail:
        remaining === 1
          ? "1 assessment left to personalize your matches."
          : `${remaining} assessments left to personalize your matches.`,
      href: "/assessments",
    };
  }

  if (state.lowInformation || state.careerMatchCount === 0) {
    return {
      id: "explore_matches",
      category: "DISCOVERY",
      label: "Explore career matches",
      detail: "Start discovering careers that fit your goals.",
      href: "/career-matches",
    };
  }

  if (!state.preferredCareerSet) {
    return {
      id: "select_pathway",
      category: "PATHWAY",
      label: "Select your preferred pathway",
      detail: state.hasCareerDirection
        ? "Pin the career direction that will shape your study roadmap."
        : "Review your matches and pick a career direction.",
      href: "/career-matches",
    };
  }

  if (!state.roadmapExists || (!roadmapDone && state.roadmapProgress === 0)) {
    return {
      id: "build_roadmap",
      category: "ROADMAP",
      label: "Build your study roadmap",
      detail: state.goalCareerName
        ? `Generate a personalized plan toward ${state.goalCareerName}.`
        : "Generate a personalized step-by-step study plan.",
      href: "/roadmap",
    };
  }

  if (state.roadmapExists && !roadmapDone) {
    return {
      id: "continue_roadmap",
      category: "ROADMAP",
      label: "Continue your roadmap",
      detail: `${state.roadmapProgress}% complete — keep the momentum going.`,
      href: "/roadmap",
    };
  }

  if (state.shortlistedCareerCount === 0) {
    return {
      id: "shortlist_careers",
      category: "SHORTLIST",
      label: "Shortlist careers you like",
      detail: "Save careers that interest you so your counselor can review them.",
      href: "/career-matches",
    };
  }

  if (state.shortlistedUniversityCount === 0 && state.hasCareerDirection) {
    return {
      id: "shortlist_universities",
      category: "UNIVERSITIES",
      label: "Shortlist universities",
      detail: "Save institutions that fit your study pathway.",
      href: "/shortlist",
    };
  }

  if (state.appointmentBooked && state.percentComplete >= 100) {
    return {
      id: "journey_complete",
      category: "COMPLETE",
      label: "Your journey is complete",
      detail: "Everything is up to date. Come back anytime to revisit any step.",
      href: "/dashboard",
    };
  }

  return {
    id: "review_with_counselor",
    category: "COUNSELOR",
    label: "Review your plan with a counselor",
    detail: "Get a second opinion on your shortlist, matches and roadmap.",
    href: "/appointments",
  };
}

/**
 * Part 6 — available actions. Each action is only generated when the
 * underlying feature/data actually exists (never a dead-end CTA).
 */
export function buildAvailableActions(state: JourneyState): JourneyAction[] {
  const actions: JourneyAction[] = [];
  const profileDone = state.steps.find((s) => s.id === "profile")?.status === "done";
  const roadmapDone = state.roadmapStepCount > 0 && state.roadmapProgress >= 100;

  if (!profileDone) {
    actions.push({
      id: "complete_profile",
      category: "PROFILE",
      label: "Complete profile",
      href: "/career-preferences",
      reason: "Powers accurate matches and your roadmap.",
    });
  }

  if (state.assessmentCompletedCount < state.assessmentTotal) {
    actions.push({
      id: "take_assessments",
      category: "ASSESSMENTS",
      label: "Take assessments",
      href: "/assessments",
      reason: `${state.assessmentTotal - state.assessmentCompletedCount} remaining.`,
    });
  }

  if (state.lowInformation || state.careerMatchCount === 0) {
    actions.push({
      id: "explore_matches",
      category: "DISCOVERY",
      label: "Explore matches",
      href: "/career-matches",
      reason: "Discover careers that fit your profile.",
    });
  }

  if (state.careerMatchCount >= 2) {
    actions.push({
      id: "compare_careers",
      category: "DISCOVERY",
      label: "Compare careers",
      href: "/career-matches",
      reason: "Side-by-side view of your top picks.",
    });
  }

  if (state.hasCareerDirection && !state.preferredCareerSet) {
    actions.push({
      id: "select_pathway",
      category: "PATHWAY",
      label: "Pick a pathway",
      href: "/career-matches",
      reason: "Set the career that shapes your roadmap.",
    });
  }

  if (state.programPathwayAvailable) {
    actions.push({
      id: "explore_programs",
      category: "PATHWAY",
      label: "Explore programs",
      href: "/education",
      reason: state.goalCareerName
        ? `Degrees for ${state.goalCareerName}.`
        : "Degrees that lead to your target career.",
    });
  }

  if (state.roadmapExists && !roadmapDone) {
    actions.push({
      id: "continue_roadmap",
      category: "ROADMAP",
      label: "Continue roadmap",
      href: "/roadmap",
      reason: `${state.roadmapProgress}% complete.`,
    });
  } else if (state.hasCareerDirection && !state.roadmapExists) {
    actions.push({
      id: "build_roadmap",
      category: "ROADMAP",
      label: "Build roadmap",
      href: "/roadmap",
      reason: "A step-by-step study plan.",
    });
  }

  if (state.careerMatchCount > 0) {
    actions.push({
      id: "shortlist_careers",
      category: "SHORTLIST",
      label: "Shortlist careers",
      href: "/career-matches",
      reason: "Save careers you like.",
    });
  }

  if (state.hasCareerDirection) {
    actions.push({
      id: "shortlist_universities",
      category: "UNIVERSITIES",
      label: "Shortlist universities",
      href: "/shortlist",
      reason: "Track institutions that fit your pathway.",
    });
  }

  actions.push({
    id: "book_appointment",
    category: "COUNSELOR",
    label: "Book an appointment",
    href: "/appointments",
    reason: "Talk through your plan with your counselor.",
  });

  return actions;
}

/**
 * Server loader: gathers the persisted inputs (reusing the frozen engine's
 * match output) and returns the full journey state. Callers can pass their own
 * `careerMatches` (e.g. the dashboard or counselor 360) to avoid a second
 * engine computation.
 */
export async function getJourneyState(
  userId: string,
  opts: { careerMatches?: JourneyInputs["careerMatches"] } = {}
): Promise<JourneyState> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  const [assignments, saved, exploredEvents, roadmap, steps, appointmentCount] =
    await Promise.all([
      prisma.testAssignment.findMany({
        where: {
          studentId: userId,
          kind: { in: ASSESSMENT_KINDS as unknown as string[] },
        },
        select: { kind: true, status: true },
      }),
      prisma.studentShortlist.findMany({
        where: { studentId: userId },
        select: { itemType: true, itemId: true },
      }),
      prisma.productEvent.findMany({
        where: { userId, event: "career_detail_opened", careerId: { not: null } },
        select: { careerId: true },
        distinct: ["careerId"],
      }),
      prisma.studentRoadmap.findUnique({
        where: { studentId: userId },
        select: { progress: true, goalCareerId: true, goalCareerName: true },
      }),
      prisma.roadmapStep.findMany({
        where: { roadmap: { studentId: userId } },
        select: { status: true },
      }),
      prisma.appointment.count({
        where: {
          studentId: profile?.id,
          status: { in: ["CONFIRMED", "COMPLETED", "PENDING"] },
        },
      }),
    ]);

  const summary = summarizeAssignments(assignments);

  const shortlistedCareerIds = saved
    .filter((s) => s.itemType === "CAREER")
    .map((s) => s.itemId);
  const shortlistedUniversityIds = saved
    .filter(
      (s) => s.itemType === "UNIVERSITY" || s.itemType === "INDIAN_INSTITUTION"
    )
    .map((s) => s.itemId);
  const shortlistedProgramCount = saved.filter(
    (s) => s.itemType === "EDUCATION"
  ).length;

  let careerMatches = opts.careerMatches ?? [];
  if (careerMatches.length === 0) {
    try {
      const res = await getCareerMatches(userId, { limit: 10 });
      careerMatches = res.matches;
    } catch {
      careerMatches = [];
    }
  }

  const goalCareerId =
    profile?.preferredCareerId ??
    (careerMatches as any[])[0]?.career?.id ??
    null;
  let programPathwayAvailable = false;
  if (goalCareerId) {
    const [pathwayCount, mappingCount] = await Promise.all([
      prisma.careerEducationPathway.count({
        where: { careerId: goalCareerId, type: "DEGREE_PATHWAY" },
      }),
      prisma.careerProgramMapping.count({
        where: { careerId: goalCareerId, isActive: true },
      }),
    ]);
    programPathwayAvailable = pathwayCount + mappingCount > 0;
  }

  const totalSteps = steps.filter((s) => s.status !== "NOT_APPLICABLE").length;
  const completedSteps = steps.filter((s) => s.status === "COMPLETED").length;

  return computeJourneyState({
    profileCompleteness: computeProfileCompleteness(profile),
    assessmentCompletedCount: summary.completedCount,
    assessmentTotal: summary.assignedTotal,
    careerMatches: careerMatches.map((m: any) => ({
      careerId: m.careerId ?? m.career?.id,
      careerName: m.career?.name ?? null,
      matchScore: m.matchScore,
    })),
    exploredCareerIds: (exploredEvents.map((e) => e.careerId).filter(Boolean) as string[]),
    preferredCareerId: profile?.preferredCareerId ?? null,
    preferredCareerName: profile?.preferredCareer ?? null,
    shortlistedCareerIds,
    shortlistedUniversityIds,
    shortlistedProgramCount,
    programPathwayAvailable,
    roadmap: roadmap
      ? {
          progress: roadmap.progress,
          totalSteps,
          completedSteps,
        }
      : null,
    counselorAssigned: Boolean(profile?.counselorId),
    appointmentBooked: appointmentCount > 0,
  });
}

/**
 * Per-career journey status used by the career matches page and career detail:
 * explored (viewed the career), shortlisted (saved), preferred (the selected
 * pathway). Pure over persisted signals.
 */
export interface CareerJourneyState {
  explored: boolean;
  shortlisted: boolean;
  preferred: boolean;
}

export async function assessCareerJourneyStates(
  userId: string,
  careerIds: string[]
): Promise<Record<string, CareerJourneyState>> {
  const map: Record<string, CareerJourneyState> = {};
  if (careerIds.length === 0) return map;
  const unique = Array.from(new Set(careerIds.map((id) => id).filter(Boolean)));
  for (const id of unique) map[id] = { explored: false, shortlisted: false, preferred: false };

  const [profile, exploredEvents, saved] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId },
      select: { preferredCareerId: true },
    }),
    prisma.productEvent.findMany({
      where: {
        userId,
        event: "career_detail_opened",
        careerId: { in: unique },
      },
      select: { careerId: true },
      distinct: ["careerId"],
    }),
    prisma.studentShortlist.findMany({
      where: { studentId: userId, itemType: "CAREER", itemId: { in: unique } },
      select: { itemId: true },
    }),
  ]);

  for (const e of exploredEvents) {
    if (e.careerId && map[e.careerId]) map[e.careerId].explored = true;
  }
  for (const s of saved) {
    if (map[s.itemId]) map[s.itemId].shortlisted = true;
  }
  if (profile?.preferredCareerId && map[profile.preferredCareerId]) {
    map[profile.preferredCareerId].preferred = true;
  }
  return map;
}