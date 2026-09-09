/**
 * Phase 27 — Counselor Command Center.
 *
 * Batch loader over PERSISTED rows only. No career-engine calls here, so a
 * full roster can be scored deterministically with a handful of queries:
 *   1 fetch  users (with profile fields + career profile + roadmap)
 *   1 groupBy roadmap shortlists
 *   1 fetch  open counselor actions
 *   1 fetch  all counselor actions (for the follow-up bucket)
 *   1 fetch  counselor career decisions
 * Plus a profile-completeness computation per row (pure).
 */
import { prisma } from "../prisma.ts";
import { computeProfileCompleteness } from "../student/basics.ts";
import {
  ATTENTION_STATES,
  ATTENTION_LABELS,
  attentionStates,
  bucketFollowUps,
  primaryAttention,
} from "./attention.ts";
import type { AttentionOverview, AttentionState, FollowUpBucket } from "./attention.ts";

const ASSESSMENT_TOTAL = 5;

export interface StudentAttentionRow {
  userId: string;
  profileId: string | null;
  name: string;
  email: string;
  targetCountry: string | null;
  preferredCareer: string | null;
  profileCompleteness: number;
  assessmentCompleted: number;
  assessmentTotal: number;
  states: AttentionState[];
  primary: AttentionState | null;
  roadmapExists: boolean;
  roadmapProgress: number;
  roadmapUpdatedAt: Date | null;
  shortlistedUniversities: number;
  lastActivityAt: Date | null;
  lastSeenAt: Date | null;
  decidedCareerId: string | null;
  hasCareerRecommendations: boolean;
  /** RoadmapEducationStage value (persisted). */
  educationStage: AttentionOverview["educationStage"];
}

export interface AttentionDistribution {
  state: AttentionState;
  label: string;
  count: number;
}

export interface CounselorCommandCenter {
  counts: {
    totalStudents: number;
    needsFollowUp: number;
    assessmentsIncomplete: number;
    profilesIncomplete: number;
    withCareerRecommendations: number;
    noSelectedPathway: number;
    roadmapInProgress: number;
    requireCounselorAction: number;
  };
  followUps: FollowUpBucket;
  attention: AttentionDistribution[];
  students: StudentAttentionRow[];
}

export interface CommandCenterScope {
  tenantId: string;
  /** COUNSELOR sees only their assigned students; SUPER_ADMIN sees the tenant. */
  counselorUserId?: string;
}

export async function getCounselorCommandCenter(
  scope: CommandCenterScope
): Promise<CounselorCommandCenter> {
  const users = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      tenantId: scope.tenantId,
      ...(scope.counselorUserId
        ? { studentProfile: { counselor: { userId: scope.counselorUserId } } }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      lastSeen: true,
      _count: {
        select: { testAssignments: { where: { status: "COMPLETED" } } },
      },
      studentProfile: {
        select: {
          id: true,
          updatedAt: true,
          status: true,
          gradeLevel: true,
          studyLevel: true,
          nationality: true,
          state: true,
          targetCountry: true,
          highestEducation: true,
          averageGrade: true,
          preferredCareer: true,
          preferredCareerId: true,
          careerPrefsFilled: true,
          gender: true,
          dateOfBirth: true,
          mobile: true,
        },
      },
      careerProfile: { select: { level: true, completeness: true } },
      roadmap: {
        select: {
          goalCareerId: true,
          progress: true,
          updatedAt: true,
          educationStage: true,
        },
      },
    },
    orderBy: [{ lastSeen: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });

  const userIds = users.map((u) => u.id);
  const profileIds = users
    .map((u) => u.studentProfile?.id)
    .filter((x): x is string => Boolean(x));

  const [shortlists, openActions, allActions, decisions] = await Promise.all([
    prisma.studentShortlist.groupBy({
      by: ["studentId"],
      where: {
        studentId: { in: userIds },
        itemType: { in: ["UNIVERSITY", "INDIAN_INSTITUTION"] },
      },
      _count: { _all: true },
    }),
    prisma.counselorAction.findMany({
      where: { studentId: { in: profileIds }, completed: false },
      select: { studentId: true, dueDate: true },
    }),
    prisma.counselorAction.findMany({
      where: { studentId: { in: profileIds } },
      select: { studentId: true, dueDate: true, completed: true },
    }),
    prisma.counselorCareerDecision.findMany({
      where: { studentId: { in: profileIds } },
      select: {
        studentId: true,
        selectedPathway: true,
        shortlistedCareer: true,
        studentInterest: true,
      },
    }),
  ]);

  const shortlistCount = new Map(shortlists.map((s) => [s.studentId, s._count._all]));
  const openByProfile = new Map<string, Array<{ dueDate: Date | null }>>();
  for (const a of openActions) {
    const list = openByProfile.get(a.studentId) ?? [];
    list.push({ dueDate: a.dueDate });
    openByProfile.set(a.studentId, list);
  }
  const allActionsByProfile = new Map<
    string,
    Array<{ dueDate: Date | null; completed: boolean }>
  >();
  for (const a of allActions) {
    const list = allActionsByProfile.get(a.studentId) ?? [];
    list.push({ dueDate: a.dueDate, completed: a.completed });
    allActionsByProfile.set(a.studentId, list);
  }
  const decidedByProfile = new Map<string, boolean>();
  for (const d of decisions) {
    if (d.selectedPathway || d.shortlistedCareer || d.studentInterest) {
      decidedByProfile.set(d.studentId, true);
    }
  }

  const rows: StudentAttentionRow[] = users.map((u) => {
    const profile = u.studentProfile ?? null;
    const profileCompleteness = Math.round(computeProfileCompleteness(profile));
    const completedTests = u._count?.testAssignments ?? 0;
    const roadmap = u.roadmap ?? null;
    const roadmapProgress = roadmap?.progress ?? 0;
    const staleMs =
      roadmap && roadmap.progress > 0 && roadmap.progress < 100 && roadmap.updatedAt
        ? Date.now() - roadmap.updatedAt.getTime()
        : null;
    const hasCareerDirection = Boolean(
      profile?.preferredCareerId ||
        roadmap?.goalCareerId ||
        decidedByProfile.get(profile?.id ?? "")
    );
    const overview: AttentionOverview = {
      profileCompleteness,
      assessmentCompletedCount: completedTests,
      assessmentTotal: ASSESSMENT_TOTAL,
      hasCareerDirection,
      roadmapExists: Boolean(roadmap),
      roadmapProgress,
      roadmapStaleDays: staleMs === null ? null : Math.floor(staleMs / 86400000),
      universityShortlistCount: shortlistCount.get(u.id) ?? 0,
      hasOpenAction: (openByProfile.get(profile?.id ?? "")?.length ?? 0) > 0,
      openActionDueInDays: nearestDueInDays(openByProfile.get(profile?.id ?? "")),
      openActionCount: openByProfile.get(profile?.id ?? "")?.length ?? 0,
      educationStage: roadmap?.educationStage ?? null,
      targetCountry: profile?.targetCountry ?? null,
    };
    const states = attentionStates(overview);
    const activity = [u.lastSeen, profile?.updatedAt, roadmap?.updatedAt].filter(
      (x): x is Date => Boolean(x)
    );
    return {
      userId: u.id,
      profileId: profile?.id ?? null,
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      targetCountry: profile?.targetCountry ?? null,
      preferredCareer: profile?.preferredCareer ?? null,
      profileCompleteness,
      assessmentCompleted: completedTests,
      assessmentTotal: ASSESSMENT_TOTAL,
      states,
      primary: primaryAttention(overview),
      roadmapExists: Boolean(roadmap),
      roadmapProgress,
      roadmapUpdatedAt: roadmap?.updatedAt ?? null,
      shortlistedUniversities: shortlistCount.get(u.id) ?? 0,
      lastActivityAt: activity.length
        ? new Date(Math.max(...activity.map((d) => d.getTime())))
        : null,
      lastSeenAt: u.lastSeen ?? null,
      decidedCareerId: decidedByProfile.get(profile?.id ?? "")
        ? (roadmap?.goalCareerId ?? profile?.preferredCareerId ?? null)
        : null,
      hasCareerRecommendations:
        Boolean(u.careerProfile) && (u.careerProfile?.level ?? "EMPTY") !== "EMPTY",
      educationStage: overview.educationStage,
    };
  });

  const followUps = bucketFollowUps([]);
  for (const [, list] of allActionsByProfile) {
    const b = bucketFollowUps(list);
    followUps.overdue += b.overdue;
    followUps.dueToday += b.dueToday;
    followUps.dueThisWeek += b.dueThisWeek;
    followUps.completed += b.completed;
  }

  const counts = {
    totalStudents: rows.length,
    needsFollowUp: rows.filter((r) => r.states.includes("FOLLOW_UP_DUE")).length,
    assessmentsIncomplete: rows.filter((r) => r.assessmentCompleted < r.assessmentTotal).length,
    profilesIncomplete: rows.filter((r) => r.profileCompleteness < 60).length,
    withCareerRecommendations: rows.filter((r) => r.hasCareerRecommendations).length,
    noSelectedPathway: rows.filter((r) => r.states.includes("NO_CLEAR_PATHWAY")).length,
    roadmapInProgress: rows.filter(
      (r) => r.roadmapExists && r.roadmapProgress > 0 && r.roadmapProgress < 100
    ).length,
    requireCounselorAction: 0,
  };
  for (const r of rows) {
    if (r.primary && r.primary !== "READY_FOR_COUNSELOR_REVIEW") {
      counts.requireCounselorAction += 1;
    }
  }

  return {
    counts,
    followUps,
    attention: rowsByAttention(rows),
    students: rows,
  };
}

function nearestDueInDays(actions?: Array<{ dueDate: Date | null }>): number | null {
  if (!actions || actions.length === 0) return null;
  const now = Date.now();
  let nearest: number | null = null;
  for (const a of actions) {
    if (!a.dueDate) continue;
    const inDays = (a.dueDate.getTime() - now) / 86400000;
    if (nearest === null || inDays < nearest) nearest = inDays;
  }
  return nearest;
}

function rowsByAttention(rows: StudentAttentionRow[]): AttentionDistribution[] {
  const out = ATTENTION_STATES.map((state) => ({
    state,
    label: ATTENTION_LABELS[state],
    count: 0,
  }));
  const byState = new Map(out.map((e) => [e.state, e]));
  for (const r of rows) {
    for (const state of r.states) {
      const e = byState.get(state);
      if (e) e.count += 1;
    }
  }
  return out.filter((e) => e.count > 0);
}

export { ATTENTION_LABELS, ATTENTION_STATES };