/**
 * Source freshness for verified programs and profile elements.
 * Documented constants, not magic numbers scattered in code.
 * Freshness is computed at read time from verifiedAt.
 * Stale data is shown WITH its age — never silently.
 */

export type Freshness = "CURRENT" | "RECENT" | "HISTORICAL" | "UNKNOWN";

export const FRESHNESS_THRESHOLDS = {
  /** ≤ 12 months → CURRENT */
  CURRENT_MONTHS: 12,
  /** ≤ 24 months → RECENT, >24 → HISTORICAL */
  RECENT_MONTHS: 24,
} as const;

export function computeFreshness(verifiedAt: Date | string | null | undefined): Freshness {
  if (!verifiedAt) return "UNKNOWN";
  const date = verifiedAt instanceof Date ? verifiedAt : new Date(verifiedAt);
  if (isNaN(date.getTime())) return "UNKNOWN";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
  if (diffMonths <= FRESHNESS_THRESHOLDS.CURRENT_MONTHS) return "CURRENT";
  if (diffMonths <= FRESHNESS_THRESHOLDS.RECENT_MONTHS) return "RECENT";
  return "HISTORICAL";
}

export function freshnessLabel(freshness: Freshness, verifiedAt?: Date | string | null): string {
  if (freshness === "UNKNOWN") return "UNKNOWN — no verifiable date";
  if (!verifiedAt) return freshness;
  const date = verifiedAt instanceof Date ? verifiedAt : new Date(verifiedAt);
  const formatted = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return `${freshness} — verified ${formatted}`;
}

export function freshnessBadgeProps(freshness: Freshness): { variant: "default" | "secondary" | "outline" | "destructive"; label: string } {
  switch (freshness) {
    case "CURRENT":
      return { variant: "default", label: "Current" };
    case "RECENT":
      return { variant: "secondary", label: "Recent" };
    case "HISTORICAL":
      return { variant: "outline", label: "Historical" };
    case "UNKNOWN":
    default:
      return { variant: "outline", label: "Unknown" };
  }
}
