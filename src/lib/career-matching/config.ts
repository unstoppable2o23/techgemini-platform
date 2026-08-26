import type { MatchDimension } from "./types";

/**
 * Dimension weights for the matching engine.
 * These are initial engineering defaults, NOT scientifically validated
 * psychometric weights. Adjust based on real-world feedback.
 */
export const DIMENSION_WEIGHTS: Record<MatchDimension, number> = {
  INTEREST: 0.25,
  SKILL: 0.2,
  APTITUDE: 0.15,
  PERSONALITY: 0.1,
  SUBJECT: 0.1,
  EDUCATION: 0.1,
  WORK_ENVIRONMENT: 0.05,
} as const;

/**
 * Source reliability multipliers.
 * Assessment-derived signals are weighted more heavily than self-reported
 * profile data because assessments are structured and validated.
 */
export const SOURCE_WEIGHTS: Record<string, number> = {
  ASSESSMENT: 1.0,
  STUDENT_PROFILE: 0.8,
  ACADEMIC: 0.7,
  PREFERENCE: 0.7,
  MANUAL: 0.5,
} as const;

/**
 * Preferred career gets a boost but does not force rank #1.
 * This prevents confirmation bias while respecting student choice.
 */
export const PREFERRED_CAREER_BOOST = 12; // points added to matchScore (0-100)

/**
 * Confidence calculation thresholds.
 * More evidence → higher confidence. More dimensions → higher confidence.
 */
export const CONFIDENCE_CONFIG = {
  minSignalsForHighConfidence: 5,
  minDimensionsForHighConfidence: 3,
  sourceDiversityBonus: 0.1,
  assessmentBonus: 0.15,
  baseConfidence: 0.3,
} as const;

/**
 * Score thresholds for match strength classification.
 */
export const MATCH_STRENGTH_THRESHOLDS = {
  strong: 70,
  moderate: 50,
  weak: 30,
} as const;

/**
 * Default number of matches returned.
 */
export const DEFAULT_MATCH_LIMIT = 10;

/**
 * Disclaimer shown when no psychometric assessments are available.
 */
export const NO_ASSESSMENT_DISCLAIMER =
  "Your recommendations are currently based on your interests, academic information and preferences. Completing assessments can provide additional personalisation.";

/**
 * Normalise text for comparison: lowercase, trim, remove special chars.
 */
export function normalizeForMatch(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Calculate word-level Jaccard similarity between two strings.
 */
export function wordSimilarity(a: string, b: string): number {
  const wa = new Set(normalizeForMatch(a).split(" ").filter((w) => w.length > 2));
  const wb = new Set(normalizeForMatch(b).split(" ").filter((w) => w.length > 2));
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.min(wa.size, wb.size);
}
