/**
 * Phase 33 (P5) — Scholarships.
 *
 * Read-only funding catalog. Amounts and deadlines are NEVER invented: when a
 * scholarship has no verified `amountSummary` or `deadlineDisplay`, the UI
 * shows "Information not available" — never a fabricated figure.
 *
 * `assessScholarshipFit` is a PURE deterministic function that produces honest
 * student-specific interpretation ("Review eligibility", "May apply"), never
 * a guarantee or a rejection verdict.
 */

export const SCHOLARSHIP_PROVIDER_TYPES = [
  "GOVERNMENT",
  "UNIVERSITY",
  "PRIVATE",
  "INTERNATIONAL_ORGANIZATION",
  "OTHER",
] as const;

export type ScholarshipProviderType = (typeof SCHOLARSHIP_PROVIDER_TYPES)[number];

export const SCHOLARSHIP_VERIFICATION_STATES = [
  "VERIFIED",
  "PARTIALLY_VERIFIED",
  "UNVERIFIED",
  "DATA_REQUIRED",
] as const;

export type ScholarshipVerificationState =
  (typeof SCHOLARSHIP_VERIFICATION_STATES)[number];

export const SCHOLARSHIP_VERIFICATION_LABELS: Record<
  ScholarshipVerificationState,
  string
> = {
  VERIFIED: "Verified",
  PARTIALLY_VERIFIED: "Partial — verify details",
  UNVERIFIED: "Not verified",
  DATA_REQUIRED: "Data required",
};

export const SCHOLARSHIP_APPLICATION_ROUTES = [
  "NATIONAL_PORTAL",
  "INSTITUTION_PORTAL",
  "PROVIDER_SITE",
  "OTHER",
] as const;

export const SCHOLARSHIP_APPLICATION_ROUTE_LABELS: Record<string, string> = {
  NATIONAL_PORTAL: "National scholarship portal",
  INSTITUTION_PORTAL: "Institution application portal",
  PROVIDER_SITE: "Official provider website",
  OTHER: "See the official source",
};

export const SCHOLARSHIP_COVERAGE_LABELS: Record<string, string> = {
  Tuition: "Tuition",
  "Maintenance allowance": "Maintenance allowance",
  "Living costs": "Living costs",
  Travel: "Travel",
  "Full-cost": "Full cost",
  Other: "Other",
};

/** Honest fit vocabulary — never an eligibility verdict. */
export type ScholarshipFitStatus =
  | "POTENTIAL_MATCH"
  | "REVIEW_ELIGIBILITY"
  | "MAY_APPLY"
  | "NOT_SURE";

export const SCHOLARSHIP_FIT_LABELS: Record<ScholarshipFitStatus, string> = {
  POTENTIAL_MATCH: "Potential match — review eligibility",
  REVIEW_ELIGIBILITY: "Review eligibility before applying",
  MAY_APPLY: "May apply — verify with the official source",
  NOT_SURE: "Insufficient profile info to assess fit",
};

export interface ScholarshipFitContext {
  educationLevel?: string | null;
  targetCountries?: string[];
  nationality?: string | null;
  targetCourseCategory?: string | null;
}

export interface ScholarshipFit {
  status: ScholarshipFitStatus;
  label: string;
  reasons: string[];
}

const COUNTRIES = (s: string[]): string[] => s.filter((x): x is string => Boolean(x)) as string[];

function hasIntersection(a: string[], b: string[]): boolean {
  const bb = b.map((x) => x.toLowerCase());
  return a.some((x) => bb.includes(x.toLowerCase()));
}

/**
 * Honest, conservative student-specific interpretation. Nothing here is a
 * guarantee: the biggest category of outcome is "review eligibility".
 */
export function assessScholarshipFit(
  scholarship: {
    country: string;
    destinationCountries: string[];
    educationLevels: string[];
    eligibleNationalities: string[];
    courseCategories: string[];
  },
  ctx: ScholarshipFitContext
): ScholarshipFit {
  const reasons: string[] = [];
  const countryPart = scholarship.country === "GLOBAL" ? [] : [scholarship.country];
  const destinations = COUNTRIES([...countryPart, ...scholarship.destinationCountries]);

  const targets = COUNTRIES(ctx.targetCountries ?? []);
  if (targets.length > 0 && destinations.length > 0) {
    if (!hasIntersection(targets, destinations)) {
      reasons.push(
        `Your destination (${targets.join(", ")}) is not in this scholarship's target countries (${destinations.join(", ")}).`
      );
    } else {
      reasons.push(
        `This scholarship targets ${destinations.join(", ")}, which you are considering.`
      );
    }
  }

  if (ctx.educationLevel) {
    const level = String(ctx.educationLevel).toLowerCase();
    const match = scholarship.educationLevels.some((l) =>
      level.includes(l.toLowerCase()) || l.toLowerCase().includes(level)
    );
    if (scholarship.educationLevels.length > 0 && match) {
      reasons.push(`Open to ${scholarship.educationLevels.join(", ")} — matches your education level.`);
    } else if (scholarship.educationLevels.length > 0) {
      reasons.push(
        `Your education level (${ctx.educationLevel}) is outside the listed levels (${scholarship.educationLevels.join(", ")}).`
      );
    }
  }

  if (ctx.nationality && scholarship.eligibleNationalities.length > 0) {
    const ok = scholarship.eligibleNationalities.some(
      (n) => String(n).toLowerCase() === String(ctx.nationality).toLowerCase()
    );
    if (!ok) {
      reasons.push(
        `This scholarship lists eligibility for ${scholarship.eligibleNationalities.join(", ")}, which does not include your nationality (${ctx.nationality}).`
      );
    }
  }

  if (ctx.targetCourseCategory && scholarship.courseCategories.length > 0) {
    if (!hasIntersection([ctx.targetCourseCategory], scholarship.courseCategories)) {
      reasons.push(
        `Your course area (${ctx.targetCourseCategory}) is not in the covered categories (${scholarship.courseCategories.join(", ")}).`
      );
    }
  }

  const hasNegative = reasons.some((r) => /is not in|is outside|not in the covered|does not include|your education level.*is outside/.test(r));
  const hasPositive = reasons.some((r) => /targets|matches your education level/.test(r));

  let status: ScholarshipFitStatus;
  if (ctx.educationLevel || targets.length > 0 || ctx.nationality) {
    status = hasNegative
      ? "REVIEW_ELIGIBILITY"
      : hasPositive
        ? "POTENTIAL_MATCH"
        : "MAY_APPLY";
  } else {
    status = "NOT_SURE";
  }

  if (reasons.length === 0) {
    reasons.push(
      "Not enough profile information to assess fit — eligibility is decided only by the official source."
    );
  }
  reasons.push(
    "Eligibility and application outcomes are never guaranteed — always verify with the official source."
  );

  return { status, label: SCHOLARSHIP_FIT_LABELS[status], reasons };
}

export const NO_AMOUNT = "Information not available";
export const NO_DEADLINE = "Information not available";