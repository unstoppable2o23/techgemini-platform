export type CompareRow = {
  key: string;
  label: string;
  getValue: (p: any) => string | number | null | undefined;
};

/**
 * Fixed, documented row order for university comparison.
 * NOT sorted to favor any institution. No aggregate winner row.
 * Every missing value renders as "Not available" — never blank.
 */
export const COMPARISON_ROWS: CompareRow[] = [
  { key: "name", label: "Institution", getValue: (p: any) => p.identity.name || "Not available" },
  {
    key: "location",
    label: "Location",
    getValue: (p: any) => {
      const parts = [
        p.identity.country && p.identity.country !== "Not available" ? p.identity.country : null,
        p.identity.state && p.identity.state !== "Not available" ? p.identity.state : null,
        p.identity.city && p.identity.city !== "Not available" ? p.identity.city : null,
      ].filter(Boolean);
      return parts.length ? parts.join(", ") : "Not available";
    },
  },
  {
    key: "dataset",
    label: "Dataset",
    getValue: (p: any) => (p.identity?.dataset === "indian" ? "India institution" : p.identity?.dataset === "global" ? "International university" : "Not available"),
  },
  { key: "type", label: "Type", getValue: (p: any) => p.identity.type || "Not available" },
  {
    key: "programs",
    label: "Programs",
    getValue: (p: any) => (p.programs.total > 0 ? `${p.programs.total} programs (${p.programs.verifiedCount} verified)` : "Not available"),
  },
  {
    key: "verification",
    label: "Verification",
    getValue: (p: any) => (p.hasVerifiedPrograms ? "✓ Verified program" : "Relevant institution — exact program not yet verified"),
  },
  { key: "freshness", label: "Source Freshness", getValue: (p: any) => p.freshness?.overall || "UNKNOWN" },
  { key: "matchScore", label: "Match Score", getValue: (p: any) => p.studentContext?.matchScore ?? "Not available" },
  { key: "confidence", label: "Confidence", getValue: (p: any) => p.studentContext?.confidenceScore ?? "Not available" },
  {
    key: "reasons",
    label: "Why Recommended",
    getValue: (p: any) =>
      Array.isArray(p.studentContext?.reasons) && p.studentContext.reasons.length
        ? p.studentContext.reasons.slice(0, 2).map((r: any) => (typeof r === "string" ? r : r.text || "")).filter(Boolean).join("; ")
        : "Not available",
  },
  { key: "website", label: "Website", getValue: (p: any) => p.identity.website || "Not available" },
  { key: "qsRank", label: "QS Rank", getValue: (p: any) => p.identity.qsRank ?? "Not available" },
];

export function buildComparison(profiles: any[]): Record<string, any> {
  const institutions = profiles.map((p: any) => ({ id: p.identity.id, name: p.identity.name }));

  const rows = COMPARISON_ROWS.map((row) => {
    const values = profiles.map((p) => {
      const val = row.getValue(p);
      if (val === null || val === undefined || val === "") return "Not available";
      return String(val);
    });
    return {
      key: row.key,
      label: row.label,
      values,
      allUnavailable: profiles.every((p) => {
        const val = row.getValue(p);
        return val === null || val === undefined || val === "" || val === "Not available";
      }),
    };
  });

  return {
    institutions,
    rows,
    rowOrder: COMPARISON_ROWS.map((r) => r.key),
    maxCompare: 4,
    clarifier: "Fit describes how well this matches your profile — not your chance of admission.",
  };
}
