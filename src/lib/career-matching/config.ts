import type { MatchDimension } from "./types";

/**
 * Dimension weights for the matching engine.
 *
 * These are engineering defaults that reflect how many distinct traits a career
 * declares per dimension and how informative each dimension is in practice.
 * They are NOT scientifically validated psychometric weights, and the result is
 * presented to students as a "Career Compatibility Score" — a directional
 * heuristic, never a probability, admission chance or validated percentage.
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
 * profile data because assessments are structured and validated. This affects
 * the dimension contribution; raw evidence variety is separately reflected in
 * the confidence score.
 */
export const SOURCE_WEIGHTS: Record<string, number> = {
  ASSESSMENT: 1.0,
  STUDENT_PROFILE: 0.8,
  ACADEMIC: 0.7,
  PREFERENCE: 0.7,
  MANUAL: 0.5,
} as const;

/**
 * Preferred career gets a bounded boost but does NOT force rank #1.
 * A stated preference is treated as one signal among many — it is a preference,
 * not proof of fit. This prevents confirmation bias while respecting choice.
 */
export const PREFERRED_CAREER_BOOST = 12; // points added to matchScore (0-100)

/**
 * Match tier strengths for the semantic matching hierarchy.
 * CANONICAL > ALIAS > STRUCTURED > LEXICAL.
 * Lexical similarity is deliberately capped low: same words are the weakest
 * form of evidence (surfaces like "AI Engineer" vs "AI Ethics Researcher"
 * must not cross-match).
 */
export const MATCH_TYPE_STRENGTHS = {
  CANONICAL: 1.0,
  ALIAS: 0.9,
  STRUCTURED: 0.85,
  LEXICAL_EXACT: 0.7,
  LEXICAL_CONTAINS: 0.55,
  LEXICAL_SIMILAR: 0.5,
} as const;

/**
 * Word-overlap threshold for the LEXICAL_SIMILAR tier. Strict on purpose:
 * only genuinely overlapping sets qualify, and subset collisions fall to
 * the lower LEXICAL_CONTAINS tier.
 */
export const LEXICAL_SIMILARITY_THRESHOLD = 0.66;

/**
 * Single-signal domination controls.
 * - extraTraitMatchDiscount: when one student value matches several career
 *   traits, only its best trait gets full credit; further traits are credited
 *   at this fraction, so a single fact cannot dominate a dimension.
 * - breadthBase / breadthPerDimension / maxBreadth: the final match score is
 *   multiplied by a breadth factor so that one perfect dimension cannot outrank
 *   a well-rounded profile.
 */
export const SINGLE_SIGNAL_CONTROL = {
  extraTraitMatchDiscount: 0.5,
  breadthBase: 0.6,
  breadthPerDimension: 0.1,
  maxBreadth: 1,
} as const;

/**
 * Stage-aware education scoring.
 * School students are scored neutrally: they have not had a chance to earn
 * degrees, so school-stage evidence neither adds nor subtracts from the match
 * score (future plausibility is carried by other dimensions such as SUBJECT).
 * College/graduate students are evaluated against the degree path when
 * evidence aligns.
 */
export const EDUCATION_SCORING = {
  postSchoolAligned: 85,
  postSchoolNeutral: 55,
} as const;

/**
 * Confidence calculation parameters.
 * Confidence reflects the amount, diversity and reliability of evidence:
 * matched signal count, matched dimension breadth, source variety, whether
 * assessment-derived evidence actually contributed, and how much of the
 * career's trait dimensions the student covers.
 * A preferred career alone, or one repeated signal, cannot reach high
 * confidence (see confidence.ts guards).
 */
export const CONFIDENCE_CONFIG = {
  baseConfidence: 0.15,
  perMatchedSignal: 0.07,
  matchedSignalCap: 6,
  perMatchedDimension: 0.08,
  matchedDimensionCap: 4,
  sourceDiversityBonus: 0.06,
  assessmentEvidenceBonus: 0.08,
  coverageScalingBase: 0.7,
  coverageScalingPerCoverage: 0.3,
  highThreshold: 0.7,
  moderateThreshold: 0.4,
  preferredOnlyCap: 0.3,
  noMatchedSignalCap: 0.35,
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
 * Career-differentiation (trait distinctiveness) controls.
 *
 * Phase 16D: generic career traits (e.g. "Mathematics" appears in ~47% of
 * active careers) let closely-related careers reach the SAME matchScore on the
 * same evidence, collapsing e.g. Artificial Intelligence / Cloud Computing /
 * Data Engineering into a tie. To restore ranking discrimination WITHIN a
 * career family WITHOUT reordering across families (which would hurt family
 * diversity), a bounded credit bonus is applied as a rank tie-break only
 * between same-score, same-category careers, proportional to how *distinctive*
 * their matched traits are.
 *
 * The distinctiveness factor is:
 *     specificity(trait) = 1 + gain * (1 - freq(trait) / activeCareerCount)
 * and is clamped to [1, 1 + gain]. It is computed only during ranking and is:
 *   - bounded (max 1 + gain, default 1.15), so it never overrides a career
 *     that scored clearly higher,
 *   - deterministic: derived from the static active catalog's trait
 *     frequencies, which do not change within a deployment,
 *   - family-scoped: applied only between same-category careers, so it never
 *     reduces top-N family diversity,
 *   - a ranking tie-break, NOT a score change: displayed compatibility scores
 *     and the preferred-career boost are unchanged.
 *
 * This is NOT an inverse-document-frequency reweighting of compatibility.
 * `enabled` can be turned off for pure unit determinism.
 */
export const SPECIFICITY_CONFIG = {
  enabled: process.env.CAREER_MATCH__SPECIFICITY !== "0",
  gain: 0.15,
} as const;

/**
 * Recommended-result states. Phase 16D adds an honest no-confidence state so we
 * never present an arbitrary alphabetical list as "recommendations" when a
 * student has no meaningful evidence. The other tiers are derived from the
 * match-strength thresholds; STRONG > GOOD > POTENTIAL > EXPLORATION.
 */
export const RECOMMENDATION_STATES = {
  strong: "STRONG_MATCH",
  good: "GOOD_MATCH",
  potential: "POTENTIAL_MATCH",
  exploration: "EXPLORATION",
  insufficient: "INSUFFICIENT_EVIDENCE",
} as const;

/**
 * Normalise text for comparison: lowercase, trim, remove special chars.
 */
export function normalizeForMatch(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Calculate word-level overlap similarity between two strings.
 * Uses min-set size in the denominator (overlap coefficient). The semantics
 * module guards against subset collisions by routing them to LEXICAL_CONTAINS.
 */
export function wordSimilarity(a: string, b: string): number {
  const wa = new Set(normalizeForMatch(a).split(" ").filter((w) => w.length > 2));
  const wb = new Set(normalizeForMatch(b).split(" ").filter((w) => w.length > 2));
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.min(wa.size, wb.size);
}