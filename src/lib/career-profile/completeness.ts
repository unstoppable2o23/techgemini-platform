/**
 * Profile completeness calculation.
 *
 * Weights are implementation defaults chosen for product usefulness — they
 * are NOT scientific validity claims. Adjust COMPLETENESS_WEIGHTS to change
 * the calculation; the level thresholds can also be tuned independently.
 */

export const COMPLETENESS_WEIGHTS = {
  assessmentCoverage: 0.4, // split evenly across the 5 assessments
  dimensions: {
    INTEREST: 0.15,
    PERSONALITY: 0.1,
    APTITUDE: 0.15,
    SKILL: 0.1,
    SUBJECT: 0.05,
    WORK_ENVIRONMENT: 0.05,
  },
  EDUCATION: 0.0, // education signals come from the stream assessment; folded into coverage
} as const;

const ASSESSMENT_KINDS = ["stream", "ideal", "personality", "intelligences", "learning"] as const;

export const DIMENSION_WEIGHTS: Record<string, number> = {
  INTEREST: COMPLETENESS_WEIGHTS.dimensions.INTEREST,
  PERSONALITY: COMPLETENESS_WEIGHTS.dimensions.PERSONALITY,
  APTITUDE: COMPLETENESS_WEIGHTS.dimensions.APTITUDE,
  SKILL: COMPLETENESS_WEIGHTS.dimensions.SKILL,
  SUBJECT: COMPLETENESS_WEIGHTS.dimensions.SUBJECT,
  WORK_ENVIRONMENT: COMPLETENESS_WEIGHTS.dimensions.WORK_ENVIRONMENT,
  EDUCATION: COMPLETENESS_WEIGHTS.EDUCATION,
};

export type CompletenessInput = {
  completedAssessments: string[];
  dimensionsWithSignals: string[];
};

export type CompletenessResult = {
  score: number;
  level: "EMPTY" | "PARTIAL" | "DEVELOPING" | "COMPLETE";
  assessmentCoverage: number;
  dimensionBreakdown: Record<string, number>;
};

export function calculateCompleteness(input: CompletenessInput): CompletenessResult {
  const completed = new Set(input.completedAssessments);
  const assessmentCoverage =
    (ASSESSMENT_KINDS.reduce((acc, k) => acc + (completed.has(k) ? 1 : 0), 0) /
      ASSESSMENT_KINDS.length) *
    COMPLETENESS_WEIGHTS.assessmentCoverage *
    100;

  const dimensionBreakdown: Record<string, number> = {};
  let dimensionTotal = 0;
  for (const [dimension, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    if (weight === 0) {
      dimensionBreakdown[dimension] = 0;
      continue;
    }
    const has = input.dimensionsWithSignals.includes(dimension);
    const contribution = has ? weight * 100 : 0;
    dimensionBreakdown[dimension] = contribution;
    dimensionTotal += contribution;
  }

  const score = Math.round((assessmentCoverage + dimensionTotal) * 10) / 10;

  const level =
    score === 0 ? "EMPTY" : score < 40 ? "PARTIAL" : score < 80 ? "DEVELOPING" : "COMPLETE";

  return {
    score,
    level,
    assessmentCoverage: Math.round(assessmentCoverage * 10) / 10,
    dimensionBreakdown,
  };
}
