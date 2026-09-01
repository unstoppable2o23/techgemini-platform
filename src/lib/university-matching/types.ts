export type Dataset = "indian" | "global";
export type MappingBasis = "verified-program" | "curated" | "institutionType-category" | "none";

export interface ProgramInfo {
  id: string;
  name: string;
  degreeName: string | null;
  specializationName: string | null;
  level: string | null;
  verificationStatus: string;
  sourceUrl: string | null;
  verifiedAt: Date | null;
}

export interface InstitutionCandidate {
  id: string;
  name: string;
  dataset: Dataset;
  type: string | null;
  state: string | null;
  district: string | null;
  website: string | null;
  institutionType: string | null;
  universityName: string | null;
  country: string | null;
  qsRank: number | null;
  mappingBasis: MappingBasis;
  program?: ProgramInfo | null;
}

export interface StudentMatchInput {
  state?: string | null;
  targetCountry?: string | null;
  targetCountries?: string[] | null;
  tuitionBudget?: string | null;
  preferredCareer?: string | null;
  targetColleges?: string[] | null;
  averageGrade?: string | null;
  gradeLevel?: string | null;
  studyLevel?: string | null;
  exams?: string[] | null;
  careerMatchScore?: number | null;
}

export interface EducationContext {
  degreeName?: string | null;
  specializationName?: string | null;
  pathwayPriority?: string | null;
}

export interface CareerContext {
  careerId: string;
  careerName: string;
  careerMatchScore?: number | null;
}

export interface MatchWeights {
  educationPathway: number;
  specialization: number;
  careerAlignment: number;
  academicFit: number;
  location: number;
  country: number;
  budget: number;
  institutionQuality: number;
  studentPreferences: number;
}

export interface DimensionScore {
  key: string;
  label: string;
  score: number;
  weight: number;
  applied: number;
  available: boolean;
  note?: string;
}

export type FitTier = "STRONG_FIT" | "GOOD_FIT" | "POTENTIAL_FIT" | "EXPLORE";

export interface MatchResult {
  institution: InstitutionCandidate;
  matchScore: number;
  confidence: number;
  dimensions: DimensionScore[];
  reasons: string[];
  strengths: string[];
  limitations: string[];
  evidence: string[];
  mappingStatus: MappingBasis;
  fitTier?: FitTier;
  fitTierLabel?: string;
  fitTierExplanation?: string;
}

export interface StudentUniversityMatchResponse {
  matches: MatchResult[];
  totalCandidates: number;
  studentInputsUsed: Record<string, boolean>;
  careerContext: CareerContext | null;
  educationContext: EducationContext | null;
  disclaimer: string;
}
