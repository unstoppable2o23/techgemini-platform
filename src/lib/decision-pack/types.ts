/**
 * Phase 30 — Counselling Decision Pack & Student Action Plan (product types).
 *
 * The pack is a DETERMINISTIC, read-only reporting surface:
 *  - it never recomputes career matches, never invents scores/rankings
 *  - it never fabricates fees, cutoffs, seats, placements, scholarships,
 *    admission guarantees, licensing/visa outcomes or employability claims
 *  - every value is derived from the same persisted state the Decision Center
 *    already uses (CareerProgramMapping, VERIFIED Program offers, Roadmap,
 *    shortlist, journey state, counselor planning records)
 *
 * Nothing here is written back. `getDecisionPack` is recomputable: identical
 * persisted state yields byte-identical packs.
 */
import type { PathwayStage } from "../decision-center/center.ts";
import type {
  AdmissionsReadiness,
  AdmissionsVerificationState,
} from "../admissions-intelligence/types.ts";

export type DecisionPackActionType =
  | "PROFILE"
  | "ASSESSMENT"
  | "CAREER"
  | "PROGRAM"
  | "UNIVERSITY"
  | "ROADMAP"
  | "COUNSELOR";

export type DecisionPackPriority = "high" | "medium" | "low";

export type DecisionPackSurveyStage =
  | "Exploring"
  | "Shortlisted"
  | "Preferred"
  | "Discuss With Counselor"
  | "Selected Pathway";

export type ProgramVerification = "VERIFIED" | "PARTIAL" | "NOT_VERIFIED";

export interface DecisionPackAction {
  id: string;
  type: DecisionPackActionType;
  title: string;
  reason: string;
  priority: DecisionPackPriority;
  href: string;
  /** Deterministic completion state — whether the underlying step is already done. */
  done: boolean;
}

export interface DecisionPackAssessmentBlock {
  completed: string[];
  remaining: string[];
  completedCount: number;
  total: number;
}

export interface DecisionPackCareerCard {
  careerId: string;
  careerName: string;
  careerSlug: string | null;
  group: "strong" | "explore" | "more_info";
  status: string;
  supportedByProfile: boolean;
  stage: PathwayStage;
  saved: boolean;
  preferred: boolean;
  topReasons: string[];
  developmentAreas: string[];
  missingEvidence: string[];
  program: {
    programId: string;
    programName: string;
    level: string | null;
    relationshipType: string | null;
    verification: ProgramVerification;
    verifiedInstitutionCount: number;
  } | null;
  detailHref: string | null;
}

export interface DecisionPackEducationPathway {
  kind: "PROGRAM" | "KNOWLEDGE_BASE";
  careerId: string;
  careerName: string;
  programId: string | null;
  programName: string | null;
  level: string | null;
  relationshipType: string | null;
  verification: ProgramVerification;
  verifiedInstitutionCount: number;
  /** Phase 31 — parent-friendly admission guidance for this pathway (PROGRAM rows). */
  admissions: DecisionPackPathwayAdmissions | null;
}

/** Parent-friendly, printable admissions & next-steps for one pathway. */
export interface DecisionPackPathwayAdmissions {
  routes: string[];
  entranceGuidance: string | null;
  eligibilityGuidance: string | null;
  officialSources: Array<{ name: string; url: string }>;
  needsVerification: boolean;
  verificationState: AdmissionsVerificationState;
  note: string;
}

/** Overall admissions-readiness snapshot for the pack cover. */
export interface DecisionPackAdmissionsSummary {
  readiness: AdmissionsReadiness;
  readinessLabel: string;
  pathwayGuidanceCount: number;
  missingInfoCount: number;
}

export interface DecisionPackInstitution {
  institutionId: string;
  institutionName: string;
  institutionKind: string;
  programId: string;
  programName: string;
  qualification: string | null;
  studyMode: string | null;
  duration: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  source: string;
  sourceUrl: string | null;
  verifiedAt: string | null;
  saved: boolean;
}

export interface DecisionPackCurrentDecision {
  stage: DecisionPackSurveyStage;
  decision: { id: string; label: string; detail: string; href: string } | null;
  why: string;
  evidenceStillMissing: Array<{ label: string; detail: string }>;
  recommendedAction: { label: string; href: string } | null;
}

export interface DecisionPackParentSummary {
  whereTheStudentIsNow: string;
  careerDirectionsSupported: string;
  studyPathway: string;
  whatStillNeedsConfirmation: string;
  nextRecommendedStep: string;
  counselorSupport: string;
}

export interface DecisionPackCounselorSummary {
  snapshot: {
    studentName: string;
    educationStageLabel: string | null;
    profileCompleteness: number;
    assessmentCompletedCount: number;
    assessmentTotal: number;
    careerMatchCount: number;
    lowInformation: boolean;
    counselorAssigned: boolean;
    roadmapProgress: number;
    hasCareerDirection: boolean;
  };
  recommendations: {
    topCareerName: string | null;
    strong: string[];
    explore: string[];
    needMoreInformation: string[];
    strongOptionCount: number;
    exploreOptionCount: number;
    moreInformationCount: number;
    shortlistedCareerCount: number;
    shortlistedProgramCount: number;
    shortlistedUniversityCount: number;
    recommendedProgramCount: number;
    verifiedInstitutionCount: number;
  };
  gaps: Array<{ label: string; detail: string }>;
  decisionStage: DecisionPackSurveyStage;
  pathway: {
    careerId: string | null;
    careerName: string | null;
    programId: string | null;
    programName: string | null;
    counselorRecommended: boolean;
    careerChosen: boolean;
    pathwaySelected: boolean;
  };
  recommendedPrograms: Array<{
    programId: string;
    programName: string;
    level: string | null;
    verification: ProgramVerification;
    verifiedInstitutionCount: number;
  }>;
  institutionOptions: DecisionPackInstitution[];
  counselorDecisions: Array<{
    id: string;
    careerId: string;
    careerName: string | null;
    shortlistedCareer: boolean;
    selectedPathway: boolean;
    followUpRequired: boolean;
    counselorRecommendation: string | null;
    studentInterest: boolean;
    createdAt: string;
  }>;
  programPlans: Array<{
    id: string;
    programId: string;
    programName: string | null;
    shortlisted: boolean;
    requiresResearch: boolean;
    studentInterested: boolean;
  }>;
  notes: Array<{ id: string; content: string; type: string; createdAt: string }>;
  openActions: Array<{ id: string; title: string; dueDate: string | null }>;
  discussionTopics: string[];
  nextBestActions: DecisionPackAction[];
  /** Resolves the assigned counselor's display name (or null). */
  counselorName: string | null;
}

export interface DecisionPack {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    gradeLevel: string | null;
    studyLevel: string | null;
    educationStageLabel: string | null;
    targetCountry: string | null;
    preferredIntake: string | null;
    preferredYear: string | null;
    currentProgram: string | null;
    state: string | null;
  };
  snapshot: {
    profileCompleteness: number;
    assessmentCompletedCount: number;
    assessmentTotal: number;
    careerMatchCount: number;
    lowInformation: boolean;
    counselorAssigned: boolean;
    hasCareerDirection: boolean;
  };
  assessments: DecisionPackAssessmentBlock;
  careerDirections: DecisionPackCareerCard[];
  educationPathways: DecisionPackEducationPathway[];
  universityOptions: DecisionPackInstitution[];
  currentDecision: DecisionPackCurrentDecision;
  actionPlan: DecisionPackAction[];
  parentSummary: DecisionPackParentSummary;
  /** Phase 31 — overall admissions-readiness summary for the pack. */
  admissionsSummary: DecisionPackAdmissionsSummary;
  /** Present only in an authorized counselor view. */
  counselor?: DecisionPackCounselorSummary;
  disclaimer: string;
}