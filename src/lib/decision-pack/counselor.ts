/**
 * Phase 30 — Counselor-facing summary builder (pure + deterministic).
 *
 * Built only when an authorized counselor view is requested. Passes existing
 * counselor planning records through verbatim (never edited, never invented)
 * and adds derived context from the Decision Center state.
 */
import type { DecisionCenterState } from "../decision-center/center.ts";
import type {
  DecisionPackAction,
  DecisionPackCounselorSummary,
  DecisionPackSurveyStage,
} from "./types.ts";

export interface CounselorDecisionRecord {
  id: string;
  careerId: string;
  shortlistedCareer: boolean;
  selectedPathway: boolean;
  followUpRequired: boolean;
  counselorRecommendation: string | null;
  studentInterest: boolean;
  createdAt: Date;
}

export interface ProgramPlanRecord {
  id: string;
  programId: string;
  shortlisted: boolean;
  requiresResearch: boolean;
  studentInterested: boolean;
}

export interface CounselorNoteRecord {
  id: string;
  content: string;
  type: string;
  createdAt: Date;
}

export interface OpenActionRecord {
  id: string;
  title: string;
  dueDate: Date | null;
}

export interface CounselorInput {
  counselorName: string | null;
  careerDecisions: CounselorDecisionRecord[];
  programPlans: ProgramPlanRecord[];
  notes: CounselorNoteRecord[];
  openActions: OpenActionRecord[];
}

export type CounselorSummary = DecisionPackCounselorSummary;

/** Map a Decision Center option group to the pack's qualitative group key. */
export function deriveSurveyStage(
  center: DecisionCenterState
): DecisionPackSurveyStage {
  if (center.selectedPathway.pathwaySelected) return "Selected Pathway";
  if (center.counselorBrief.discussWithStudent) return "Discuss With Counselor";
  if (center.selectedPathway.careerChosen) return "Preferred";
  if (
    center.selectedPathway.counselorRecommended ||
    center.counselorBrief.shortlistedCareerCount > 0
  )
    return "Shortlisted";
  return "Exploring";
}

export function buildCounselorSummary(
  center: DecisionCenterState,
  firstName: string,
  input: CounselorInput,
  careerNameById: Record<string, string>,
  programNameById: Record<string, string>,
  nextBestActions: DecisionPackAction[]
): CounselorSummary {
  return {
    snapshot: {
      studentName: firstName,
      educationStageLabel: center.header.educationStageLabel,
      profileCompleteness: center.header.profileCompleteness,
      assessmentCompletedCount: center.header.assessmentCompletedCount,
      assessmentTotal: center.header.assessmentTotal,
      careerMatchCount: center.header.careerMatchCount,
      lowInformation: center.header.lowInformation,
      counselorAssigned: center.header.counselorAssigned,
      roadmapProgress: center.roadmapProgress.percent,
      hasCareerDirection: Boolean(
        center.selectedPathway.careerId ?? center.selectedPathway.careerName
      ),
    },
    recommendations: {
      topCareerName: center.counselorBrief.topCareerName,
      strong: center.strongOptions.map((o) => o.careerName),
      explore: center.exploreOptions.map((o) => o.careerName),
      needMoreInformation: center.moreInfoOptions.map((o) => o.careerName),
      strongOptionCount: center.counselorBrief.strongOptionCount,
      exploreOptionCount: center.counselorBrief.exploreOptionCount,
      moreInformationCount: center.counselorBrief.moreInformationCount,
      shortlistedCareerCount: center.counselorBrief.shortlistedCareerCount,
      shortlistedProgramCount: center.counselorBrief.shortlistedProgramCount,
      shortlistedUniversityCount: center.counselorBrief.shortlistedUniversityCount,
      recommendedProgramCount: center.counselorBrief.recommendedProgramCount,
      verifiedInstitutionCount: center.counselorBrief.verifiedInstitutionCount,
    },
    gaps: center.informationGaps.map((g) => ({ label: g.label, detail: g.detail })),
    decisionStage: deriveSurveyStage(center),
    pathway: {
      careerId: center.selectedPathway.careerId,
      careerName: center.selectedPathway.careerName,
      programId: center.selectedPathway.programId,
      programName: center.selectedPathway.programName,
      counselorRecommended: center.selectedPathway.counselorRecommended,
      careerChosen: center.selectedPathway.careerChosen,
      pathwaySelected: center.selectedPathway.pathwaySelected,
    },
    recommendedPrograms: center.recommendedPrograms.map((p) => ({
      programId: p.programId,
      programName: p.programName,
      level: p.level ?? null,
      verification: p.verified ? "VERIFIED" : "PARTIAL",
      verifiedInstitutionCount: p.verifiedInstitutionCount,
    })),
    institutionOptions: center.institutionOptions.map((o) => ({
      institutionId: o.institutionId,
      institutionName: o.institutionName,
      institutionKind: o.institutionKind,
      programId: o.academicProgramId,
      programName: o.programName,
      qualification: o.qualification ?? null,
      studyMode: o.studyMode ?? null,
      duration: o.duration ?? null,
      country: o.country ?? null,
      state: o.state ?? null,
      city: o.city ?? null,
      source: o.source,
      sourceUrl: o.sourceUrl ?? null,
      verifiedAt: o.verifiedAt ?? null,
      saved: o.saved,
    })),
    counselorDecisions: input.careerDecisions.map((d) => ({
      id: d.id,
      careerId: d.careerId,
      careerName: careerNameById[d.careerId] ?? d.careerId,
      shortlistedCareer: d.shortlistedCareer ?? false,
      selectedPathway: d.selectedPathway ?? false,
      followUpRequired: d.followUpRequired ?? false,
      counselorRecommendation: d.counselorRecommendation ?? null,
      studentInterest: d.studentInterest ?? false,
      createdAt: d.createdAt.toISOString(),
    })),
    programPlans: input.programPlans.map((p) => ({
      id: p.id,
      programId: p.programId,
      programName: programNameById[p.programId] ?? p.programId,
      shortlisted: p.shortlisted ?? false,
      requiresResearch: p.requiresResearch ?? false,
      studentInterested: p.studentInterested ?? false,
    })),
    notes: input.notes.map((n) => ({
      id: n.id,
      content: n.content,
      type: n.type,
      createdAt: n.createdAt.toISOString(),
    })),
    openActions: input.openActions.map((a) => ({
      id: a.id,
      title: a.title,
      dueDate: a.dueDate ? a.dueDate.toISOString() : null,
    })),
    discussionTopics: center.counselorBrief.reasons,
    nextBestActions,
    counselorName: input.counselorName,
  };
}