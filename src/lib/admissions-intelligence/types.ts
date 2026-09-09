/**
 * Phase 31 — Admissions & Counselling Intelligence V1 (product types).
 *
 * This layer is EVIDENCE-FIRST and READ-ONLY:
 *  - it answers which admission route / entrance / counselling process *likely*
 *    applies, which OFFICIAL source to check, what is known, what is unknown
 *    and what the student should do next
 *  - it NEVER predicts admission outcomes (no cutoffs, deadlines, probabilities,
 *    ranks, seats or eligibility verdicts) and NEVER submits applications,
 *    registrations, payments or document uploads
 *  - UNKNOWN is a first-class state. Missing information is surfaced as
 *    "unknown — verify with official sources", never flipped into "No".
 *
 * Everything is deterministic: identical inputs yield byte-identical output.
 */

/** Classified admission routes a program may follow. */
export type AdmissionRoute =
  | "DIRECT_INSTITUTION_APPLICATION"
  | "NATIONAL_ENTRANCE"
  | "STATE_ENTRANCE"
  | "CENTRAL_COUNSELLING"
  | "STATE_COUNSELLING"
  | "UNIVERSITY_COUNSELLING"
  | "PORTFOLIO"
  | "MERIT_BASED"
  | "INTERVIEW"
  | "QUALIFICATION_REVIEW"
  | "UNKNOWN";

/**
 * How much of the admission picture is actually established.
 * UNKNOWN is preferred over guessing; NOT_VERIFIED means a classification
 * exists but no official source was provided yet.
 */
export type AdmissionsVerificationState =
  | "VERIFIED"
  | "PARTIALLY_VERIFIED"
  | "SOURCE_AVAILABLE"
  | "NOT_VERIFIED"
  | "UNKNOWN";

export type OfficialSourceType =
  | "EXAM_AUTHORITY"
  | "COUNSELLING_AUTHORITY"
  | "UNIVERSITY"
  | "GOVERNMENT"
  | "REGULATOR";

/** Stable official source registry entry — official domains only. */
export interface OfficialSource {
  id: string;
  name: string;
  /** Official domain (no protocol) — used for display + validation. */
  domain: string;
  /** Canonical public URL to open. */
  canonicalUrl: string;
  /** One-line description of this body's admissions-relevant role. */
  purpose: string;
  sourceType: OfficialSourceType;
  /** e.g. "National (India)", "State (India)", "Per-institution". */
  jurisdiction: string;
  active: boolean;
}

export interface AdmissionRouteSummary {
  route: AdmissionRoute;
  label: string;
}

export interface EntranceExamGuidance {
  name: string;
  /** Vetted, conservative context for that exam (which programs/scope). */
  context: string;
}

/** Per-program admissions guidance — the atomic evidence record. */
export interface ProgramAdmissionGuidance {
  programId: string;
  programName: string;
  level: string | null;
  category: string | null;
  /** Classified route(s) — the most likely entry philosophy, not a promise. */
  expectedRoutes: AdmissionRouteSummary[];
  /** Entrance exam(s) attributed to official bodies, only where established. */
  relevantEntranceExams: EntranceExamGuidance[];
  /** Counselling/allocation process wording — institute/state-specific unless known. */
  counsellingProcess: string | null;
  /** Broad eligibility guidance ONLY — truthful, never an eligibility verdict. */
  eligibilityGuidance: string | null;
  /** Official sources to verify against (never fabricated). */
  officialSources: OfficialSource[];
  verificationState: AdmissionsVerificationState;
  /** True when current-year/date-dependent facts must be confirmed separately. */
  needsVerification: boolean;
  /** Surface the things we do NOT know — never renamed into "No". */
  unknownAspects: string[];
  note: string;
  /** Registry "last reviewed" date where the record supports one. */
  lastVerified: string | null;
}

export type AdmissionsReadiness =
  | "READY_TO_RESEARCH"
  | "NEEDS_VERIFICATION"
  | "INFORMATION_MISSING";

export interface AdmissionsMissingInfo {
  id: string;
  label: string;
  detail: string;
}

export interface AdmissionsNextAction {
  id: string;
  label: string;
  detail: string;
  /** "/" for in-app destinations or an official https source. */
  href: string;
  /** Set when href points at an official source. */
  sourceId: string | null;
}

/** Student-level admissions view composed from the Decision Center state. */
export interface StudentAdmissionsGuidance {
  readiness: AdmissionsReadiness;
  readinessLabel: string;
  /** Human-reason for the readiness state. */
  readinessReason: string;
  /** Guidance for each focus program from the decision center. */
  focusPrograms: ProgramAdmissionGuidance[];
  /** What is still unknown / must be verified (deduplicated). */
  missingInformation: AdmissionsMissingInfo[];
  /** Official sources referenced across the focus programs (deduplicated). */
  officialSources: OfficialSource[];
  /** Concrete next actions (research official sources / in-app steps). */
  nextActions: AdmissionsNextAction[];
  generalGuidance: string[];
}