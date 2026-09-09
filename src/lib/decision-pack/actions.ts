/**
 * Phase 30 — Deterministic action-plan builder.
 *
 * Pure over `DecisionCenterState`. Only emits actions that are genuinely
 * actionable from the current persisted state (never dead-end CTAs, never
 * invented destinations). Priorities: the student's current best next action
 * (from `nextDecision`) is marked "high"; everything else is "medium"; a
 * counselor appointment is "low". Ordering and ids are stable.
 */
import type { DecisionCenterState } from "../decision-center/center.ts";
import type {
  DecisionPackAction,
  DecisionPackActionType,
  DecisionPackPriority,
} from "./types.ts";

interface Candidate {
  id: string;
  type: DecisionPackActionType;
  title: string;
  reason: string;
  href: string;
}

/**
 * Language used for "why is this the next decision" in the Decision Pack. This
 * mirrors the journey's next-best-action ids so the pack and the dashboard
 * always agree on the same reasons.
 */
export const NEXT_DECISION_REASONS: Record<string, string> = {
  complete_profile:
    "The career profile needs a few more details before recommendations become reliable.",
  take_assessments:
    "Completing the assessments gives us the evidence needed to personalize recommendations.",
  explore_matches:
    "There is not enough evidence yet to support a specific career direction.",
  select_pathway:
    "A preferred career direction has not been chosen yet, and that choice shapes the study roadmap.",
  build_roadmap:
    "A career direction is set; the next step is a personalized step-by-step study roadmap.",
  continue_roadmap:
    "The roadmap is in progress and should be continued to keep the plan on track.",
  shortlist_careers:
    "Saving careers that interest the student helps the counselor understand the direction.",
  shortlist_universities:
    "A study pathway is taking shape; shortlisting institutions clarifies the options.",
  review_with_counselor:
    "The direction is largely set — a counselor session is the most useful way to verify the plan.",
  journey_complete:
    "Everything the platform tracks is up to date; any section can be revisited at any time.",
};

const LOW = "low" as const;
const MEDIUM = "medium" as const;
const HIGH = "high" as const;

const PRIORITY_RANK: Record<DecisionPackPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function buildDecisionPackActions(
  center: DecisionCenterState
): DecisionPackAction[] {
  const { header, selectedPathway, roadmapProgress } = center;
  const brief = center.counselorBrief;

  const candidates: Candidate[] = [];
  const careerMatchCount = header.careerMatchCount;
  const hasCareerDirection = Boolean(
    selectedPathway.careerId ?? selectedPathway.careerName ?? brief.shortlistedCareerCount > 0
  );

  if (header.profileCompleteness < 60) {
    candidates.push({
      id: "complete_profile",
      type: "PROFILE",
      title: "Complete the career profile",
      reason: "A complete profile powers accurate career matches and the roadmap.",
      href: "/career-preferences",
    });
  }

  if (header.assessmentCompletedCount < header.assessmentTotal) {
    candidates.push({
      id: "take_assessments",
      type: "ASSESSMENT",
      title: "Take the remaining assessments",
      reason: `${header.assessmentTotal - header.assessmentCompletedCount} assessment${
        header.assessmentTotal - header.assessmentCompletedCount === 1 ? "" : "s"
      } remaining to personalize the recommendations.`,
      href: "/assessments",
    });
  }

  if (header.lowInformation || careerMatchCount === 0) {
    candidates.push({
      id: "explore_matches",
      type: "CAREER",
      title: "Explore career matches",
      reason: "Not enough evidence yet to name a career direction.",
      href: "/career-matches",
    });
  }

  if (careerMatchCount >= 2) {
    candidates.push({
      id: "compare_careers",
      type: "CAREER",
      title: "Compare the top careers",
      reason: "A side-by-side view of the strongest matches.",
      href: "/career-matches",
    });
  }

  if (careerMatchCount > 0 && !selectedPathway.careerChosen) {
    candidates.push({
      id: "select_pathway",
      type: "CAREER",
      title: "Select a preferred pathway",
      reason: "A chosen direction shapes the program shortlist, universities and roadmap.",
      href: "/career-matches",
    });
  }

  if (center.recommendedPrograms.length > 0) {
    candidates.push({
      id: "explore_programs",
      type: "PROGRAM",
      title: "Review the recommended programs",
      reason: `${center.recommendedPrograms.length} program${
        center.recommendedPrograms.length === 1 ? "" : "s"
      } connect to the shortlisted careers.`,
      href: "/education",
    });
  }

  if (!roadmapProgress.exists) {
    candidates.push({
      id: "build_roadmap",
      type: "ROADMAP",
      title: "Build the study roadmap",
      reason: "A step-by-step plan toward the chosen pathway.",
      href: "/roadmap",
    });
  } else if (roadmapProgress.percent < 100) {
    candidates.push({
      id: "continue_roadmap",
      type: "ROADMAP",
      title: "Continue the roadmap",
      reason: `${roadmapProgress.percent}% complete — keep the momentum going.`,
      href: "/roadmap",
    });
  }

  if (careerMatchCount > 0 && brief.shortlistedCareerCount === 0) {
    candidates.push({
      id: "shortlist_careers",
      type: "CAREER",
      title: "Shortlist careers that interest the student",
      reason: "Saved careers help the student and the counselor track direction.",
      href: "/career-matches",
    });
  }

  if (hasCareerDirection && brief.shortlistedUniversityCount === 0) {
    candidates.push({
      id: "shortlist_universities",
      type: "UNIVERSITY",
      title: "Shortlist universities",
      reason: "Institutions that fit the chosen study pathway.",
      href: "/shortlist",
    });
  }

  candidates.push(...buildCounselorCandidates(center));

  const nextId = center.nextDecision?.id ?? null;

  return candidates
    .map((c): DecisionPackAction => {
      const priority: DecisionPackPriority =
        c.id === nextId ? HIGH : c.type === "COUNSELOR" ? LOW : MEDIUM;
      return {
        id: c.id,
        type: c.type,
        title: c.title,
        reason: c.reason,
        priority,
        href: c.href,
        done: false,
      };
    })
    .sort((a, b) => {
      const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (byPriority !== 0) return byPriority;
      return a.id.localeCompare(b.id);
    });
}

function buildCounselorCandidates(center: DecisionCenterState): Candidate[] {
  const assigned = center.header.counselorAssigned;
  if (assigned) {
    return [
      {
        id: "review_with_counselor",
        type: "COUNSELOR",
        title: "Discuss the plan with the counselor",
        reason: "A second opinion on the shortlist, matches and roadmap.",
        href: "/appointments",
      },
    ];
  }
  return [
    {
      id: "book_appointment",
      type: "COUNSELOR",
      title: "Book an appointment",
      reason: "Talk through the plan with a counselor.",
      href: "/appointments",
    },
  ];
}

/** Human reason for the current "next decision" (F — current decision). */
export function nextDecisionReason(id: string | null): string {
  if (!id) return "The next step depends on adding more details to the profile.";
  return (
    NEXT_DECISION_REASONS[id] ??
    "The next step depends on the details saved in the profile."
  );
}