import type { ConfidenceResult } from "./types";
import { CONFIDENCE_CONFIG } from "./config";

/**
 * Confidence computation.
 *
 * Confidence reflects the amount, diversity and reliability of the evidence
 * that actually produced the match:
 *  - how many distinct student values matched,
 *  - across how many of the career's trait dimensions,
 *  - whether more than one information source contributed,
 *  - whether assessment-derived evidence actually matched (not merely present),
 *  - and coverage: what share of the career's trait dimensions the student's
 *    evidence covers.
 *
 * Deliberate guards:
 *  - A single preferred-career signal (or any lone signal) cannot reach high
 *    confidence.
 *  - Zero matched signals caps confidence low even if signals exist.
 *
 * Confidence is a statement about EVIDENCE QUALITY, separate from matchScore.
 * It is not a probability.
 */

export type ConfidenceInput = {
  matchedSignals: number; // distinct normalized student values that matched
  dimensionsMatched: number;
  careerTraitDimensions: number;
  sourceTypeCount: number;
  assessmentEvidence: boolean; // an ASSESSMENT-derived signal actually matched
  singlePreferenceSignal: boolean; // only matched signal is the preferred career itself
  anyMatch: boolean;
};

export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const cfg = CONFIDENCE_CONFIG;

  let score: number = cfg.baseConfidence;

  if (input.matchedSignals > 0) {
    score += cfg.perMatchedSignal * Math.min(input.matchedSignals, cfg.matchedSignalCap);
  }
  score += cfg.perMatchedDimension * Math.min(input.dimensionsMatched, cfg.matchedDimensionCap);

  if (input.sourceTypeCount >= 2 && input.matchedSignals >= 2) {
    score += cfg.sourceDiversityBonus;
  }
  if (input.assessmentEvidence) {
    score += cfg.assessmentEvidenceBonus;
  }

  const coverage =
    input.careerTraitDimensions > 0
      ? Math.min(1, input.dimensionsMatched / input.careerTraitDimensions)
      : 1;
  score = score * (cfg.coverageScalingBase + cfg.coverageScalingPerCoverage * coverage);

  // Guards.
  let cappedLow = false;
  if (!input.anyMatch || input.matchedSignals === 0) {
    score = Math.min(score, cfg.noMatchedSignalCap);
    cappedLow = true;
  }
  if (input.singlePreferenceSignal) {
    score = Math.min(score, cfg.preferredOnlyCap);
    cappedLow = true;
  }

  const clamped = Math.max(0, Math.min(1, score));
  const rounded = Math.round(clamped * 100) / 100;
  const level = rounded >= cfg.highThreshold ? "HIGH" : rounded >= cfg.moderateThreshold ? "MODERATE" : "LOW";

  return {
    score: rounded,
    level,
    factors: {
      matchedSignals: input.matchedSignals,
      dimensionsMatched: input.dimensionsMatched,
      sourceDiversity: input.sourceTypeCount,
      assessmentEvidence: input.assessmentEvidence,
      coverage: Math.round(coverage * 100) / 100,
      cappedLow,
    },
  };
}