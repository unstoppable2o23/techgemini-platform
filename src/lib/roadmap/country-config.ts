/**
 * Phase 21 — Country pathway configuration (V1).
 *
 * The roadmap is a CONSUMER of education intelligence. This file holds a
 * simple, conservative configuration of application steps per destination.
 * It deliberately does NOT hard-code fragile deadlines, tuition figures, or
 * visa rules. Every external requirement is labelled with a confidence level:
 *
 *   REQUIRED   widely expected of that destination's applications
 *   RECOMMENDED commonly helpful but not universally mandatory
 *   MAY_APPLY  depends on university/program — check the institution
 *   CHECK      unknown / must verify on the official source
 *
 * Requirements are framed as things for the student to CHECK, not as facts.
 */
import type {
  ApplicationSystem,
  ApplicationSystems,
  CountryPathwayConfig,
  DestinationLabel,
  RequirementQuestion,
} from "./types.ts";

const APPLICATION_SYSTEMS: ApplicationSystems = {
  INDIA: {
    label: "Centralised + direct institutional applications",
    detail:
      "Applications go either through central entrance systems (e.g. CUET, JEE) or directly to institutions depending on the program. Verify which applies to your chosen program.",
  },
  USA: {
    label: "Application platforms + direct applications",
    detail:
      "Many universities use a common application platform or their own portal. Check each university's official admissions page for its exact process.",
  },
  UK: {
    label: "UCAS centralised application",
    detail:
      "Most undergraduate courses for international applicants go through the UCAS central application. Postgraduate admission is usually direct to each university.",
  },
  CANADA: {
    label: "Institutional + provincial application systems",
    detail:
      "Undergraduate applicants often apply through a provincial application centre (e.g. OUAC in Ontario) or directly to the university. Check each institution.",
  },
  AUSTRALIA: {
    label: "Direct or via education agents / central systems",
    detail:
      "Applications are usually direct to the institution (often through universities' own portals) or supported by approved education agents.",
  },
  GERMANY: {
    label: "uni-assist / direct to university",
    detail:
      "Some German universities route international applications through uni-assist; others accept direct applications. Check the specific university and program.",
  },
  IRELAND: {
    label: "Central Applications Office (CAO)",
    detail:
      "Most undergraduate courses for Irish institutions go through the CAO. Postgraduate admission is usually direct to each institution.",
  },
  NEW_ZEALAND: {
    label: "Direct application to the institution",
    detail:
      "Applications are usually made directly to the university or polytechnic. Check each institution's official admissions portal.",
  },
};

/**
 * Conservative per-country step hints. These are only used to phrase what to
 * CHECK — never as verified facts about a specific university's requirements.
 */
const COUNTRY_DEFAULT: (id: DestinationLabel) => CountryPathwayConfig = (id) => ({
  id,
  label: id.replace(/_/g, " "),
  applicationSystem: APPLICATION_SYSTEMS[id],
  englishTest: { confidence: "MAY_APPLY" },
  standardized: { confidence: "MAY_APPLY" },
  visaStage: { confidence: "CHECK" },
  scholarshipStage: { confidence: "RECOMMENDED" },
  documentVerification: { confidence: "CHECK" },
  credential: { confidence: "MAY_APPLY" },
});

export const COUNTRY_PATHWAYS: Record<DestinationLabel, CountryPathwayConfig> = {
  INDIA: {
    ...COUNTRY_DEFAULT("INDIA"),
    englishTest: { confidence: "MAY_APPLY" },
    standardized: { confidence: "MAY_APPLY" },
    visaStage: { confidence: "CHECK" },
    scholarshipStage: { confidence: "RECOMMENDED" },
    documentVerification: { confidence: "CHECK" },
    credential: { confidence: "MAY_APPLY" },
  },
  USA: {
    ...COUNTRY_DEFAULT("USA"),
    englishTest: { confidence: "REQUIRED" },
    standardized: { confidence: "MAY_APPLY" },
    visaStage: { confidence: "CHECK" },
    scholarshipStage: { confidence: "RECOMMENDED" },
    documentVerification: { confidence: "CHECK" },
    credential: { confidence: "REQUIRED" },
  },
  UK: {
    ...COUNTRY_DEFAULT("UK"),
    englishTest: { confidence: "RECOMMENDED" },
    standardized: { confidence: "MAY_APPLY" },
    visaStage: { confidence: "CHECK" },
    scholarshipStage: { confidence: "RECOMMENDED" },
    documentVerification: { confidence: "CHECK" },
    credential: { confidence: "REQUIRED" },
  },
  CANADA: {
    ...COUNTRY_DEFAULT("CANADA"),
    englishTest: { confidence: "REQUIRED" },
    standardized: { confidence: "MAY_APPLY" },
    visaStage: { confidence: "CHECK" },
    scholarshipStage: { confidence: "RECOMMENDED" },
    documentVerification: { confidence: "CHECK" },
    credential: { confidence: "REQUIRED" },
  },
  AUSTRALIA: {
    ...COUNTRY_DEFAULT("AUSTRALIA"),
    englishTest: { confidence: "REQUIRED" },
    standardized: { confidence: "MAY_APPLY" },
    visaStage: { confidence: "CHECK" },
    scholarshipStage: { confidence: "RECOMMENDED" },
    documentVerification: { confidence: "CHECK" },
    credential: { confidence: "REQUIRED" },
  },
  GERMANY: {
    ...COUNTRY_DEFAULT("GERMANY"),
    englishTest: { confidence: "RECOMMENDED" },
    standardized: { confidence: "MAY_APPLY" },
    visaStage: { confidence: "CHECK" },
    scholarshipStage: { confidence: "RECOMMENDED" },
    documentVerification: { confidence: "CHECK" },
    credential: { confidence: "REQUIRED" },
  },
  IRELAND: {
    ...COUNTRY_DEFAULT("IRELAND"),
    englishTest: { confidence: "RECOMMENDED" },
    standardized: { confidence: "MAY_APPLY" },
    visaStage: { confidence: "CHECK" },
    scholarshipStage: { confidence: "RECOMMENDED" },
    documentVerification: { confidence: "CHECK" },
    credential: { confidence: "REQUIRED" },
  },
  NEW_ZEALAND: {
    ...COUNTRY_DEFAULT("NEW_ZEALAND"),
    englishTest: { confidence: "RECOMMENDED" },
    standardized: { confidence: "MAY_APPLY" },
    visaStage: { confidence: "CHECK" },
    scholarshipStage: { confidence: "RECOMMENDED" },
    documentVerification: { confidence: "CHECK" },
    credential: { confidence: "REQUIRED" },
  },
};

export const SUPPORTED_DESTINATIONS = Object.keys(COUNTRY_PATHWAYS) as DestinationLabel[];

/**
 * Normalizes a free-form target-country string from StudentProfile into a
 * supported DestinationLabel, or null when we cannot match it confidently.
 */
export function resolveDestination(raw?: string | null): DestinationLabel | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  const map: Record<string, DestinationLabel> = {
    india: "INDIA",
    usa: "USA",
    "united states": "USA",
    "united states of america": "USA",
    america: "USA",
    us: "USA",
    uk: "UK",
    "united kingdom": "UK",
    britain: "UK",
    canada: "CANADA",
    australia: "AUSTRALIA",
    germany: "GERMANY",
    ireland: "IRELAND",
    "new zealand": "NEW_ZEALAND",
  };
  return map[v] ?? null;
}

/** Human-readable destination label. */
export function destinationLabel(label: DestinationLabel): string {
  return COUNTRY_PATHWAYS[label].label;
}

/** Builds requirement questions with conservative wording from a config. */
export function requirementQuestions(
  config: CountryPathwayConfig
): RequirementQuestion[] {
  const base: RequirementQuestion[] = [];
  const phrase = (confidence: RequirementQuestion["confidence"], subject: string) =>
    ({
      REQUIRED: `Prepare for the ${subject} — check the official institution/immigration requirements for the exact test and scores.`,
      RECOMMENDED: `${subject} is commonly part of applications for this destination — confirm on the official source.`,
      MAY_APPLY: `The ${subject} may apply depending on the university and program — check each institution's official requirements.`,
      CHECK: `Check current official requirements for the ${subject} — these can change.`,
    })[confidence] || `Check current official requirements for the ${subject}.`;
  if (config.englishTest?.confidence) {
    base.push({
      id: "english_test",
      label: "English-language requirement",
      confidence: config.englishTest.confidence,
      text: phrase(config.englishTest.confidence, "English-language requirement"),
    });
  }
  if (config.standardized?.confidence) {
    base.push({
      id: "standardized_test",
      label: "Standardized/national test",
      confidence: config.standardized.confidence,
      text: phrase(config.standardized.confidence, "standardized or national test (e.g. SAT/ACT/GRE or equivalent)"),
    });
  }
  if (config.visaStage?.confidence) {
    base.push({
      id: "visa",
      label: "Student visa process",
      confidence: config.visaStage.confidence,
      text: "Plan for the student-visa stage for your destination — check current official immigration requirements. We are not providing legal or immigration advice.",
    });
  }
  if (config.scholarshipStage?.confidence) {
    base.push({
      id: "scholarship",
      label: "Scholarships & funding",
      confidence: config.scholarshipStage.confidence,
      text: "Research scholarships (university and government) and check eligibility — do not assume you qualify.",
    });
  }
  if (config.documentVerification?.confidence) {
    base.push({
      id: "documents",
      label: "Document verification",
      confidence: config.documentVerification.confidence,
      text: "Verify which documents (transcripts, degree certificates) need official verification for your destination.",
    });
  }
  if (config.credential?.confidence) {
    base.push({
      id: "credential",
      label: "Credential evaluation",
      confidence: config.credential.confidence,
      text: "Check whether your prior qualifications need to be evaluated or recognised for this destination.",
    });
  }
  return base;
}