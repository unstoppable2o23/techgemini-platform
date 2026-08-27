import type {
  DemandIndicator,
  TrendClassification,
} from "./types.ts";
import { CLASSIFICATION_THRESHOLDS } from "./config.ts";

export function normalizeDemandLevel(value: unknown): DemandIndicator {
  if (typeof value !== "string") return "UNKNOWN";
  const v = value.trim().toUpperCase();
  if (v === "HIGH" || v === "H" || v === "STRONG") return "HIGH";
  if (v === "MEDIUM" || v === "MED" || v === "MODERATE" || v === "M") return "MEDIUM";
  if (v === "LOW" || v === "L" || v === "WEAK") return "LOW";
  return "UNKNOWN";
}

/**
 * Extracts a numeric growth percentage from free-text jobGrowth values such as
 * "+40%", "40%", "35" or "up to 50%". Returns null when no number is present.
 */
export function parseGrowthPercent(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  if (Number.isNaN(n)) return null;
  return n;
}

export function growthScore(jobGrowth: unknown): number {
  const pct = parseGrowthPercent(jobGrowth);
  if (pct === null) return 50;
  return Math.max(0, Math.min(100, pct));
}

export function demandScore(demandLevel: unknown): number {
  const indicator = normalizeDemandLevel(demandLevel);
  switch (indicator) {
    case "HIGH":
      return 100;
    case "MEDIUM":
      return 60;
    case "LOW":
      return 30;
    default:
      return 50;
  }
}

export function futureScore(futureOutlook: unknown): number {
  if (typeof futureOutlook === "string" && futureOutlook.trim().length > 0) {
    return 80;
  }
  return 50;
}

/**
 * Transparent, deterministic 0-100 trend score derived from existing career
 * metadata. This is explicitly a system-derived signal and is documented as
 * such; it must never be presented as a probability.
 */
export function computeTrendScore(input: {
  demandLevel: unknown;
  jobGrowth: unknown;
  isEmerging?: boolean;
  futureOutlook?: unknown;
}): number {
  const d = demandScore(input.demandLevel);
  const g = growthScore(input.jobGrowth);
  const e = input.isEmerging ? 100 : 0;
  const f = futureScore(input.futureOutlook);
  const raw = 0.4 * d + 0.3 * g + 0.15 * e + 0.15 * f;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function determineClassifications(input: {
  demandLevel: unknown;
  jobGrowth: unknown;
  isEmerging?: boolean;
  futureOutlook?: unknown;
}): TrendClassification[] {
  const classifications: TrendClassification[] = [];
  const g = growthScore(input.jobGrowth);
  const demand = normalizeDemandLevel(input.demandLevel);
  const emerging = Boolean(input.isEmerging);
  const futureFacing =
    demand === "HIGH" ||
    (typeof input.futureOutlook === "string" &&
      input.futureOutlook.trim().length > 0);

  if (emerging) classifications.push("EMERGING");
  if (g >= CLASSIFICATION_THRESHOLDS.fastGrowingGrowthScore) {
    classifications.push("FAST_GROWING");
  }
  if (futureFacing) classifications.push("FUTURE");
  if (demand === CLASSIFICATION_THRESHOLDS.trendingDemand && (emerging || g >= 35 || futureFacing)) {
    classifications.push("TRENDING");
  }
  return classifications;
}

export function hasClassification(
  classifications: TrendClassification[],
  type: TrendClassification
): boolean {
  return classifications.includes(type);
}
