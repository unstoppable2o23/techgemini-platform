// Phase 25 — Recommendation explainability model.
//
// PURE presentation layer over the frozen engine's already-rich output. It
// NEVER recomputes scores or confidence; it only translates the existing
// CareerMatch into a calm, evidence-grounded, student-friendly display model.
//
// Rules:
//   - Every displayed item must trace back to real engine evidence.
//   - Do not invent reasons that aren't in the match.
//   - Development areas are phrased as growth opportunities, never as
//     judgments about the student.
//   - The match score is presented as evidence-based, not a probability.

import type {
  CareerMatch,
  ConfidenceLevel,
  MatchDimension,
  MatchStrength,
} from "../career-matching/types";

export type MatchStrengthLabel =
  | "Strong match"
  | "Good match"
  | "Developing match"
  | "Limited evidence";

const DIMENSION_HUMAN: Record<MatchDimension, string> = {
  INTEREST: "interest",
  PERSONALITY: "personality",
  APTITUDE: "aptitude",
  SUBJECT: "subject",
  SKILL: "skill",
  EDUCATION: "education",
  WORK_ENVIRONMENT: "work environment",
};

export function dimensionHuman(d: MatchDimension): string {
  return DIMENSION_HUMAN[d] ?? d.toLowerCase().replace(/_/g, " ");
}

const MISSING_CATALOG: Record<MatchDimension, string> = {
  APTITUDE: "Aptitude evidence is not yet available",
  SUBJECT: "Subject evidence is incomplete",
  EDUCATION: "Education pathway is not yet confirmed",
  SKILL: "Skill evidence is not yet available",
  INTEREST: "Interest evidence is not yet available",
  PERSONALITY: "Personality evidence is not yet available",
  WORK_ENVIRONMENT: "Work-environment preferences are not yet provided",
};

/**
 * Maps the engine's match strength to a plain-language label. The engine's
 * MatchStrength is fixed ("strong" | "moderate" | "weak" | "development_area" |
 * "missing_evidence"); for students we soften "weak"/"moderate" into growth
 * language that never reads as a verdict.
 */
export function matchStrengthLabel(strength: MatchStrength): MatchStrengthLabel {
  switch (strength) {
    case "strong":
      return "Strong match";
    case "moderate":
      return "Good match";
    case "weak":
      return "Developing match";
    case "development_area":
      return "Developing match";
    case "missing_evidence":
    default:
      return "Limited evidence";
  }
}

/** Plain-language confidence heading, from the existing confidence level. */
export function confidenceHeading(level: ConfidenceLevel): string {
  switch (level) {
    case "HIGH":
      return "High confidence";
    case "MODERATE":
      return "Moderate confidence";
    case "LOW":
    default:
      return "Low confidence";
  }
}

/**
 * Confidence explanation helper text, tied to the existing confidence level.
 * Never framed as statistical probability.
 */
export function confidenceExplanation(level: ConfidenceLevel): string {
  switch (level) {
    case "HIGH":
      return "Multiple relevant evidence areas support this recommendation.";
    case "MODERATE":
      return "Some useful evidence supports this recommendation, but more information could improve it.";
    case "LOW":
    default:
      return "Limited profile information is available, so treat this as an early directional suggestion.";
  }
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Why-this-matches reasons drawn only from existing strength / preference
 * evidence. Returns a curated list (up to `max`).
 */
export function whyThisMatches(match: CareerMatch, max = 4): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (text: string) => {
    if (!text || seen.has(text)) return;
    seen.add(text);
    out.push(text);
  };

  if (match.preferenceBoost) {
    push("You selected this career (or a related field) as a preference");
  }

  for (const r of match.reasons) {
    if (r.type !== "strength") continue;
    push(r.text);
  }

  for (const s of match.strengths) push(s);

  if (out.length === 0 && match.evidence.length > 0) {
    push(`Evidence in your profile aligns with this career (${match.evidence.length} area${match.evidence.length === 1 ? "" : "s"})`);
  }

  return out.slice(0, max);
}

/**
 * Missing-evidence items derived from the engine's per-dimension gaps. These
 * are honest "not yet available" states, not failures.
 */
export function whatIsMissing(match: CareerMatch, max = 4): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (text: string) => {
    if (!text || seen.has(text)) return;
    seen.add(text);
    out.push(text);
  };

  for (const r of match.reasons) {
    if (r.type !== "missing_evidence") continue;
    const dim = r.dimension;
    push(MISSING_CATALOG[dim as MatchDimension] ?? r.text);
  }

  for (const m of match.missingEvidence) push(m);

  return out.slice(0, max);
}

/**
 * Growth-oriented development areas. Always phrased as "an area to develop" /
 * "evidence that could strengthen this pathway" — never "you are weak at X".
 */
export function developmentAreas(match: CareerMatch, max = 4): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (text: string) => {
    if (!text || seen.has(text)) return;
    seen.add(text);
    out.push(text);
  };

  // Copies any engine development-area string into the growth frame so that no
  // item can read as a verdict ("not aligned", "weak", etc.).
  const growthPhrase = (raw: string, dim?: string): string => {
    if (dim) {
      return `${capitalize(dimensionHuman(dim as MatchDimension))}: an area to develop that could strengthen this pathway`;
    }
    const base = raw
      .replace(/: profile evidence present but not aligned$/i, "")
      .replace(/[.:]$/, "")
      .trim();
    if (base && base.toLowerCase() !== raw.trim().toLowerCase()) {
      return `${base}: an area to develop that could strengthen this pathway`;
    }
    return `${capitalize(raw)} — an area to develop that could strengthen this pathway`;
  };

  for (const r of match.reasons) {
    if (r.type !== "development_area") continue;
    push(growthPhrase(r.text, r.dimension));
  }

  // Surface any additional engine development-area strings not already shown.
  for (const d of match.developmentAreas) {
    if (out.length >= max) break;
    if (out.some((o) => o === d)) continue;
    push(growthPhrase(d));
  }

  return out.slice(0, max);
}

/**
 * Suggested next actions derived ONLY from what is actually missing in this
 * match. Never recommends an assessment the student doesn't need.
 */
export type NextAction = {
  label: string;
  href?: string;
  /** Optional assessment kind this action would fill, or null. */
  assessmentKind?: string | null;
};

export function nextActions(match: CareerMatch): NextAction[] {
  const actions: NextAction[] = [];
  const missingDims = new Set<MatchDimension>();

  for (const r of match.reasons) {
    if (r.type === "missing_evidence" && r.dimension) missingDims.add(r.dimension as MatchDimension);
  }
  for (const m of match.missingEvidence) {
    const mh = m.toLowerCase();
    for (const [dim, label] of Object.entries(DIMENSION_HUMAN)) {
      if (mh.includes(label)) missingDims.add(dim as MatchDimension);
    }
  }

  if (missingDims.has("EDUCATION")) {
    actions.push({ label: "Confirm your current qualification", href: "/career-preferences" });
  }
  if (missingDims.has("SUBJECT")) {
    actions.push({ label: "Add the subjects you study", href: "/career-preferences" });
  }
  if (missingDims.has("APTITUDE")) {
    actions.push({ label: "Complete the aptitude assessment to strengthen your profile", assessmentKind: "intelligences" });
  }
  if (missingDims.has("PERSONALITY")) {
    actions.push({ label: "Complete the personality assessment", assessmentKind: "personality" });
  }
  if (missingDims.has("INTEREST")) {
    actions.push({ label: "Share the interests and activities you enjoy", href: "/career-preferences" });
  }
  if (missingDims.has("WORK_ENVIRONMENT")) {
    actions.push({ label: "Share your work-environment preferences", href: "/career-profile" });
  }

  // Always give an exploration step to keep recommendations actionable, and
  // cap the plan at 4 items so nothing important gets dropped.
  const explore: NextAction = { label: "Explore programs and pathway options", href: "/career-library" };
  const capped = actions.slice(0, 3);
  capped.push(explore);
  return capped.slice(0, 4);
}
