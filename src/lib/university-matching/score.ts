import type {
  DimensionScore,
  EducationContext,
  InstitutionCandidate,
  MappingBasis,
  MatchResult,
  MatchWeights,
  StudentMatchInput,
} from "./types.ts";

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function parseGrade(input?: string | null): number | null {
  if (!input) return null;
  const s = input.toLowerCase();
  let m = s.match(/(\d{1,3})\s*%/);
  if (m) return clamp(parseFloat(m[1]));
  m = s.match(/(\d(?:\.\d)?)\s*(?:cgpa|c\.g\.p\.a)/);
  if (m) return clamp(parseFloat(m[1]) * 10);
  m = s.match(/(\d{1,3})\s*(?:marks|score|out of)/);
  if (m) return clamp(parseFloat(m[1]));
  return null;
}

function targetCountriesList(s: StudentMatchInput): string[] {
  const list: string[] = [];
  if (s.targetCountry) list.push(s.targetCountry.toLowerCase());
  (s.targetCountries || []).forEach((c) => c && list.push(c.toLowerCase()));
  return [...new Set(list)];
}

function educationPathwayScore(basis: MappingBasis): number {
  if (basis === "verified-program") return 100;
  if (basis === "curated") return 85;
  if (basis === "institutionType-category") return 55;
  return 0;
}

function specializationScore(basis: MappingBasis): number {
  if (basis === "verified-program") return 95;
  if (basis === "curated") return 80;
  if (basis === "institutionType-category") return 45;
  return 0;
}

function careerAlignmentScore(basis: MappingBasis, careerMatchScore?: number | null): number {
  const base = basis === "verified-program" ? 90 : basis === "curated" ? 75 : basis === "institutionType-category" ? 50 : 0;
  if (typeof careerMatchScore === "number" && !isNaN(careerMatchScore)) {
    return clamp(Math.round(0.5 * base + 0.5 * clamp(careerMatchScore)));
  }
  return base;
}

function academicFitScore(s: StudentMatchInput): { score: number; available: boolean } {
  const parsed = parseGrade(s.averageGrade);
  if (parsed !== null) return { score: parsed, available: true };
  if (s.gradeLevel || s.studyLevel || (s.exams && s.exams.length)) {
    return { score: 65, available: false };
  }
  return { score: 50, available: false };
}

function locationScore(s: StudentMatchInput, inst: InstitutionCandidate): { score: number; available: boolean; note?: string } {
  if (inst.dataset === "indian") {
    if (s.state && inst.state) {
      return s.state.toLowerCase() === inst.state.toLowerCase()
        ? { score: 100, available: true }
        : { score: 55, available: true };
    }
    return { score: 70, available: false, note: "No state preference provided by student." };
  }
  // Global: sub-country (state) data is unavailable; location preference is
  // expressed at country level (see country dimension).
  return { score: 70, available: false, note: "State-level location data unavailable for global institutions." };
}

function countryScore(s: StudentMatchInput, inst: InstitutionCandidate): { score: number; available: boolean } {
  const targets = targetCountriesList(s);
  if (targets.length === 0) return { score: 70, available: false };
  const instCountry = (inst.dataset === "indian" ? "india" : inst.country || "").toLowerCase();
  if (targets.includes(instCountry)) return { score: 100, available: true };
  return { score: 40, available: true };
}

function budgetScore(): { score: number; available: boolean } {
  // No reliable tuition-fee data exists in either institution dataset.
  return { score: 50, available: false };
}

function institutionQualityScore(inst: InstitutionCandidate): { score: number; available: boolean } {
  if (inst.dataset === "global") {
    if (typeof inst.qsRank === "number") {
      const r = inst.qsRank;
      const score = r <= 10 ? 95 : r <= 50 ? 85 : r <= 100 ? 75 : r <= 200 ? 65 : r <= 500 ? 55 : 45;
      return { score, available: true };
    }
    return { score: 50, available: false };
  }
  // IndianInstitution has no QS/overall quality field.
  return { score: 50, available: false };
}

function studentPreferencesScore(s: StudentMatchInput, inst: InstitutionCandidate): { score: number; available: boolean } {
  const targets = (s.targetColleges || []).map((t) => t.toLowerCase());
  if (targets.length && (targets.includes(inst.id.toLowerCase()) || targets.includes(inst.name.toLowerCase()))) {
    return { score: 100, available: true };
  }
  if (s.preferredCareer) return { score: 60, available: false };
  return { score: 50, available: false };
}

function confidenceScore(basis: MappingBasis, s: StudentMatchInput, dims: DimensionScore[]): number {
  const base = basis === "verified-program" ? 98 : basis === "curated" ? 90 : basis === "institutionType-category" ? 60 : 30;
  const present = [
    s.averageGrade,
    s.gradeLevel,
    s.state,
    s.targetCountry || (s.targetCountries && s.targetCountries.length),
    s.tuitionBudget,
    s.targetColleges && s.targetColleges.length,
    s.exams && s.exams.length,
  ].filter(Boolean).length;
  const completeness = present / 7;
  let conf = base + completeness * 10;
  // Only gaps in STUDENT-PROVIDED signals reduce confidence. Structural dataset
  // limitations (e.g., missing fee/quality fields) are reported as limitations,
  // not as a confidence penalty about the student.
  const aca = dims.find((d) => d.key === "academicFit");
  const loc = dims.find((d) => d.key === "location");
  const cty = dims.find((d) => d.key === "country");
  const pref = dims.find((d) => d.key === "studentPreferences");
  if (aca && !aca.available) conf -= 4;
  if (loc && !loc.available) conf -= 3;
  if (cty && !cty.available) conf -= 3;
  if (pref && !pref.available) conf -= 3;
  return clamp(Math.round(conf));
}

/**
 * Pure, DB-free scoring function. Given a candidate institution, the student
 * input, and education/career context, it returns a full MatchResult with a
 * 0-100 matchScore and a separate 0-100 confidenceScore. STEP 22.
 */
export function scoreInstitution(
  inst: InstitutionCandidate,
  student: StudentMatchInput,
  education: EducationContext,
  career: { careerId: string; careerName: string; careerMatchScore?: number | null } | null,
  weights: MatchWeights
): MatchResult {
  const basis = inst.mappingBasis;

  const eduRaw = educationPathwayScore(basis);
  const specRaw = specializationScore(basis);
  const carRaw = careerAlignmentScore(basis, career?.careerMatchScore ?? null);
  const aca = academicFitScore(student);
  const loc = locationScore(student, inst);
  const cty = countryScore(student, inst);
  const bud = budgetScore();
  const qual = institutionQualityScore(inst);
  const pref = studentPreferencesScore(student, inst);

  const dimensions: DimensionScore[] = [
    { key: "educationPathway", label: "Education Pathway Match", score: eduRaw, weight: weights.educationPathway, applied: eduRaw * weights.educationPathway, available: basis !== "none" },
    { key: "specialization", label: "Specialization Match", score: specRaw, weight: weights.specialization, applied: specRaw * weights.specialization, available: basis !== "none", note: "Specialization-level availability not independently verified." },
    { key: "careerAlignment", label: "Career Alignment", score: carRaw, weight: weights.careerAlignment, applied: carRaw * weights.careerAlignment, available: basis !== "none" },
    { key: "academicFit", label: "Academic / Eligibility Fit", score: aca.score, weight: weights.academicFit, applied: aca.score * weights.academicFit, available: aca.available, note: aca.available ? undefined : "Course-level eligibility not verified." },
    { key: "location", label: "Location Preference", score: loc.score, weight: weights.location, applied: loc.score * weights.location, available: loc.available, note: loc.note },
    { key: "country", label: "Country Preference", score: cty.score, weight: weights.country, applied: cty.score * weights.country, available: cty.available },
    { key: "budget", label: "Budget / Affordability", score: bud.score, weight: weights.budget, applied: bud.score * weights.budget, available: false, note: "Tuition fee data unavailable; affordability not assessed." },
    { key: "institutionQuality", label: "Institution Quality", score: qual.score, weight: weights.institutionQuality, applied: qual.score * weights.institutionQuality, available: qual.available, note: qual.available ? undefined : "Institution quality metrics not available in the dataset." },
    { key: "studentPreferences", label: "Student Preferences", score: pref.score, weight: weights.studentPreferences, applied: pref.score * weights.studentPreferences, available: pref.available },
  ];

  const matchScore = clamp(Math.round(dimensions.reduce((a, d) => a + d.applied, 0)));
  const confidence = confidenceScore(basis, student, dimensions);

  return {
    institution: inst,
    matchScore,
    confidence,
    dimensions,
    reasons: [],
    strengths: [],
    limitations: [],
    evidence: [],
    mappingStatus: basis,
  };
}
