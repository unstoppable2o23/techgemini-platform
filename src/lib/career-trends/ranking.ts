import type {
  PersonalizedTrendItem,
  TrendClassification,
  TrendRecord,
} from "./types.ts";
import type { DemandIndicator } from "./types.ts";

const DEMAND_RANK: Record<DemandIndicator, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  UNKNOWN: 0,
};

/**
 * Sorts trend records by trend score (desc), then demand strength, then name.
 * Pure and deterministic.
 */
export function rankTrends(trends: TrendRecord[]): TrendRecord[] {
  return [...trends].sort((a, b) => {
    if (b.trendScore !== a.trendScore) return b.trendScore - a.trendScore;
    const da = DEMAND_RANK[a.demandIndicator ?? "UNKNOWN"];
    const db = DEMAND_RANK[b.demandIndicator ?? "UNKNOWN"];
    if (db !== da) return db - da;
    return a.career.name.localeCompare(b.career.name);
  });
}

/**
 * Combines existing personalized career matches (Phase 4) with trend data,
 * keeping the two scores strictly separate. The "foryou" view ranks by the
 * match score; the "trending" view ranks by the trend score. Trend data never
 * overwrites the Phase 4 matchScore.
 */
export function rankPersonalized(
  items: PersonalizedTrendItem[],
  view: "foryou" | "trending"
): PersonalizedTrendItem[] {
  const sorted = [...items].sort((a, b) => {
    if (view === "trending") {
      const ta = a.trendScore ?? -1;
      const tb = b.trendScore ?? -1;
      if (tb !== ta) return tb - ta;
      return b.matchScore - a.matchScore;
    }
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    const ta = a.trendScore ?? -1;
    const tb = b.trendScore ?? -1;
    return tb - ta;
  });
  return sorted;
}

export function classifyItem(
  item: Pick<
    PersonalizedTrendItem,
    "classifications"
  >
): TrendClassification[] {
  return item.classifications;
}
