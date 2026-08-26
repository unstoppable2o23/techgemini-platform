/**
 * Dual completeness calculation:
 * 1. Assessment Completeness — how much of the assessment suite is done
 * 2. Career Profile Completeness — how much total career-relevant info exists
 *
 * Weights are implementation defaults, NOT scientific validity claims.
 */

const ASSESSMENT_KINDS = ["stream", "ideal", "personality", "intelligences", "learning"];

// ---- Assessment Completeness ----
// Simple: fraction of the 5 assessments completed × 100

export function calculateAssessmentCompleteness(
  completedKinds: string[]
): { score: number; completed: string[]; missing: string[] } {
  const completed = new Set(completedKinds);
  const done = ASSESSMENT_KINDS.filter((k) => completed.has(k));
  const missing = ASSESSMENT_KINDS.filter((k) => !completed.has(k));
  return {
    score: Math.round((done.length / ASSESSMENT_KINDS.length) * 100),
    completed: done,
    missing,
  };
}

// ---- Career Profile Completeness ----
// Weighted: assessments (40%) + profile data (60%)
// A student with zero assessments but rich profile data can reach ~60%.

export const PROFILE_COMPLETENESS_WEIGHTS = {
  assessmentSuite: 0.4,
  preferredCareer: 0.1,
  academicLevel: 0.08,
  academicPerformance: 0.06,
  educationLevel: 0.06,
  locationPreference: 0.05,
  careerNotes: 0.05,
  dimensionSignals: {
    INTEREST: 0.05,
    PERSONALITY: 0.05,
    APTITUDE: 0.05,
    SKILL: 0.03,
    WORK_ENVIRONMENT: 0.03,
  },
} as const;

export type ProfileCompletenessInput = {
  completedAssessments: string[];
  dimensionsWithSignals: string[];
  hasProfileData: boolean;
  hasPreferredCareer: boolean;
};

export type ProfileCompletenessResult = {
  score: number;
  level: "EMPTY" | "PARTIAL" | "DEVELOPING" | "COMPLETE";
  assessmentCoverage: number;
  dimensionBreakdown: Record<string, number>;
  profileDataContribution: number;
  assessmentContribution: number;
};

export function calculateProfileCompleteness(
  input: ProfileCompletenessInput
): ProfileCompletenessResult {
  const W = PROFILE_COMPLETENESS_WEIGHTS;
  const completed = new Set(input.completedAssessments);

  const assessmentContribution =
    (ASSESSMENT_KINDS.reduce((acc, k) => acc + (completed.has(k) ? 1 : 0), 0) /
      ASSESSMENT_KINDS.length) *
    W.assessmentSuite *
    100;

  let profileDataContribution = 0;
  const dimensionBreakdown: Record<string, number> = {};

  if (input.hasPreferredCareer) {
    profileDataContribution += W.preferredCareer * 100;
  }
  if (input.hasProfileData) {
    // StudentProfile data exists (grade, exams, state, etc.)
    profileDataContribution +=
      (W.academicLevel + W.academicPerformance + W.educationLevel + W.locationPreference) * 100;
  }

  for (const [dim, weight] of Object.entries(W.dimensionSignals)) {
    const has = input.dimensionsWithSignals.includes(dim);
    const contribution = has ? weight * 100 : 0;
    dimensionBreakdown[dim] = contribution;
    profileDataContribution += contribution;
  }

  const score =
    Math.round((assessmentContribution + profileDataContribution) * 10) / 10;

  const level =
    score === 0
      ? "EMPTY"
      : score < 25
        ? "PARTIAL"
        : score < 60
          ? "DEVELOPING"
          : "COMPLETE";

  return {
    score,
    level,
    assessmentCoverage: Math.round(assessmentContribution * 10) / 10,
    dimensionBreakdown,
    profileDataContribution: Math.round(profileDataContribution * 10) / 10,
    assessmentContribution: Math.round(assessmentContribution * 10) / 10,
  };
}

// ---- Legacy export for backward compatibility ----
export function calculateCompleteness(input: {
  completedAssessments: string[];
  dimensionsWithSignals: string[];
}): { score: number; level: "EMPTY" | "PARTIAL" | "DEVELOPING" | "COMPLETE"; assessmentCoverage: number; dimensionBreakdown: Record<string, number> } {
  const result = calculateProfileCompleteness({
    completedAssessments: input.completedAssessments,
    dimensionsWithSignals: input.dimensionsWithSignals,
    hasProfileData: false,
    hasPreferredCareer: false,
  });
  return {
    score: result.score,
    level: result.level,
    assessmentCoverage: result.assessmentCoverage,
    dimensionBreakdown: result.dimensionBreakdown,
  };
}
