import type { DimensionScore, MatchDimension, MatchReason } from "./types";

const DIMENSION_LABELS: Record<MatchDimension, string> = {
  INTEREST: "interest",
  PERSONALITY: "personality",
  APTITUDE: "aptitude",
  SUBJECT: "subject",
  SKILL: "skill",
  EDUCATION: "education",
  WORK_ENVIRONMENT: "work environment",
};

export function dimensionLabel(dimension: MatchDimension): string {
  return DIMENSION_LABELS[dimension] ?? dimension.toLowerCase().replace(/_/g, " ");
}

export type ExplanationInput = {
  dimensionScores: DimensionScore[];
  studentDimensions: Set<MatchDimension>;
  verifiedGapDimensions: Set<MatchDimension>;
  preferenceBoost: boolean;
  educationReasons: MatchReason[];
};

export type ExplanationResult = {
  strengths: string[];
  developmentAreas: string[];
  missingEvidence: string[];
  verifiedGaps: string[];
  reasons: MatchReason[];
};

/**
 * Builds human-readable explanations from dimension scores, separating:
 *  - MISSING_EVIDENCE: student has no data for this dimension yet.
 *  - DEVELOPMENT_AREA: student has evidence but it does not align yet
 *    (plausible room to grow — not a verdict).
 *  - VERIFIED_GAP: student has reliable evidence that conflicts with the
 *    career's requirements for the dimension.
 *
 * EDUCATION is handled by the caller (stage-aware reasons) to avoid double
 * counting — see score.ts.
 */
export function buildExplanations(input: ExplanationInput): ExplanationResult {
  const strengths: string[] = [];
  const developmentAreas: string[] = [];
  const missingEvidence: string[] = [];
  const verifiedGaps: string[] = [];
  const reasons: MatchReason[] = [];

  const hasReliableConflictEvidence = (ds: DimensionScore): boolean =>
    ds.unmatchedTraitValues.length > 0 &&
    ds.totalTraits > 0 &&
    ds.matchedCount === 0;

  for (const ds of input.dimensionScores) {
    if (ds.dimension === "EDUCATION") continue; // stage-aware, handled by caller
    const label = dimensionLabel(ds.dimension);

    if (ds.matchedCount > 0 && ds.score >= 60) {
      strengths.push(`Strong ${label} alignment (${ds.matchedCount} matching signals, ${ds.score}%)`);
      reasons.push({
        type: "strength",
        dimension: ds.dimension,
        text: `Strong ${label} alignment (${ds.matchedCount} matching signals, ${ds.score}%)`,
      });
    } else if (ds.matchedCount > 0 && ds.score >= 30) {
      reasons.push({
        type: "strength",
        dimension: ds.dimension,
        text: `Moderate ${label} alignment (${ds.matchedCount} signals)`,
      });
      strengths.push(`Moderate ${label} alignment`);
    } else if (ds.matchedCount > 0 && ds.score > 0) {
      developmentAreas.push(`${label} alignment is early (${ds.score}%)`);
      reasons.push({
        type: "development_area",
        dimension: ds.dimension,
        text: `${label} alignment is early (${ds.score}%) — building on it could strengthen this match`,
        evidenceType: "DEVELOPMENT_AREA",
      });
    } else if (hasReliableConflictEvidence(ds) && input.studentDimensions.has(ds.dimension)) {
      // The student HAS evidence in this dimension but none of it aligned with
      // the career's traits. Always surfaced as a development area (a gap we
      // can grow into); when the student evidence is reliable (assessment or
      // very strong), we additionally label it a verified gap.
      developmentAreas.push(`${label} development needed`);
      const verified = input.verifiedGapDimensions.has(ds.dimension);
      if (verified) {
        verifiedGaps.push(`${label}: profile evidence present but not aligned`);
        reasons.push({
          type: "development_area",
          dimension: ds.dimension,
          text: `Profile evidence in the ${label} area is present but does not align with this career's requirements.`,
          evidenceType: "VERIFIED_GAP",
        });
      } else {
        reasons.push({
          type: "development_area",
          dimension: ds.dimension,
          text: `${label} skills could be developed for this career`,
          evidenceType: "DEVELOPMENT_AREA",
        });
      }
    } else if (ds.totalTraits > 0 && !input.studentDimensions.has(ds.dimension)) {
      missingEvidence.push(`No ${label} data available`);
      reasons.push({
        type: "missing_evidence",
        dimension: ds.dimension,
        text: `No ${label} assessment or profile data available`,
        evidenceType: "MISSING_EVIDENCE",
      });
    }
  }

  if (input.preferenceBoost) {
    reasons.push({
      type: "preference_boost",
      text: "You indicated interest in this career or a related field",
    });
  }

  for (const er of input.educationReasons) {
    reasons.push(er);
  }

  return { strengths, developmentAreas, missingEvidence, verifiedGaps, reasons };
}