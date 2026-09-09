/**
 * Phase 29 — Personalized Career & Education Decision Center.
 *
 * DOWNSTREAM-ONLY ORCHESTRATION. This module never modifies the frozen Career
 * Matching Engine, never invents scores or rankings, and never fabricates
 * fees/cutoffs/seats/placement/ranking data. Everything it presents is derived
 * from the SAME persisted sources the rest of the app uses:
 *   - Career matches from `getCareerMatches` (the frozen engine)
 *   - Existing CareerProgramMapping rows (PRIMARY/… → AcademicProgram)
 *   - Existing verified institution-offered `Program` rows (VERIFIED only)
 *   - Existing StudentShortlist / StudentRoadmap / journey-state
 *   - Existing CounselorCareerDecision / CounselorProgramPlan
 *
 * The decision state is purely DERIVED (never written). `buildDecisionCenter`
 * is a pure, deterministic function over `DecisionCenterInputs` so tests can
 * exercise every branch without a database; `loadDecisionCenterInputs` is the
 * server loader. "Program VERIFIED vs NOT VERIFIED" is the only
 * verification-style claim made — institution suitability is never claimed
 * from an institution name.
 */
import { prisma } from "../prisma.ts";
import { getCareerMatches } from "../career-matching/engine.ts";
import { getJourneyState } from "../student/journey-state.ts";
import { detectEducationStage } from "../roadmap/education-stage.ts";
import { coversAcademicProgram } from "../program-intelligence/availability.ts";
import { REL_RANK } from "../career-program.ts";
import { buildAdmissionsGuidance } from "../admissions-intelligence/guidance.ts";
import type { StudentAdmissionsGuidance } from "../admissions-intelligence/types.ts";
import type { CareerMatch } from "../career-matching/types.ts";

/* ------------------------------- vocabulary ----------------------------- */

export type CareerOptionGroup =
  | "STRONG"
  | "EXPLORE"
  | "NEEDS_MORE_INFORMATION";

export type CareerOptionStatus =
  | "RECOMMENDED"
  | "SUPPORTED"
  | "EXPLORE"
  | "MORE_INFORMATION_NEEDED"
  | "NOT_VERIFIED";

export type PathwayStage =
  | "Exploring"
  | "Shortlisted"
  | "Preferred"
  | "Discuss With Counselor"
  | "Selected Pathway";

export interface VerifiedProgramOffer {
  /** AcademicProgram id this offer was conservatively matched to. */
  academicProgramId: string;
  programId: string;
  programName: string;
  qualification: string | null;
  studyMode: string | null;
  duration: string | null;
  institutionId: string;
  institutionName: string;
  institutionKind: "UNIVERSITY" | "INDIAN_INSTITUTION";
  country: string | null;
  state: string | null;
  city: string | null;
  source: string;
  sourceUrl: string | null;
  verifiedAt: string | null;
}

export interface ProgramPairing {
  programId: string;
  programName: string;
  level: string | null;
  category: string | null;
  relationshipType: string;
  /** True only when at least one VERIFIED institution offers this program. */
  verified: boolean;
  verifiedInstitutionCount: number;
}

export interface CareerOption {
  careerId: string;
  careerName: string;
  careerSlug: string | null;
  group: CareerOptionGroup;
  status: CareerOptionStatus;
  matchStrength: string;
  matchScore: number;
  confidenceScore: number | null;
  supportedByProfile: boolean;
  topReasons: string[];
  stage: PathwayStage;
  explored: boolean;
  saved: boolean;
  preferred: boolean;
  program: ProgramPairing | null;
}

export interface RecommendedProgram {
  programId: string;
  programName: string;
  level: string | null;
  category: string | null;
  relationshipType: string;
  careerConnections: Array<{ careerId: string; careerName: string }>;
  verified: boolean;
  verifiedInstitutionCount: number;
  studyModes: string[];
  countries: string[];
  saved: boolean;
}

export interface InstitutionOffer {
  academicProgramId: string;
  programName: string;
  qualification: string | null;
  studyMode: string | null;
  duration: string | null;
  institutionId: string;
  institutionName: string;
  institutionKind: "UNIVERSITY" | "INDIAN_INSTITUTION";
  country: string | null;
  state: string | null;
  city: string | null;
  source: string;
  sourceUrl: string | null;
  verifiedAt: string | null;
  saved: boolean;
}

export interface InformationGap {
  id: string;
  label: string;
  detail: string;
  action: { label: string; href: string } | null;
}

export interface DecisionPathwayCard {
  careerId: string | null;
  careerName: string | null;
  programId: string | null;
  programName: string | null;
  universityShortlistCount: number;
  counselorAssigned: boolean;
  counselorRecommended: boolean;
  careerChosen: boolean;
  pathwaySelected: boolean;
}

export interface RoadmapProgressCard {
  exists: boolean;
  percent: number;
  completedCount: number;
  stepCount: number;
  goalProgramName: string | null;
  nextStep: { title: string; category: string; href: string } | null;
}

export interface ParentSummary {
  careerArea: string | null;
  possibleProgram: string | null;
  institutionOptionCount: number;
  destinations: string[];
  nextStep: string | null;
  counselorRecommendation: {
    label: string;
    detail: string;
    tone: "recommended" | "helpful" | "optional";
  };
}

export interface CounselorBrief {
  topCareerName: string | null;
  preferredCareerName: string | null;
  strongOptionCount: number;
  exploreOptionCount: number;
  moreInformationCount: number;
  needsMoreInformation: boolean;
  discussedCareerCount: number;
  unresolvedDecisionCount: number;
  informationGapCount: number;
  shortlistedCareerCount: number;
  shortlistedProgramCount: number;
  shortlistedUniversityCount: number;
  roadmapProgressPercent: number;
  recommendedProgramCount: number;
  verifiedInstitutionCount: number;
  discussWithStudent: boolean;
  reasons: string[];
}

export interface DecisionCenterHeader {
  profileCompleteness: number;
  lowInformation: boolean;
  careerMatchCount: number;
  assessmentCompletedCount: number;
  assessmentTotal: number;
  counselorAssigned: boolean;
  preferredCareerName: string | null;
  educationStageLabel: string | null;
}

export interface DecisionCenterState {
  header: DecisionCenterHeader;
  strongOptions: CareerOption[];
  exploreOptions: CareerOption[];
  moreInfoOptions: CareerOption[];
  recommendedPrograms: RecommendedProgram[];
  institutionOptions: InstitutionOffer[];
  selectedPathway: DecisionPathwayCard;
  informationGaps: InformationGap[];
  nextDecision: {
    id: string;
    category: string;
    label: string;
    detail: string;
    href: string;
  } | null;
  roadmapProgress: RoadmapProgressCard;
  parentSummary: ParentSummary;
  counselorBrief: CounselorBrief;
  /** Phase 31 — evidence-first admissions & counselling intelligence. */
  admissionsGuidance: StudentAdmissionsGuidance;
}

/* ------------------------------- input shape ---------------------------- */

export interface ProgramMappingInput {
  programId: string;
  programName: string;
  level: string | null;
  category: string | null;
  relationshipType: string;
  priority: number;
}

export interface DecisionCenterInputs {
  profileCompleteness: number;
  lowInformation: boolean;
  assessmentCompletedCount: number;
  assessmentTotal: number;
  counselorAssigned: boolean;
  appointmentBooked: boolean;
  preferredCareerId: string | null;
  preferredCareerName: string | null;
  subjectsStudied: string[];
  currentProgram: string | null;
  studyLevel: string | null;
  highestEducation: string | null;
  studyAbroad: string | null;
  targetCountries: string[];
  educationStageLabel: string | null;
  careerMatches: CareerMatch[];
  discussedCareerIds: string[];
  unresolvedDecisionCount: number;
  shortlist: { careers: string[]; programs: string[]; universities: string[] };
  /** Ranked (PRIMARY → …) existing CareerProgramMapping rows per career id. */
  programMappings: Record<string, ProgramMappingInput[]>;
  /** VERIFIED institution offers keyed by AcademicProgram id. */
  verifiedOffersByProgram: Record<string, VerifiedProgramOffer[]>;
  roadmap: {
    exists: boolean;
    progress: number;
    completedCount: number;
    stepCount: number;
    goalCareerId: string | null;
    goalCareerName: string | null;
    goalProgramId: string | null;
    goalProgramName: string | null;
    nextStep: { title: string; category: string } | null;
  } | null;
  nextBestAction: {
    id: string;
    category: string;
    label: string;
    detail: string;
    href: string;
  } | null;
}

/* ------------------------------- pure builders -------------------------- */

const UNDERGRAD_LABELS = new Set([
  "ug",
  "undergraduate",
  "bachelors",
  "bachelor",
  "degree",
  "post-degree",
]);

const POSTGRAD_LABELS = new Set([
  "pg",
  "postgraduate",
  "masters",
  "master",
  "graduate",
]);

const STRENGTH_RANK: Record<string, number> = {
  strong: 0,
  moderate: 1,
  weak: 2,
  development_area: 3,
  missing_evidence: 4,
};

export function rankMappings(
  rows: ProgramMappingInput[]
): ProgramMappingInput[] {
  return [...rows].sort((a, b) => {
    const ra = REL_RANK[a.relationshipType as keyof typeof REL_RANK] ?? 10;
    const rb = REL_RANK[b.relationshipType as keyof typeof REL_RANK] ?? 10;
    if (ra !== rb) return ra - rb;
    if ((a.priority ?? 100) !== (b.priority ?? 100)) {
      return (a.priority ?? 100) - (b.priority ?? 100);
    }
    return (a.programName ?? "").localeCompare(b.programName ?? "");
  });
}

function hasEvidence(m: CareerMatch): boolean {
  return Array.isArray(m.evidence) && m.evidence.length > 0;
}

function matchStrengthOf(m: CareerMatch): string {
  return m.matchStrength ?? (hasEvidence(m) ? "moderate" : "missing_evidence");
}

function topReasonsOf(m: CareerMatch): string[] {
  const out: string[] = [];
  for (const s of m.strengths ?? []) {
    if (typeof s === "string" && s.length) out.push(s);
    if (out.length >= 2) break;
  }
  if (out.length < 2) {
    for (const r of m.reasons ?? []) {
      const text = (r as { text?: string })?.text ?? (typeof r === "string" ? r : "");
      if (text) out.push(text);
      if (out.length >= 2) break;
    }
  }
  return out;
}

function groupAndStatusOf(
  m: CareerMatch,
  lowInformation: boolean
): { group: CareerOptionGroup; status: CareerOptionStatus } {
  const strength = matchStrengthOf(m);
  if (lowInformation || strength === "missing_evidence" || !hasEvidence(m)) {
    return { group: "NEEDS_MORE_INFORMATION", status: "MORE_INFORMATION_NEEDED" };
  }
  if (strength === "strong") return { group: "STRONG", status: "RECOMMENDED" };
  if (strength === "moderate") return { group: "EXPLORE", status: "SUPPORTED" };
  return { group: "EXPLORE", status: "EXPLORE" };
}

function pairingFor(
  careerId: string,
  mappings: Record<string, ProgramMappingInput[]>,
  offers: Record<string, VerifiedProgramOffer[]>
): ProgramPairing | null {
  const ranked = rankMappings(mappings[careerId] ?? []);
  const first = ranked[0];
  if (!first) return null;
  const offerCount = (offers[first.programId] ?? []).length;
  return {
    programId: first.programId,
    programName: first.programName,
    level: first.level ?? null,
    category: first.category ?? null,
    relationshipType: first.relationshipType,
    verified: offerCount > 0,
    verifiedInstitutionCount: offerCount,
  };
}

function stageOf(inputs: DecisionCenterInputs, o: {
  preferred: boolean;
  saved: boolean;
  discussed: boolean;
}): PathwayStage {
  if (o.preferred) {
    const roadmapCareer = inputs.roadmap?.goalCareerId;
    if (roadmapCareer && inputs.preferredCareerId === roadmapCareer) {
      return "Selected Pathway";
    }
    return "Preferred";
  }
  if (o.discussed) return "Discuss With Counselor";
  if (o.saved) return "Shortlisted";
  return "Exploring";
}

function buildCareerOption(
  m: CareerMatch,
  inputs: DecisionCenterInputs,
  lowInformation: boolean
): CareerOption | null {
  const career = m.career ?? {};
  const careerId = m.careerId ?? career.id;
  if (!careerId) return null;
  const { group, status } = groupAndStatusOf(m, lowInformation);
  const pairing = pairingFor(careerId, inputs.programMappings, inputs.verifiedOffersByProgram);
  const preferred = inputs.preferredCareerId === careerId;
  const saved = inputs.shortlist.careers.includes(careerId);
  const discussed = inputs.discussedCareerIds.includes(careerId);
  return {
    careerId,
    careerName: career.name ?? careerId,
    careerSlug: career.slug ?? null,
    group,
    status,
    matchStrength: matchStrengthOf(m),
    matchScore: m.matchScore ?? 0,
    confidenceScore: m.confidenceScore ?? null,
    supportedByProfile: status !== "MORE_INFORMATION_NEEDED",
    topReasons: topReasonsOf(m),
    stage: stageOf(inputs, { preferred, saved, discussed }),
    explored: true,
    saved,
    preferred,
    program: pairing,
  };
}

function sortOptions(list: CareerOption[]): CareerOption[] {
  return [...list].sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return (a.careerName ?? "").localeCompare(b.careerName ?? "");
  });
}

function buildRecommendedPrograms(
  optionsInOrder: CareerOption[],
  inputs: DecisionCenterInputs
): RecommendedProgram[] {
  const seen = new Set<string>();
  const out: RecommendedProgram[] = [];
  const pushFor = (careerId: string, careerName: string) => {
    if (seen.has(careerId)) return;
    seen.add(careerId);
    const ranked = rankMappings(inputs.programMappings[careerId] ?? []);
    const first = ranked[0];
    if (!first) return;
    const existing = out.find((p) => p.programId === first.programId);
    if (existing) {
      existing.careerConnections.push({ careerId, careerName });
      return;
    }
    const offers = inputs.verifiedOffersByProgram[first.programId] ?? [];
    const countrySet = new Set<string>();
    for (const o of offers) countrySet.add(o.country ?? "India");
    out.push({
      programId: first.programId,
      programName: first.programName,
      level: first.level ?? null,
      category: first.category ?? null,
      relationshipType: first.relationshipType,
      careerConnections: [{ careerId, careerName }],
      verified: offers.length > 0,
      verifiedInstitutionCount: offers.length,
      studyModes: Array.from(
        new Set(offers.map((o) => o.studyMode).filter((v): v is string => !!v))
      ).sort(),
      countries: Array.from(countrySet).sort(),
      saved: inputs.shortlist.programs.includes(first.programId),
    });
  };

  for (const o of optionsInOrder) pushFor(o.careerId, o.careerName);

  // The selected (preferred) pathway always contributes its primary program,
  // even when the preferred career sits outside the top matches.
  if (
    inputs.preferredCareerId &&
    !optionsInOrder.some((o) => o.careerId === inputs.preferredCareerId) &&
    inputs.roadmap?.goalProgramId == null
  ) {
    pushFor(inputs.preferredCareerId, inputs.preferredCareerName ?? inputs.preferredCareerId);
  }

  return out.slice(0, 6);
}

function buildInstitutionOptions(
  recommended: RecommendedProgram[],
  inputs: DecisionCenterInputs
): InstitutionOffer[] {
  const out: InstitutionOffer[] = [];
  for (const program of recommended) {
    for (const o of inputs.verifiedOffersByProgram[program.programId] ?? []) {
      out.push({
        academicProgramId: o.academicProgramId,
        programName: o.programName,
        qualification: o.qualification,
        studyMode: o.studyMode,
        duration: o.duration,
        institutionId: o.institutionId,
        institutionName: o.institutionName,
        institutionKind: o.institutionKind,
        country: o.country,
        state: o.state,
        city: o.city,
        source: o.source,
        sourceUrl: o.sourceUrl,
        verifiedAt: o.verifiedAt,
        saved:
          inputs.shortlist.universities.includes(o.institutionId) ||
          inputs.shortlist.programs.includes(o.academicProgramId),
      });
    }
  }
  out.sort((a, b) => {
    if (a.institutionName !== b.institutionName) return a.institutionName.localeCompare(b.institutionName);
    if ((a.country ?? "") !== (b.country ?? "")) return (a.country ?? "").localeCompare(b.country ?? "");
    return a.programName.localeCompare(b.programName);
  });
  return out;
}

function buildGaps(inputs: DecisionCenterInputs): InformationGap[] {
  const gaps: InformationGap[] = [];
  if (inputs.profileCompleteness < 60) {
    gaps.push({
      id: "complete_profile",
      label: "Career profile incomplete",
      detail:
        "A fuller profile powers more accurate matches, programs and universities.",
      action: { label: "Complete profile", href: "/career-preferences" },
    });
    return gaps;
  }

  if (inputs.lowInformation || inputs.careerMatches.length === 0) {
    gaps.push({
      id: "add_match_evidence",
      label: "More evidence needed for personalized matches",
      detail:
        "Add subjects, interests or assessments so the engine can rank careers against your profile.",
      action: { label: "Review matches", href: "/career-matches" },
    });
  }

  if (
    inputs.assessmentTotal > 0 &&
    inputs.assessmentCompletedCount < inputs.assessmentTotal
  ) {
    gaps.push({
      id: "take_assessments",
      label: "Assessment inbox incomplete",
      detail: `${inputs.assessmentTotal - inputs.assessmentCompletedCount} assessment(s) remaining.`,
      action: { label: "Take assessments", href: "/assessments" },
    });
  }

  if (inputs.subjectsStudied.length === 0) {
    gaps.push({
      id: "subjects_needed",
      label: "Subjects not fully entered",
      detail: "Add the subjects you study so program suggestions match your stream.",
      action: { label: "Update subjects", href: "/career-preferences" },
    });
  }

  const level = (inputs.studyLevel ?? "").toLowerCase();
  if (
    !inputs.currentProgram &&
    (UNDERGRAD_LABELS.has(level) || POSTGRAD_LABELS.has(level))
  ) {
    gaps.push({
      id: "current_program_needed",
      label: "Current program not specified",
      detail: "Tell us what you are currently studying to refine your next step.",
      action: { label: "Update education", href: "/career-preferences" },
    });
  }

  if (inputs.studyAbroad === "yes" && inputs.targetCountries.length === 0) {
    gaps.push({
      id: "destination_needed",
      label: "Preferred destination missing",
      detail: "Choose study destinations so we can surface matching institutions.",
      action: { label: "Set destinations", href: "/career-preferences" },
    });
  }

  if (!inputs.preferredCareerId && !inputs.lowInformation) {
    gaps.push({
      id: "select_pathway",
      label: "No career direction selected",
      detail: "Pick the career that will shape your study roadmap.",
      action: { label: "Choose a pathway", href: "/career-matches" },
    });
  }

  return gaps;
}

function buildSelectedPathway(
  optionsInOrder: CareerOption[],
  inputs: DecisionCenterInputs,
  discussWithStudent: boolean
): DecisionPathwayCard {
  const careerId =
    inputs.preferredCareerId ?? inputs.roadmap?.goalCareerId ?? null;
  const careerName =
    inputs.preferredCareerName ??
    inputs.roadmap?.goalCareerName ??
    optionsInOrder[0]?.careerName ??
    null;
  const preferredRanked = rankMappings(
    inputs.programMappings[inputs.preferredCareerId ?? ""] ?? []
  );
  const programId =
    inputs.roadmap?.goalProgramId ?? preferredRanked[0]?.programId ?? null;
  const programName =
    inputs.roadmap?.goalProgramName ?? preferredRanked[0]?.programName ?? null;
  return {
    careerId,
    careerName,
    programId,
    programName,
    universityShortlistCount: inputs.shortlist.universities.length,
    counselorAssigned: inputs.counselorAssigned,
    counselorRecommended: discussWithStudent,
    careerChosen: Boolean(careerId),
    pathwaySelected: Boolean(inputs.preferredCareerId),
  };
}

function buildRoadmapCard(
  inputs: DecisionCenterInputs
): RoadmapProgressCard {
  if (!inputs.roadmap) {
    return {
      exists: false,
      percent: 0,
      completedCount: 0,
      stepCount: 0,
      goalProgramName: null,
      nextStep: null,
    };
  }
  return {
    exists: true,
    percent: inputs.roadmap.progress,
    completedCount: inputs.roadmap.completedCount,
    stepCount: inputs.roadmap.stepCount,
    goalProgramName: inputs.roadmap.goalProgramName,
    nextStep: inputs.roadmap.nextStep
      ? { ...inputs.roadmap.nextStep, href: "/roadmap" }
      : null,
  };
}

function buildParentSummary(
  strongOptions: CareerOption[],
  exploreOptions: CareerOption[],
  informationGaps: InformationGap[],
  nextDecisionLabel: string | null,
  selectedPathway: DecisionPathwayCard,
  inputs: DecisionCenterInputs
): ParentSummary {
  const anchor =
    strongOptions[0] ?? exploreOptions[0] ?? inputs.preferredCareerId
      ? (selectedPathway.careerName ? selectedPathway.careerId : null)
      : null;
  const careerArea =
    inputs.preferredCareerName ??
    (choiceFromAnchor(strongOptions, exploreOptions)?.careerName ?? null);
  const possibleProgram =
    selectedPathway.programName ??
    strongOptions[0]?.program?.programName ??
    null;
  const possibleProgramId =
    selectedPathway.programId ?? strongOptions[0]?.program?.programId ?? null;
  const offers = possibleProgramId
    ? inputs.verifiedOffersByProgram[possibleProgramId] ?? []
    : [];
  const destinations = Array.from(
    new Set(offers.map((o) => o.country ?? "India"))
  )
    .sort()
    .slice(0, 3);

  let tone: "recommended" | "helpful" | "optional" = "optional";
  let label = "Optional";
  if (inputs.counselorAssigned && selectedPathway.counselorRecommended) {
    tone = "recommended";
    label = "Counselor review recommended";
  } else if (selectedPathway.counselorRecommended) {
    tone = "recommended";
    label = "Counselor review recommended";
  } else if (selectedPathway.careerChosen) {
    tone = "helpful";
    label = "A short counselor check-in can confirm priorities";
  }
  void anchor;
  return {
    careerArea,
    possibleProgram,
    institutionOptionCount: offers.length,
    destinations,
    nextStep: nextDecisionLabel ?? "Continue exploring your matches",
    counselorRecommendation: {
      label,
      detail:
        tone === "recommended"
          ? "Connecting with your counselor can help you prioritize the most impactful step."
          : tone === "helpful"
            ? "Not required — an optional second opinion whenever you are ready."
            : "Anything here is optional; revisit anytime.",
      tone,
    },
  };
}

function choiceFromAnchor(
  strong: CareerOption[],
  explore: CareerOption[]
): CareerOption | null {
  return strong[0] ?? explore[0] ?? null;
}

function buildCounselorBrief(
  strongOptions: CareerOption[],
  exploreOptions: CareerOption[],
  moreInfoOptions: CareerOption[],
  recommendedPrograms: RecommendedProgram[],
  institutionOptions: InstitutionOffer[],
  informationGaps: InformationGap[],
  selectedPathway: DecisionPathwayCard,
  roadmapCard: RoadmapProgressCard,
  inputs: DecisionCenterInputs
): CounselorBrief {
  const needsMoreInformation =
    moreInfoOptions.length > 0 || inputs.lowInformation;
  const roadmapMid =
    roadmapCard.exists && roadmapCard.percent > 0 && roadmapCard.percent < 100;
  const discussWithStudent =
    inputs.unresolvedDecisionCount > 0 ||
    needsMoreInformation ||
    informationGaps.length > 0 ||
    (inputs.preferredCareerId !== null &&
      selectedPathway.careerId !== null &&
      roadmapMid);

  const reasons: string[] = [];
  if (inputs.unresolvedDecisionCount > 0) {
    reasons.push("Student has career decisions pending counselor discussion.");
  }
  if (needsMoreInformation) {
    reasons.push("More match evidence is needed before weighing options.");
  }
  if (informationGaps.length > 0) {
    reasons.push(
      "A few profile information gaps could sharpen recommendations."
    );
  }
  if (roadmapMid) {
    reasons.push("Roadmap is mid-progress — confirming the plan is worthwhile.");
  }
  if (inputs.preferredCareerId !== null && reasons.length === 0) {
    reasons.push("Preferred career is set; an early check-in can align goals.");
  }
  if (reasons.length === 0 && selectedPathway.careerId === null) {
    reasons.push("Student has not chosen a career direction yet.");
  }

  return {
    topCareerName:
      strongOptions[0]?.careerName ?? exploreOptions[0]?.careerName ?? null,
    preferredCareerName: inputs.preferredCareerName,
    strongOptionCount: strongOptions.length,
    exploreOptionCount: exploreOptions.length,
    moreInformationCount: moreInfoOptions.length,
    needsMoreInformation,
    discussedCareerCount: inputs.discussedCareerIds.length,
    unresolvedDecisionCount: inputs.unresolvedDecisionCount,
    informationGapCount: informationGaps.length,
    shortlistedCareerCount: inputs.shortlist.careers.length,
    shortlistedProgramCount: inputs.shortlist.programs.length,
    shortlistedUniversityCount: inputs.shortlist.universities.length,
    roadmapProgressPercent: roadmapCard.percent,
    recommendedProgramCount: recommendedPrograms.length,
    verifiedInstitutionCount: institutionOptions.length,
    discussWithStudent,
    reasons,
  };
}

/* --------------------------- pure composing entry ----------------------- */

/**
 * Pure, deterministic composition. No database access. Given identical inputs
 * it returns byte-for-byte identical output (stable sorts everywhere).
 */
export function buildDecisionCenter(inputs: DecisionCenterInputs): DecisionCenterState {
  const options = (inputs.careerMatches ?? [])
    .map((m) => buildCareerOption(m, inputs, inputs.lowInformation))
    .filter((o): o is CareerOption => o !== null);
  const strongOptions = sortOptions(
    options.filter((o) => o.group === "STRONG")
  );
  const exploreOptions = sortOptions(
    options.filter((o) => o.group === "EXPLORE")
  );
  const moreInfoOptions = sortOptions(
    options.filter((o) => o.group === "NEEDS_MORE_INFORMATION")
  );

  const optionsInOrder = [...strongOptions, ...exploreOptions];
  const recommendedPrograms = buildRecommendedPrograms(optionsInOrder, inputs);
  const institutionOptions = buildInstitutionOptions(
    recommendedPrograms,
    inputs
  );
  const informationGaps = buildGaps(inputs);
  const roadmapCard = buildRoadmapCard(inputs);
  const selectedPathway = buildSelectedPathway(
    optionsInOrder,
    inputs,
    false
  );
  const counselorBrief = buildCounselorBrief(
    strongOptions,
    exploreOptions,
    moreInfoOptions,
    recommendedPrograms,
    institutionOptions,
    informationGaps,
    selectedPathway,
    roadmapCard,
    inputs
  );
  const pathwayFinal = buildSelectedPathway(
    optionsInOrder,
    inputs,
    counselorBrief.discussWithStudent
  );
  const nextDecision = inputs.nextBestAction
    ? {
        id: inputs.nextBestAction.id,
        category: inputs.nextBestAction.category,
        label: inputs.nextBestAction.label,
        detail: inputs.nextBestAction.detail,
        href: inputs.nextBestAction.href,
      }
    : options.length === 0
      ? {
          id: "explore_matches",
          category: "DISCOVERY",
          label: "Explore career matches",
          detail: "Start discovering careers that fit your goals.",
          href: "/career-matches",
        }
      : null;

  return {
    header: {
      profileCompleteness: inputs.profileCompleteness,
      lowInformation: inputs.lowInformation,
      careerMatchCount: options.length,
      assessmentCompletedCount: inputs.assessmentCompletedCount,
      assessmentTotal: inputs.assessmentTotal,
      counselorAssigned: inputs.counselorAssigned,
      preferredCareerName: inputs.preferredCareerName,
      educationStageLabel: inputs.educationStageLabel,
    },
    strongOptions,
    exploreOptions,
    moreInfoOptions,
    recommendedPrograms,
    institutionOptions,
    selectedPathway: pathwayFinal,
    informationGaps,
    nextDecision,
    roadmapProgress: roadmapCard,
    parentSummary: buildParentSummary(
      strongOptions,
      exploreOptions,
      informationGaps,
      nextDecision?.label ?? null,
      pathwayFinal,
      inputs
    ),
    counselorBrief,
    admissionsGuidance: buildAdmissionsGuidance({
      focusPrograms: recommendedPrograms.map((p) => ({
        programId: p.programId,
        programName: p.programName,
        level: p.level,
        category: p.category,
      })),
      hasCareerDirection: Boolean(
        pathwayFinal.careerId ?? pathwayFinal.careerName
      ),
      counselorAssigned: inputs.counselorAssigned,
    }),
  };
}

/* -------------------------------- loader -------------------------------- */

const EDUCATION_STAGE_LABELS: Record<string, string> = {
  SCHOOL_CLASS10: "Class 10",
  SCHOOL_CLASS12: "Class 12",
  UNDERGRADUATE: "Undergraduate",
  POSTGRADUATE: "Postgraduate",
  UNKNOWN: null as unknown as string,
};

export async function loadDecisionCenterInputs(
  userId: string,
  opts: { careerMatches?: CareerMatch[] } = {}
): Promise<DecisionCenterInputs | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
  });
  if (!profile) return null;

  let careerMatches = opts.careerMatches ?? [];
  if (careerMatches.length === 0) {
    try {
      const res = await getCareerMatches(userId, { limit: 10 });
      careerMatches = res.matches;
    } catch {
      careerMatches = [];
    }
  }

  const journey = await getJourneyState(userId, { careerMatches });
  const exhaustiveCareerIds = [
    ...new Set([
      ...careerMatches.map((m) => m.careerId ?? m.career?.id).filter(Boolean),
      ...(profile.preferredCareerId ? [profile.preferredCareerId] : []),
    ] as string[]),
  ];

  const [savedRows, decisions, mappingRows, roadmapRow, roadmapSteps, programRows] =
    await Promise.all([
      prisma.studentShortlist.findMany({
        where: { studentId: userId },
        select: { itemType: true, itemId: true },
      }),
      prisma.counselorCareerDecision.findMany({
        where: { studentId: profile.id },
        select: { careerId: true, discussed: true, selectedPathway: true },
      }),
      prisma.careerProgramMapping.findMany({
        where: { careerId: { in: exhaustiveCareerIds }, isActive: true },
        include: {
          program: {
            select: { id: true, name: true, level: true, category: true, isActive: true },
          },
        },
      }),
      prisma.studentRoadmap.findUnique({
        where: { studentId: userId },
        select: {
          goalCareerId: true,
          goalCareerName: true,
          goalProgramId: true,
          goalProgramName: true,
          progress: true,
        },
      }),
      prisma.roadmapStep.findMany({
        where: { roadmap: { studentId: userId } },
        orderBy: { index: "asc" as const },
        select: { title: true, category: true, status: true },
      }),
      prisma.program.findMany({
        where: { verificationStatus: "VERIFIED" },
        include: {
          university: { select: { id: true, name: true, country: true } },
          indianInstitution: {
            select: {
              id: true,
              name: true,
              state: true,
              district: true,
              location: true,
              institutionType: true,
            },
          },
        },
      }),
    ]);

  const careers = savedRows.filter((s) => s.itemType === "CAREER").map((s) => s.itemId);
  const programs = savedRows
    .filter((s) => s.itemType === "PROGRAM" || s.itemType === "EDUCATION")
    .map((s) => s.itemId);
  const universities = savedRows
    .filter((s) => s.itemType === "UNIVERSITY" || s.itemType === "INDIAN_INSTITUTION")
    .map((s) => s.itemId);

  const programMappings: Record<string, ProgramMappingInput[]> = {};
  for (const row of mappingRows) {
    const p = row.program as unknown as { isActive: boolean };
    if (!p.isActive) continue;
    if (!programMappings[row.careerId]) programMappings[row.careerId] = [];
    programMappings[row.careerId].push({
      programId: row.programId,
      programName: row.program.name ?? row.programId,
      level: row.program.level ?? null,
      category: row.program.category ?? null,
      relationshipType: row.relationshipType,
      priority: row.priority ?? 100,
    });
  }

  // Conservative VERIFIED offer bucketing using the existing token-core matcher.
  const candidatePrograms = Array.from(
    new Set(
      Object.values(programMappings)
        .flat()
        .map((m) => m.programId)
    )
  );
  const verifiedOffersByProgram: Record<string, VerifiedProgramOffer[]> = {};
  const academicPrograms = await prisma.academicProgram.findMany({
    where: { id: { in: candidatePrograms }, isActive: true },
    select: { id: true, name: true },
  });
  for (const ap of academicPrograms) {
    const offers: VerifiedProgramOffer[] = [];
    for (const r of programRows as any[]) {
      if (!coversAcademicProgram(ap.name, r.name ?? "")) continue;
      const indian = r.indianInstitution ?? null;
      const univ = r.university ?? null;
      const kind = indian ? "INDIAN_INSTITUTION" : "UNIVERSITY";
      offers.push({
        academicProgramId: ap.id,
        programId: r.id,
        programName: r.name ?? "Untitled program",
        qualification: r.level ?? null,
        studyMode: r.studyMode ?? null,
        duration: r.duration ?? null,
        institutionId: indian?.id ?? univ?.id ?? r.id,
        institutionName: indian?.name ?? univ?.name ?? "Unknown institution",
        institutionKind: kind,
        country: univ?.country ?? null,
        state: indian?.state ?? null,
        city: indian?.location ?? indian?.district ?? null,
        source: r.source ?? "official-website",
        sourceUrl: r.sourceUrl ?? null,
        verifiedAt: r.verifiedAt ? new Date(r.verifiedAt).toISOString() : null,
      });
    }
    offers.sort((a, b) => {
      if (a.institutionName !== b.institutionName) {
        return a.institutionName.localeCompare(b.institutionName);
      }
      return a.programName.localeCompare(b.programName);
    });
    verifiedOffersByProgram[ap.id] = offers;
  }

  const discussedCareerIds = decisions
    .filter((d) => d.discussed || d.selectedPathway)
    .map((d) => d.careerId);
  const unresolvedDecisionCount = decisions.filter((d) => !d.discussed).length;

  const nextRoadmapStep = roadmapSteps.find(
    (s) => s.status === "NOT_STARTED" || s.status === "IN_PROGRESS"
  );
  const stage = detectEducationStage({
    gradeLevel: profile.gradeLevel,
    studyLevel: profile.studyLevel,
    highestEducation: profile.highestEducation,
  });

  return {
    profileCompleteness: journey.profileCompleteness,
    lowInformation: journey.lowInformation,
    assessmentCompletedCount: journey.assessmentCompletedCount,
    assessmentTotal: journey.assessmentTotal,
    counselorAssigned: journey.counselorAssigned,
    appointmentBooked: journey.appointmentBooked,
    preferredCareerId: profile.preferredCareerId ?? null,
    preferredCareerName: profile.preferredCareer ?? null,
    subjectsStudied: profile.subjectsStudied ?? [],
    currentProgram: profile.currentProgram ?? null,
    studyLevel: profile.studyLevel ?? null,
    highestEducation: profile.highestEducation ?? null,
    studyAbroad: profile.studyAbroad ?? null,
    targetCountries: profile.targetCountries ?? [],
    educationStageLabel: EDUCATION_STAGE_LABELS[stage] ?? stage,
    careerMatches,
    discussedCareerIds,
    unresolvedDecisionCount,
    shortlist: { careers, programs, universities },
    programMappings,
    verifiedOffersByProgram,
    roadmap: roadmapRow
      ? {
          exists: journey.roadmapExists,
          progress: journey.roadmapProgress,
          completedCount: journey.roadmapCompletedCount,
          stepCount: journey.roadmapStepCount,
          goalCareerId: roadmapRow.goalCareerId,
          goalCareerName: roadmapRow.goalCareerName,
          goalProgramId: roadmapRow.goalProgramId,
          goalProgramName: roadmapRow.goalProgramName,
          nextStep: nextRoadmapStep
            ? { title: nextRoadmapStep.title, category: nextRoadmapStep.category }
            : null,
        }
      : null,
    nextBestAction: journey.nextBestAction,
  };
}

/**
 * Public entry: loads persisted inputs (one frozen-engine call max) and
 * composes the decision state. Callers that already hold career matches (e.g.
 * the counselor 360) pass them via `opts.careerMatches` to avoid a rerun.
 */
export async function getDecisionCenter(
  userId: string,
  opts: { careerMatches?: CareerMatch[] } = {}
): Promise<DecisionCenterState | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || user.role !== "STUDENT") return null;

  const inputs = await loadDecisionCenterInputs(userId, opts);
  if (!inputs) return null;
  return buildDecisionCenter(inputs);
}