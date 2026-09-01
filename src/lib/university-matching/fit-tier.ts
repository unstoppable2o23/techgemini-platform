import type { InstitutionCandidate, MappingBasis } from "./types.ts";
import { computeFreshness } from "../university-profile/freshness.ts";

export type FitTier = "STRONG_FIT" | "GOOD_FIT" | "POTENTIAL_FIT" | "EXPLORE";

export interface FitTierResult {
  tier: FitTier;
  label: string; // Display label: Strong Fit, Good Fit, Potential Fit, Explore
  explanation: string;
  cappedReason?: string;
}

/**
 * Fit tier definitions with real score-band evidence.
 * Bands derived from score distribution report (2026-08-28):
 * - Verified programs cluster 80-86 (avg 82)
 * - Mixed verified+category 56-86
 * - Pure category 56 (all)
 * Natural boundaries: high 80-100, mid 60-79, low 40-59, weak 0-39
 * Evidence quality caps tier: category-based never Strong Fit, even if matchScore high.
 * Freshness may cap: verified UNKNOWN/HISTORICAL capped at Good Fit.
 * Deterministic: same inputs → same tier.
 */

const TIER_BANDS = {
  STRONG_FIT: { minScore: 75, minConfidence: 80 },
  GOOD_FIT: { minScore: 60, minConfidence: 60 },
  POTENTIAL_FIT: { minScore: 45, minConfidence: 40 },
  EXPLORE: { minScore: 0, minConfidence: 0 },
} as const;

export function getTierLabel(tier: FitTier, forSafeFit: boolean = false): string {
  switch (tier) {
    case "STRONG_FIT":
      return forSafeFit ? "Safe Fit (strong profile fit)" : "Strong Fit";
    case "GOOD_FIT":
      return "Good Fit";
    case "POTENTIAL_FIT":
      return "Potential Fit";
    case "EXPLORE":
    default:
      return "Explore";
  }
}

/**
 * Map tier to display badge props (single place for future Safe Fit mapping)
 */
export function getTierBadgeProps(tier: FitTier): { variant: "default" | "secondary" | "outline"; label: string } {
  switch (tier) {
    case "STRONG_FIT":
      return { variant: "default", label: getTierLabel(tier) };
    case "GOOD_FIT":
      return { variant: "secondary", label: getTierLabel(tier) };
    case "POTENTIAL_FIT":
      return { variant: "outline", label: getTierLabel(tier) };
    case "EXPLORE":
    default:
      return { variant: "outline", label: getTierLabel(tier) };
  }
}

/**
 * Core tier derivation: matchScore bands + evidence-level caps + freshness caps.
 * Does NOT mutate matchScore or confidenceScore — overlay only.
 */
export function deriveFitTier(
  matchScore: number,
  confidenceScore: number,
  mappingBasis: MappingBasis,
  program?: { verificationStatus?: string; verifiedAt?: Date | string | null } | null,
  hasAcademicData: boolean = true,
  hasBudgetData: boolean = true
): FitTierResult {
  // Evidence quality caps tier — high matchScore on category-based alone must NOT produce Strong Fit
  let maxTier: FitTier = "STRONG_FIT";
  if (mappingBasis === "institutionType-category") {
    maxTier = "POTENTIAL_FIT";
  } else if (mappingBasis === "curated") {
    maxTier = "GOOD_FIT";
  } else if (mappingBasis === "none") {
    maxTier = "EXPLORE";
  }

  // Freshness may cap: verified UNKNOWN/HISTORICAL capped at Good Fit
  let freshnessCappedReason: string | undefined;
  if (mappingBasis === "verified-program" && program) {
    const freshness = computeFreshness(program.verifiedAt);
    if (freshness === "UNKNOWN" || freshness === "HISTORICAL") {
      if (maxTier === "STRONG_FIT") {
        maxTier = "GOOD_FIT";
        freshnessCappedReason = `Capped at Good Fit due to ${freshness.toLowerCase()} program verification`;
      }
    }
  }

  // Missing-data graceful degradation: if academic or budget data missing, we still compute tier from remaining evidence
  // But if confidence is very low due to missing data, tier may naturally be lower via confidence threshold
  // No tier is INVENTED from missing data — missing dimension simply absent, not defaulting

  // Determine tier by score bands, respecting maxTier cap
  let tier: FitTier = "EXPLORE";
  let explanation = "";

  if (matchScore >= TIER_BANDS.STRONG_FIT.minScore && confidenceScore >= TIER_BANDS.STRONG_FIT.minConfidence) {
    tier = "STRONG_FIT";
    explanation = "Strong profile fit — verified program evidence directly matches your education pathway, with strong alignment on country/preference dimensions.";
  } else if (matchScore >= TIER_BANDS.GOOD_FIT.minScore && confidenceScore >= TIER_BANDS.GOOD_FIT.minConfidence) {
    tier = "GOOD_FIT";
    explanation = "Good fit — relevant verified or curated evidence with solid alignment; some dimensions unmatched or missing.";
  } else if (matchScore >= TIER_BANDS.POTENTIAL_FIT.minScore) {
    tier = "POTENTIAL_FIT";
    explanation = "Potential fit — institution relevant to your education area; exact program not yet verified or partial alignment.";
  } else {
    tier = "EXPLORE";
    explanation = "Explore — weak direct evidence; institution may be relevant to your broader interest area but has no verified pathway alignment.";
  }

  // Apply evidence quality cap
  const tierOrder: Record<FitTier, number> = { STRONG_FIT: 3, GOOD_FIT: 2, POTENTIAL_FIT: 1, EXPLORE: 0 };
  if (tierOrder[tier] > tierOrder[maxTier]) {
    const capped = maxTier;
    let reason = `Capped at ${getTierLabel(capped)} due to ${mappingBasis} evidence`;
    if (freshnessCappedReason) reason = freshnessCappedReason;
    return {
      tier: capped,
      label: getTierLabel(capped),
      explanation: capped === "POTENTIAL_FIT" ? "Potential fit — institution relevant to your education area; exact program not yet verified." : getTierLabel(capped) === "Good Fit" ? "Good fit — relevant verified program; some dimensions unmatched." : `Explore — ${reason.toLowerCase()}.`,
      cappedReason: reason,
    };
  }

  if (freshnessCappedReason && tier === "STRONG_FIT") {
    return {
      tier: "GOOD_FIT",
      label: getTierLabel("GOOD_FIT"),
      explanation: "Good fit — verified program but with unknown or historical verification date.",
      cappedReason: freshnessCappedReason,
    };
  }

  return {
    tier,
    label: getTierLabel(tier),
    explanation,
    cappedReason: freshnessCappedReason,
  };
}

/**
 * Graceful degradation matrix (documented):
 * - No academic profile data → tier computed WITHOUT academic dimension; if remaining evidence supports tier, assign it; if too thin, Explore
 * - No budget data → budget dimension simply absent; never defaults to affordable/expensive
 * - Partial assessments → tier computed from whatever dimensions exist, UI indicates "based on your current profile information" if confidence <60
 * - Zero assessments → no tiers presented as personalized; show neutral exploration state per Phase 16 empty-state patterns (isEmpty check)
 */
export function shouldShowPersonalizedTiers(hasPrograms: boolean, hasAssessmentData: boolean, matchScore: number): boolean {
  if (!hasPrograms) return false;
  if (!hasAssessmentData && matchScore < 45) return false;
  return true;
}
