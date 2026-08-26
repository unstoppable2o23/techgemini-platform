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

export type MatchReason = {
  type: "strength" | "development_area" | "missing_evidence" | "preference_boost" | "hard_constraint";
  dimension?: MatchDimension;
  text: string;
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
  reasons: MatchReason[];
  sourceSummary: string[];
  preferenceBoost: boolean;
};

export type MatchResult = {
  matches: CareerMatch[];
  totalCareersScored: number;
  studentSignalsUsed: number;
  assessmentCoverage: string[];
  hasAssessmentData: boolean;
  disclaimer: string | null;
};
