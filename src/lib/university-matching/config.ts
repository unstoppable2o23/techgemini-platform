import type { MatchWeights } from "./types.ts";

export const DEFAULT_WEIGHTS: MatchWeights = {
  educationPathway: 0.30,
  specialization: 0.15,
  careerAlignment: 0.10,
  academicFit: 0.15,
  location: 0.10,
  country: 0.05,
  budget: 0.05,
  institutionQuality: 0.05,
  studentPreferences: 0.05,
};

/**
 * Merge caller-supplied weights with defaults and renormalize so the sum is 1.
 * This keeps the weights configurable without breaking the 0-100 scoring scale.
 */
export function normalizeWeights(overrides: Partial<MatchWeights> = {}): MatchWeights {
  const merged: MatchWeights = { ...DEFAULT_WEIGHTS, ...overrides };
  const sum = Object.values(merged).reduce((a, b) => a + b, 0);
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  const out = {} as MatchWeights;
  (Object.keys(merged) as (keyof MatchWeights)[]).forEach((k) => {
    out[k] = merged[k] / sum;
  });
  return out;
}
