import type { TraitDimension } from "@prisma/client";

export type MatchDimension = TraitDimension;

export type CareerMatchInput = {
  dimension: MatchDimension;
  value: string;
  score: number; // 0-100
  confidence: number; // 0-1
  sourceType: string;
  sourceAssessment: string | null;
};

export type CareerTraitData = {
  dimension: MatchDimension;
  value: string;
  weight: number;
};

export type CareerEducationPath = {
  degreeName: string | null;
  specializationName: string | null;
  priority: string;
};

export type CareerCandidate = {
  id: string;
  name: string;
  slug: string;
  title: string;
  category: string | null;
  subcategory: string | null;
  shortDescription: string | null;
  demandLevel: string;
  jobGrowth: string;
  salaryEntry: string;
  salarySenior: string;
  minStudyLevel: string | null;
  isEmerging: boolean;
  technicalSkills: string[];
  softSkills: string[];
  interests: string[];
  personalityTraits: string[];
  recommendedDegrees: string[];
  recommendedSubjects: string[];
  traits: CareerTraitData[];
  educationPaths?: CareerEducationPath[];
};

export type DimensionScore = {
  dimension: MatchDimension;
  score: number; // 0-100
  matchedCount: number;
  totalTraits: number;
  matchedValues: string[];
  unmatchedTraitValues: string[];
};

export type MatchStrength = "strong" | "moderate" | "weak" | "development_area" | "missing_evidence";

/**
 * How a student signal matched a career trait.
 * Hierarchy: CANONICAL > ALIAS > STRUCTURED > LEXICAL > NONE.
 * NONE is returned when nothing matched and is not stored as evidence.
 */
export type MatchType = "CANONICAL" | "ALIAS" | "STRUCTURED" | "LEXICAL" | "NONE";

/**
 * A single piece of matched evidence between a student signal and a career trait.
 */
export type MatchEvidence = {
  dimension: MatchDimension;
  studentValue: string;
  careerTraitValue: string;
  strength: number; // 0-1, from the match tier
  matchType: MatchType;
  sourceType: string;
};

/**
 * Distinguishes honest reasons why a dimension is not a confirmed strength.
 * - MISSING_EVIDENCE: no student data for this dimension yet.
 * - DEVELOPMENT_AREA: we have student evidence, but it does not align with
 *   the career's requirements (plausible room to grow).
 * - VERIFIED_GAP: we have reliable student evidence in this dimension that
 *   conflicts with the career's requirements.
 */
export type EvidenceType = "MISSING_EVIDENCE" | "DEVELOPMENT_AREA" | "VERIFIED_GAP";

export type MatchReason = {
  type: "strength" | "development_area" | "missing_evidence" | "preference_boost" | "hard_constraint";
  dimension?: MatchDimension;
  text: string;
  evidenceType?: EvidenceType;
};

export type ConfidenceLevel = "LOW" | "MODERATE" | "HIGH";

export type ConfidenceResult = {
  score: number; // 0-1
  level: ConfidenceLevel;
  factors: {
    matchedSignals: number;
    dimensionsMatched: number;
    sourceDiversity: number;
    assessmentEvidence: boolean;
    coverage: number; // 0-1 — matched career trait dimensions / career trait dimensions
    cappedLow: boolean; // true when a guard (e.g. preferred-career-only) capped confidence
  };
};

export type SupportedDimensionInfo = {
  dimension: MatchDimension;
  score: number;
  matchedCount: number;
};

/**
 * Internal structured trace of a single match. Not student-facing by default;
 * API routes strip it before returning responses.
 */
export type MatchTrace = {
  careerId: string;
  totalScore: number;
  confidence: number;
  supportedDimensions: SupportedDimensionInfo[];
  weakDimensions: SupportedDimensionInfo[];
  unsupportedDimensions: MatchDimension[];
  matchedSignals: number;
  matchTypes: MatchType[];
  preferredCareerMatch: boolean;
  preferredCareerSource: string | null;
};

export type CareerMatch = {
  careerId: string;
  career: {
    id: string;
    name: string;
    slug: string;
    title: string;
    category: string | null;
    shortDescription: string | null;
    demandLevel: string;
    salaryEntry: string;
    isEmerging: boolean;
  };
  matchScore: number;
  confidenceScore: number;
  matchStrength: MatchStrength;
  dimensionScores: DimensionScore[];
  strengths: string[];
  developmentAreas: string[];
  missingEvidence: string[];
  verifiedGaps: string[];
  reasons: MatchReason[];
  sourceSummary: string[];
  preferenceBoost: boolean;
  evidence: MatchEvidence[];
  matchTypes: MatchType[];
  confidenceDetail: ConfidenceResult;
  supportedDimensions: number;
  trace: MatchTrace;
};

export type MatchResult = {
  matches: CareerMatch[];
  totalCareersScored: number;
  studentSignalsUsed: number;
  assessmentCoverage: string[];
  hasAssessmentData: boolean;
  disclaimer: string | null;
  /**
   * True when the engine found no meaningful evidence to rank against (e.g. a
   * near-empty profile, or preferred-career-only with an unresolved preference
   * and no evidence). Products should present a "not enough information yet"
   * state rather than an arbitrary alphabetical list of careers.
   */
  lowInformation: boolean;
  /**
   * The highest match strength tier observed across scored careers. Useful for
   * quieting recommendations that are all exploration/weak.
   */
  topMatchStrength: CareerMatch["matchStrength"];
};