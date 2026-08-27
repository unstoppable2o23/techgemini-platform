import type { TrendSource } from "./types.ts";

export const CURRENT_PERIOD = new Date().getFullYear().toString();
export const DEFAULT_REGION = "GLOBAL";

export const SYSTEM_DERIVED_METHODOLOGY =
  "Trend classification is derived from existing career metadata (demandLevel, jobGrowth, isEmerging, futureOutlook). It is a system-derived signal, not verified external market data, and does not guarantee future employment or salary outcomes.";

export const SYSTEM_DERIVED_LIMITATIONS = [
  "Classification is derived from existing career metadata, not a live labour-market feed.",
  "This is a directional signal and does not guarantee employment, salary, or admission outcomes.",
];

export const NO_TREND_LIMITATIONS = [
  "No trend data has been computed for this career yet.",
];

export const GLOBAL_LIMITATION =
  "Trend signals are aggregated globally unless a specific region is requested.";

/**
 * Relative trust weight for ranking when multiple trend sources exist for a
 * career. Higher weight wins. Official and public data outrank editorial and
 * system-derived signals.
 */
export const SOURCE_WEIGHTS: Record<TrendSource, number> = {
  OFFICIAL: 100,
  PUBLIC_DATA: 90,
  EDITORIAL: 60,
  MANUAL: 50,
  SYSTEM_DERIVED: 30,
};

export const CLASSIFICATION_THRESHOLDS = {
  fastGrowingGrowthScore: 35,
  trendingDemand: "HIGH",
};

export function sourceWeight(source: TrendSource | null | undefined): number {
  if (!source) return 0;
  return SOURCE_WEIGHTS[source] ?? 0;
}
