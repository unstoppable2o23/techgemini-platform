/**
 * Phase 28 — Program & University Intelligence V2.
 *
 * Program normalization and explainability are ADDITIVE intelligence over the
 * existing catalog. Nothing here rewrites University / IndianInstitution /
 * AcademicProgram / Program rows, and nothing feeds the frozen career engine.
 *
 * Facts carry an explicit provenance object where the underlying row supports
 * one (source, sourceUrl, verificationStatus, verifiedAt). Absence of evidence
 * is surfaced as a labelled "not verified" state instead of fabricating it.
 */

export type InstitutionKind = "INDIAN" | "INTERNATIONAL";

/** Qualification kinds — NEVER collapsed into one generic "degree". */
export type QualificationKind =
  | "DIPLOMA"
  | "CERTIFICATE"
  | "BACHELORS"
  | "PROFESSIONAL_DEGREE"
  | "MASTERS"
  | "POSTGRADUATE_DIPLOMA"
  | "DOCTORAL"
  | "OTHER";

/** Broad education-stage family a qualification belongs to. */
export type QualificationLevel =
  | "SCHOOL"
  | "DIPLOMA"
  | "UNDERGRADUATE"
  | "POSTGRADUATE"
  | "DOCTORAL"
  | "OTHER";

export type Discipline = {
  id: string;
  name: string;
  /** Exact category value stored on AcademicProgram, when applicable. */
  category: string | null;
};

export type ProgramQualification = {
  /** Canonical display label (e.g. "Bachelor's Degree", "Diploma"). */
  name: string;
  kind: QualificationKind;
  level: QualificationLevel;
};

export type Provenance = {
  source: string;
  sourceUrl: string | null;
  verificationStatus: "VERIFIED" | "UNVERIFIED" | string;
  verifiedAt: string | null;
};

export type AdmissionInfo = {
  entranceExam: string | null;
  admissionType: string | null;
  applicableQualification: string | null;
  source: { label: string; lastReviewed: string } | null;
  note: string;
};

/** Normalized program card shown on career detail / search / comparison. */
export type ProgramCard = {
  programId: string;
  programName: string;
  slug: string;
  level: string;
  category: string;
  qualification: ProgramQualification | null;
  discipline: Discipline;
  relationshipType: "PRIMARY" | "COMMON" | "SPECIALIZED" | "RELEVANT" | "OPTIONAL" | string;
  rationale: string;
  source: string;
  /** How many careers reference this program (breadth signal, not a quality judgment). */
  sharedWithCareers: number;
  admission: AdmissionInfo | null;
  /** Education-stage labels this program realistically fits. */
  educationStageFit: string[];
  nextStep: string;
};

export type ProgramAvailabilityRow = {
  programId: string;
  programName: string;
  qualification: ProgramQualification | null;
  specializationName: string | null;
  studyMode: string | null;
  duration: string | null;
  provenance: Provenance;
  freshness: "CURRENT" | "RECENT" | "HISTORICAL" | "UNKNOWN";
};

export type ProgramAvailability = {
  rows: ProgramAvailabilityRow[];
  verifiedCount: number;
  hasVerified: boolean;
  /** Distinct qualification labels offered, across Program rows. */
  qualificationCoverage: string[];
  /** Explicit state used when no program-level evidence exists. */
  state: "VERIFIED" | "PARTIAL" | "NOT_VERIFIED";
};

export type ProgramSearchItem = ProgramCard & {
  careers: { id: string; name: string; relationshipType: string }[];
  availability: {
    institutionCount: number;
    institutionCountries: string[];
    institutionStates: string[];
  };
  saved: boolean;
};

/** Institution-offered program row surfaced by the institution-facet layer. */
export type ProgramInstitutionOffer = {
  programId: string;
  programName: string;
  level: string | null;
  qualification: ProgramQualification | null;
  institution: {
    id: string;
    name: string;
    kind: InstitutionKind;
    location: string | null;
    institutionType: string | null;
  };
  provenance: Provenance;
  freshness: "CURRENT" | "RECENT" | "HISTORICAL" | "UNKNOWN";
};

export type InstitutionFacet = {
  value: string;
  count: number;
};

export type ProgramSearchResult = {
  items: ProgramSearchItem[];
  total: number;
  limit: number;
  facets: {
    qualification: { value: string; count: number }[];
    disciplines: { value: string; count: number }[];
    countries: InstitutionFacet[];
    states: InstitutionFacet[];
    institutionTypes: InstitutionFacet[];
  };
  institutionOffers: ProgramInstitutionOffer[];
  institutionOfferTotal: number;
  clarifier: string;
};

export type ProgramCompareRow = {
  key: string;
  label: string;
  values: string[];
  allUnavailable: boolean;
};

export type ProgramComparison = {
  programs: { id: string; name: string }[];
  rows: ProgramCompareRow[];
  rowOrder: string[];
  maxCompare: number;
  clarifier: string;
};