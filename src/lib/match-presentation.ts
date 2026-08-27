// Product presentation helpers for match scores and confidence.
// These translate engine output into calm, human-readable language.
// They are presentation conventions, NOT scientific thresholds.

export type MatchTone = "strong" | "good" | "potential" | "explore";

export function getMatchTone(score: number | null | undefined): MatchTone {
  const s = typeof score === "number" && !Number.isNaN(score) ? score : 0;
  if (s >= 80) return "strong";
  if (s >= 65) return "good";
  if (s >= 50) return "potential";
  return "explore";
}

export function matchLabel(score: number | null | undefined): string {
  switch (getMatchTone(score)) {
    case "strong":
      return "Strong match";
    case "good":
      return "Good match";
    case "potential":
      return "Potential match";
    default:
      return "Worth exploring";
  }
}

export function confidenceLabel(confidence: number | null | undefined): string {
  const c = typeof confidence === "number" && !Number.isNaN(confidence) ? confidence : 0;
  if (c >= 70) return "High confidence";
  if (c >= 40) return "Moderate confidence";
  return "Limited evidence";
}

// Tailwind class strings for the match tone (pill + ring accents).
export const MATCH_TONE_CLASSES: Record<MatchTone, { pill: string; ring: string; bar: string; text: string }> = {
  strong: {
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    ring: "stroke-emerald-500",
    bar: "bg-emerald-500",
    text: "text-emerald-600",
  },
  good: {
    pill: "bg-sky-50 text-sky-700 ring-sky-200",
    ring: "stroke-sky-500",
    bar: "bg-sky-500",
    text: "text-sky-600",
  },
  potential: {
    pill: "bg-violet-50 text-violet-700 ring-violet-200",
    ring: "stroke-violet-500",
    bar: "bg-violet-500",
    text: "text-violet-600",
  },
  explore: {
    pill: "bg-slate-100 text-slate-600 ring-slate-200",
    ring: "stroke-slate-400",
    bar: "bg-slate-400",
    text: "text-slate-500",
  },
};
