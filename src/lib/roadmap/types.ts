/**
 * Phase 21 — Roadmap domain types.
 *
 * These are the shape types for the roadmap generation and service layers.
 * They mirror the Prisma models but add the generated-in-memory step contract.
 */
import type { RoadmapEducationStage, RoadmapPathType, RoadmapStepCategory, RoadmapStepOrigin, RoadmapStepStatus, RoadmapPriority, RoadmapTimeHorizon } from "@prisma/client";

export type {
  RoadmapEducationStage,
  RoadmapPathType,
  RoadmapStepCategory,
  RoadmapStepOrigin,
  RoadmapStepStatus,
  RoadmapPriority,
  RoadmapTimeHorizon,
};

export type DestinationLabel =
  | "INDIA"
  | "USA"
  | "UK"
  | "CANADA"
  | "AUSTRALIA"
  | "GERMANY"
  | "IRELAND"
  | "NEW_ZEALAND";

export type RequirementConfidence = "REQUIRED" | "RECOMMENDED" | "MAY_APPLY" | "CHECK";

export interface ApplicationSystem {
  label: string;
  detail: string;
}

export type ApplicationSystems = Record<DestinationLabel, ApplicationSystem>;

export interface RequirementQuestion {
  id: string;
  label: string;
  confidence: RequirementConfidence;
  text: string;
}

export interface CountryPathwayConfig {
  id: DestinationLabel;
  label: string;
  applicationSystem: ApplicationSystem;
  englishTest?: { confidence: RequirementConfidence };
  standardized?: { confidence: RequirementConfidence };
  visaStage?: { confidence: RequirementConfidence };
  scholarshipStage?: { confidence: RequirementConfidence };
  documentVerification?: { confidence: RequirementConfidence };
  credential?: { confidence: RequirementConfidence };
}

/** Inputs the generator reads (from the frozen engine + StudentProfile). */
export interface RoadmapInputs {
  userId: string;
  goalCareerId?: string | null;
  goalCareerName?: string | null;
  topCareerId?: string | null;
  topCareerName?: string | null;
  preferredCareer?: string | null;
  destination?: string | null;
  destinationLabel?: DestinationLabel | null;
  educationStage: RoadmapEducationStage;
  gradeLevel?: string | null;
  studyLevel?: string | null;
  highestEducation?: string | null;
  averageGrade?: string | null;
  tuitionBudget?: string | null;
  exams: string[];
  subjectsStudied: string[];
  subjectsEnjoyed: string[];
  recommendedDegrees: string[];
  recommendedCareerNames: string[];
  recommendedSubjects: string[];
  programNames: string[];
  institutionNames: string[];
  targetIntake?: string | null;
  targetYear?: string | null;
}

/** A single step produced by the generator (pre-persist). */
export interface RoadmapStepSpec {
  title: string;
  description: string;
  category: RoadmapStepCategory;
  priority: RoadmapPriority;
  timeHorizon: RoadmapTimeHorizon;
  status: RoadmapStepStatus;
  reason?: string;
  dependency?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  pathType?: RoadmapPathType;
  educationLevel?: string;
  origin: RoadmapStepOrigin;
  index: number;
  dueHint?: string;
}

export interface RoadmapMilestoneSpec {
  key: string;
  label: string;
  index: number;
}

export interface GeneratedRoadmap {
  version: number;
  goalCareerId?: string | null;
  goalCareerName?: string | null;
  destination?: string | null;
  destinationLabel?: DestinationLabel | null;
  pathType?: RoadmapPathType;
  educationStage: RoadmapEducationStage;
  currentStage?: string;
  progress: number;
  steps: RoadmapStepSpec[];
  milestones: RoadmapMilestoneSpec[];
  snapshot: Record<string, unknown>;
}

export const MILESTONE_ORDER = ["NOW", "NEXT_3_MONTHS", "NEXT_6_12_MONTHS", "APPLICATION", "TARGET"] as const;

/** User-facing labels for milestones. */
export const MILESTONE_LABELS: Record<string, string> = {
  NOW: "Do this now",
  NEXT_3_MONTHS: "Next 3 months",
  NEXT_6_12_MONTHS: "Next 6–12 months",
  APPLICATION: "Application phase",
  TARGET: "Reaching your goal",
};