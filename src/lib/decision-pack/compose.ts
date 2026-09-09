/**
 * Phase 30 — Decision Pack composition (pure + deterministic).
 *
 * `composeDecisionPack` folds already-computed Decision Center state plus small
 * profile/assessment inputs into the final Decision Pack. It is a pure
 * function (no DB, no I/O, no clock) so it mirrors the Decision Center's
 * `buildDecisionCenter` and is exercised without a database.
 *
 * Guardrails honored here:
 *  - never invents numeric fit/score claims (qualitative vocabulary only)
 *  - program/degree availability stays VERIFIED / PARTIAL / NOT_VERIFIED
 *  - medical careers keep their distinct program identity (MBBS/BDS/…)
 *  - diplomas never become degrees
 *  - missing evidence is surfaced honestly, never hidden
 */
import type { CareerMatch } from "../career-matching/types.ts";
import type { DecisionCenterState, InformationGap } from "../decision-center/center.ts";
import { buildDecisionPackActions, nextDecisionReason } from "./actions.ts";
import { buildCounselorSummary, deriveSurveyStage } from "./counselor.ts";
import type { CounselorInput } from "./counselor.ts";
import { focusProgramAdmission } from "../admissions-intelligence/guidance.ts";
import type {
  DecisionPack,
  DecisionPackAdmissionsSummary,
  DecisionPackCareerCard,
  DecisionPackCurrentDecision,
  DecisionPackEducationPathway,
  DecisionPackParentSummary,
  DecisionPackPathwayAdmissions,
} from "./types.ts";

export interface DecisionPackAssessmentInput {
  completed: string[];
  remaining: string[];
  completedCount: number;
  total: number;
}

export interface DecisionPackStudentInput {
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
}

export interface DecisionPackCatalogRow {
  careerId: string;
  careerName: string;
  degreeName: string;
  degreeLevel: string | null;
  priority: string;
}

export interface DecisionPackInputs {
  student: DecisionPackStudentInput;
  assessments: DecisionPackAssessmentInput;
  careerMatches: CareerMatch[];
  center: DecisionCenterState;
  catalog: DecisionPackCatalogRow[];
  careerNameById: Record<string, string>;
  programNameById: Record<string, string>;
  counselor?: CounselorInput | null;
}

const VERIFICATION_RANK = { VERIFIED: 0, PARTIAL: 1, NOT_VERIFIED: 2 } as const;

interface CareerOptionFragment {
  careerId: string;
  careerName: string;
  careerSlug: string | null;
  group: "strong" | "explore" | "more_info";
  status: string;
  supportedByProfile: boolean;
  stage: DecisionPackCareerCard["stage"];
  saved: boolean;
  preferred: boolean;
  topReasons: string[];
  program: DecisionCenterState["strongOptions"][number]["program"];
}

function toPackCareer(
  option: CareerOptionFragment,
  matchById: Map<string, CareerMatch>
): DecisionPackCareerCard {
  const match = matchById.get(option.careerId);
  return {
    careerId: option.careerId,
    careerName: option.careerName,
    careerSlug: option.careerSlug,
    group: option.group,
    status: option.status,
    supportedByProfile: option.supportedByProfile,
    stage: option.stage,
    saved: option.saved,
    preferred: option.preferred,
    topReasons: option.topReasons ?? [],
    developmentAreas: match?.developmentAreas ?? [],
    missingEvidence: match?.missingEvidence ?? [],
    program: option.program
      ? {
          programId: option.program.programId,
          programName: option.program.programName,
          level: option.program.level,
          relationshipType: option.program.relationshipType,
          verification: option.program.verified ? "VERIFIED" : "PARTIAL",
          verifiedInstitutionCount: option.program.verifiedInstitutionCount,
        }
      : null,
    detailHref: option.careerSlug
      ? `/career-library/${option.careerSlug}`
      : null,
  };
}

function toFragment(
  o: DecisionCenterState["strongOptions"][number],
  group: CareerOptionFragment["group"]
): CareerOptionFragment {
  return {
    careerId: o.careerId,
    careerName: o.careerName,
    careerSlug: o.careerSlug,
    group,
    status: o.status,
    supportedByProfile: o.supportedByProfile,
    stage: o.stage,
    saved: o.saved,
    preferred: o.preferred,
    topReasons: o.topReasons,
    program: o.program,
  };
}

function buildCareerDirections(
  center: DecisionCenterState,
  careerMatches: CareerMatch[]
): DecisionPackCareerCard[] {
  const matchById = new Map(careerMatches.map((m) => [m.careerId, m]));
  const options: CareerOptionFragment[] = [
    ...center.strongOptions.map((o) => toFragment(o, "strong")),
    ...center.exploreOptions.map((o) => toFragment(o, "explore")),
    ...center.moreInfoOptions.map((o) => toFragment(o, "more_info")),
  ];
  return options.map((o) => toPackCareer(o, matchById));
}

function buildCurrentDecision(
  center: DecisionCenterState
): DecisionPackCurrentDecision {
  const stage = deriveSurveyStage(center);
  const decision = center.nextDecision
    ? {
        id: center.nextDecision.id,
        label: center.nextDecision.label,
        detail: center.nextDecision.detail,
        href: center.nextDecision.href,
      }
    : null;
  const why =
    center.counselorBrief.discussWithStudent &&
    center.nextDecision?.id !== "review_with_counselor"
      ? `${nextDecisionReason(center.nextDecision?.id ?? null)} A counselor discussion is also recommended.`
      : nextDecisionReason(center.nextDecision?.id ?? null);
  return {
    stage,
    decision,
    why,
    evidenceStillMissing: center.informationGaps.map((g: InformationGap) => ({
      label: g.label,
      detail: g.detail,
    })),
    recommendedAction: decision
      ? { label: decision.label, href: decision.href }
      : null,
  };
}

function buildParentSummary(
  center: DecisionCenterState,
  firstName: string
): DecisionPackParentSummary {
  const h = center.header;
  const names = (opts: DecisionCenterState["strongOptions"]) =>
    opts.map((o) => o.careerName).filter(Boolean);
  const strong = names(center.strongOptions);
  const explore = names(center.exploreOptions);
  const programs = center.recommendedPrograms;
  const verifiedProgramCount = programs.filter((p) => p.verified).length;
  const gaps = center.informationGaps;
  const stageLabel = h.educationStageLabel ?? "not set yet";

  const where = `${firstName}'s career profile is ${h.profileCompleteness}% complete, with ${h.assessmentCompletedCount} of ${h.assessmentTotal} assessments finished. Education stage: ${stageLabel}.`;

  let direction: string;
  if (strong.length > 0) {
    direction = `Based on the current evidence, ${firstName}'s strongest career directions are: ${strong.join(
      ", "
    )}. These are supported by the profile — they are starting points, not a guarantee of any future outcome.`;
  } else if (explore.length > 0) {
    direction = `A few careers are worth exploring in more detail: ${explore.join(
      ", "
    )}. These need more evidence before they can be relied on.`;
  } else {
    direction = `There is not enough evidence yet to name a career direction. More profile details and assessments would help.`;
  }

  let pathway: string;
  if (programs.length === 0) {
    pathway = `No study program can be confirmed yet.`;
  } else if (verifiedProgramCount > 0) {
    pathway = `${firstName} could plan around: ${programs
      .map((p) => p.programName)
      .join(", ")} — ${verifiedProgramCount} of these programs have verified institution offers. Current admission details must always be confirmed directly with each institution.`;
  } else {
    pathway = `${firstName} could plan around: ${programs
      .map((p) => p.programName)
      .join(", ")}. We could not yet confirm verified institutions that offer them, so this still needs confirmation.`;
  }

  let confirmation: string;
  if (gaps.length === 0) {
    confirmation = `Nothing is currently flagged as needing confirmation.`;
  } else {
    const labels = gaps
      .slice(0, 3)
      .map((g) => g.label.toLowerCase())
      .join("; ");
    confirmation = `Before any final decision, we still need to confirm: ${labels}${
      gaps.length > 3 ? ", and more." : "."
    }`;
  }

  const next: string = center.nextDecision
    ? `The most helpful next step is: ${center.nextDecision.label}.`
    : `The next step will be suggested as soon as the profile has more detail.`;

  const support = h.counselorAssigned
    ? `A professional counselor is attached to ${firstName}'s account and can guide this decision.`
    : `${firstName} can book a session with a TechGemini counselor to discuss this plan.`;

  return {
    whereTheStudentIsNow: where,
    careerDirectionsSupported: direction,
    studyPathway: pathway,
    whatStillNeedsConfirmation: confirmation,
    nextRecommendedStep: next,
    counselorSupport: support,
  };
}

function pathwayAdmissions(
  center: DecisionCenterState,
  programId: string | null
): DecisionPackPathwayAdmissions | null {
  const g = focusProgramAdmission(center.admissionsGuidance, programId);
  if (!g) return null;
  return {
    routes: g.expectedRoutes.map((r) => r.label),
    entranceGuidance: g.relevantEntranceExams.length
      ? g.relevantEntranceExams.map((e) => `${e.name} — ${e.context}`).join(" ")
      : null,
    eligibilityGuidance: g.eligibilityGuidance,
    officialSources: g.officialSources.map((s) => ({
      name: s.name,
      url: s.canonicalUrl,
    })),
    needsVerification: g.needsVerification,
    verificationState: g.verificationState,
    note: g.note,
  };
}

function buildEducationPathways(
  center: DecisionCenterState,
  catalog: DecisionPackCatalogRow[]
): DecisionPackEducationPathway[] {
  const rows: DecisionPackEducationPathway[] = center.recommendedPrograms.map(
    (p) => {
      const first = p.careerConnections[0];
      return {
        kind: "PROGRAM",
        careerId: first?.careerId ?? "",
        careerName: first?.careerName ?? "",
        programId: p.programId,
        programName: p.programName,
        level: p.level,
        relationshipType: p.relationshipType,
        verification: p.verified ? "VERIFIED" : "PARTIAL",
        verifiedInstitutionCount: p.verifiedInstitutionCount,
        admissions: pathwayAdmissions(center, p.programId),
      };
    }
  );

  for (const row of catalog) {
    rows.push({
      kind: "KNOWLEDGE_BASE",
      careerId: row.careerId,
      careerName: row.careerName,
      programId: null,
      programName: row.degreeName,
      level: row.degreeLevel,
      relationshipType: row.priority,
      verification: "NOT_VERIFIED",
      verifiedInstitutionCount: 0,
      admissions: null,
    });
  }

  return rows.sort((a, b) => {
    const byRank = VERIFICATION_RANK[a.verification] - VERIFICATION_RANK[b.verification];
    if (byRank !== 0) return byRank;
    return (a.programName ?? a.careerName ?? "").localeCompare(
      b.programName ?? b.careerName ?? ""
    );
  });
}

function buildAdmissionsSummary(
  center: DecisionCenterState
): DecisionPackAdmissionsSummary {
  return {
    readiness: center.admissionsGuidance.readiness,
    readinessLabel: center.admissionsGuidance.readinessLabel,
    pathwayGuidanceCount: center.admissionsGuidance.focusPrograms.length,
    missingInfoCount: center.admissionsGuidance.missingInformation.length,
  };
}

/**
 * The single pure entry point. Same inputs → byte-identical pack.
 */
export function composeDecisionPack(inputs: DecisionPackInputs): DecisionPack {
  const { student, assessments, careerMatches, center, catalog } = inputs;
  const firstName = student.firstName ?? "The student";

  const actionPlan = buildDecisionPackActions(center);
  const disclaimers = [
    "This report is generated from the current saved data and is guidance context, not an academic or career guarantee.",
    "Availability prices, seats, cuts, and admission details must always be confirmed directly with each institution.",
  ];

  const pack: DecisionPack = {
    student,
    snapshot: {
      profileCompleteness: center.header.profileCompleteness,
      assessmentCompletedCount: center.header.assessmentCompletedCount,
      assessmentTotal: center.header.assessmentTotal,
      careerMatchCount: center.header.careerMatchCount,
      lowInformation: center.header.lowInformation,
      counselorAssigned: center.header.counselorAssigned,
      hasCareerDirection: Boolean(
        center.selectedPathway.careerId ?? center.selectedPathway.careerName
      ),
    },
    assessments,
    careerDirections: buildCareerDirections(center, careerMatches),
    educationPathways: buildEducationPathways(center, catalog),
    universityOptions: center.institutionOptions.map((o) => ({
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
    currentDecision: buildCurrentDecision(center),
    actionPlan,
    parentSummary: buildParentSummary(center, firstName),
    admissionsSummary: buildAdmissionsSummary(center),
    disclaimer: disclaimers.join(" "),
  };

  if (inputs.counselor) {
    pack.counselor = buildCounselorSummary(
      center,
      firstName,
      inputs.counselor,
      inputs.careerNameById,
      inputs.programNameById,
      actionPlan
    );
  }

  return pack;
}