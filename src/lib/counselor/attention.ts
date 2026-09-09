/**
 * Phase 27 — Deterministic student attention states.
 *
 * These are OPERATIONAL states used by the counselor command center and the
 * student list filters. They are derived from persisted rows only (profile,
 * assessments, pathway selection, roadmap, shortlist, counselor actions) —
 * NEVER from the frozen career engine, so they can be computed cheaply for a
 * whole roster without N+1 matching runs.
 *
 * Language guardrail: states describe the STUDENT'S WORKFLOW STAGE, never the
 * quality of the student (no "weak"/"poor"/"unsuitable" wording).
 */
import type { RoadmapEducationStage } from "../roadmap/types.ts";

export const ATTENTION_STATES = [
  "PROFILE_INCOMPLETE",
  "ASSESSMENT_INCOMPLETE",
  "NO_CLEAR_PATHWAY",
  "ROADMAP_NOT_STARTED",
  "ROADMAP_STALLED",
  "UNIVERSITY_SHORTLIST_MISSING",
  "FOLLOW_UP_DUE",
  "READY_FOR_COUNSELOR_REVIEW",
] as const;

export type AttentionState = (typeof ATTENTION_STATES)[number];

export const ATTENTION_LABELS: Record<AttentionState, string> = {
  PROFILE_INCOMPLETE: "Profile incomplete",
  ASSESSMENT_INCOMPLETE: "Assessments incomplete",
  NO_CLEAR_PATHWAY: "No clear pathway",
  ROADMAP_NOT_STARTED: "Roadmap not started",
  ROADMAP_STALLED: "Roadmap stalled",
  UNIVERSITY_SHORTLIST_MISSING: "University shortlist missing",
  FOLLOW_UP_DUE: "Follow-up due",
  READY_FOR_COUNSELOR_REVIEW: "Ready for counselor review",
};

/** Days without roadmap activity after which progress is considered stalled. */
export const ROADMAP_STALL_DAYS = 14;

export interface AttentionOverview {
  profileCompleteness: number;
  assessmentCompletedCount: number;
  assessmentTotal: number;
  hasCareerDirection: boolean;
  roadmapExists: boolean;
  roadmapProgress: number;
  /** Days since any roadmap step/row changed. Null when no roadmap. */
  roadmapStaleDays: number | null;
  universityShortlistCount: number;
  /** True when the student has at least one open counselor action. */
  hasOpenAction: boolean;
  /** Days until the nearest open action is due (< 0 = overdue, null = none). */
  openActionDueInDays: number | null;
  openActionCount: number;
  /** Highest completed qualification/study level — used by filters. */
  educationStage: RoadmapEducationStage | null;
  targetCountry: string | null;
}

/** Highest-priority open attention state (the primary thing to address). */
export function primaryAttention(o: AttentionOverview): AttentionState | null {
  const set = attentionStates(o);
  return set.length > 0 ? set[0] : null;
}

/**
 * Deterministic, priority-ordered list of attention states for one student.
 * Priority: overdue follow-up > roadmap stalled > roadmap not started >
 * profile incomplete > assessments incomplete > university shortlist > ready.
 */
export function attentionStates(o: AttentionOverview): AttentionState[] {
  const out: AttentionState[] = [];

  if (o.hasOpenAction && o.openActionDueInDays !== null && o.openActionDueInDays <= 7) {
    out.push("FOLLOW_UP_DUE");
  }

  if (!o.roadmapExists || o.roadmapProgress === 0) {
    out.push("ROADMAP_NOT_STARTED");
  } else if (
    o.roadmapStaleDays !== null &&
    o.roadmapStaleDays >= ROADMAP_STALL_DAYS &&
    o.roadmapProgress > 0 &&
    o.roadmapProgress < 100
  ) {
    out.push("ROADMAP_STALLED");
  }

  if (o.profileCompleteness < 60) {
    out.push("PROFILE_INCOMPLETE");
  }

  if (o.assessmentCompletedCount < o.assessmentTotal) {
    out.push("ASSESSMENT_INCOMPLETE");
  }

  if (!o.hasCareerDirection && o.roadmapExists === false) {
    out.push("NO_CLEAR_PATHWAY");
  }

  if (
    o.hasCareerDirection &&
    o.universityShortlistCount === 0 &&
    o.roadmapExists &&
    o.roadmapProgress < 100
  ) {
    out.push("UNIVERSITY_SHORTLIST_MISSING");
  }

  if (
    o.profileCompleteness >= 60 &&
    o.assessmentCompletedCount >= o.assessmentTotal &&
    o.hasCareerDirection &&
    o.roadmapExists &&
    o.roadmapProgress >= 50 &&
    !o.hasOpenAction
  ) {
    out.push("READY_FOR_COUNSELOR_REVIEW");
  }

  return out;
}

export interface FollowUpBucket {
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  completed: number;
}

/**
 * Pure follow-up bucketing (Part 11). `now` defaults to today's date so tests
 * can pin the "today".
 */
export function bucketFollowUps(
  actions: Array<{ dueDate: Date | null; completed: boolean }>,
  now: Date = new Date()
): FollowUpBucket {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfNextWeek = new Date(startOfToday);
  startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

  const b: FollowUpBucket = { overdue: 0, dueToday: 0, dueThisWeek: 0, completed: 0 };
  for (const a of actions) {
    if (a.completed) {
      b.completed += 1;
      continue;
    }
    if (!a.dueDate) continue;
    if (a.dueDate < startOfToday) b.overdue += 1;
    else if (a.dueDate >= startOfToday && a.dueDate < startOfTomorrow) b.dueToday += 1;
    else if (a.dueDate >= startOfTomorrow && a.dueDate < startOfNextWeek) b.dueThisWeek += 1;
  }
  return b;
}