import type { MatchResult, MappingBasis } from "./types.ts";

const BASIS_EVIDENCE: Record<MappingBasis, string> = {
  curated: "Verified (curated) education-program mapping links this institution to the pathway.",
  "institutionType-category":
    "Category-derived association (institution type ↔ education pathway). Program availability is NOT individually verified.",
  none: "No education-institution mapping is available; this candidate is weakly supported.",
};

/**
 * Populate reasons / strengths / limitations / evidence for a MatchResult.
 * Pure and deterministic. STEP 15 — every recommendation must explain WHY.
 */
export function buildExplanation(result: MatchResult, careerName?: string): MatchResult {
  const { dimensions, mappingStatus, institution } = result;
  const reasons: string[] = [];
  const strengths: string[] = [];
  const limitations: string[] = [];
  const evidence: string[] = [];

  for (const d of dimensions) {
    if (d.available && d.score >= 70) {
      reasons.push(d.label);
      strengths.push(`${d.label}: ${d.score}%`);
    } else if (!d.available) {
      limitations.push(d.note || `${d.label} data unavailable.`);
    } else if (d.score < 40) {
      limitations.push(`${d.label} is low (${d.score}%).`);
    }
  }

  if (mappingStatus === "institutionType-category") {
    limitations.push("Related by institution category; individual program availability has not been verified.");
  }
  if (mappingStatus === "none") {
    limitations.push("No education mapping available; recommendation is weakly supported.");
  }

  evidence.push(BASIS_EVIDENCE[mappingStatus]);
  if (careerName) evidence.push(`Career context: ${careerName}.`);
  evidence.push(`Institution dataset: ${institution.dataset === "indian" ? "Indian institution" : "Global university"}.`);

  return {
    ...result,
    reasons,
    strengths,
    limitations: [...new Set(limitations)],
    evidence: [...new Set(evidence)],
  };
}
