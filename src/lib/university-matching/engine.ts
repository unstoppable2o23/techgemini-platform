import { prisma } from "../prisma.ts";
import { getCandidateSet, getSingleCandidate } from "./candidate.ts";
import { normalizeWeights } from "./config.ts";
import { scoreInstitution } from "./score.ts";
import { buildExplanation } from "./explanation.ts";
import type {
  CareerContext,
  EducationContext,
  MatchResult,
  MatchWeights,
  StudentMatchInput,
  StudentUniversityMatchResponse,
} from "./types.ts";

const MATCHING_DISCLAIMER =
  "Match scores are heuristic estimates derived from available profile, education-pathway, and institution data. They are NOT admission guarantees or verified course offerings. Category-derived institutions are related by institution type, not confirmed program availability.";

interface ContextInput {
  careerId?: string;
  degreeId?: string;
  specializationId?: string;
  weights?: Partial<MatchWeights>;
  limit?: number;
}

async function loadStudentInput(studentId: string): Promise<{
  input: StudentMatchInput;
  exists: boolean;
}> {
  const sp = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: {
      state: true,
      targetCountry: true,
      targetCountries: true,
      tuitionBudget: true,
      preferredCareer: true,
      targetColleges: true,
      averageGrade: true,
      gradeLevel: true,
      studyLevel: true,
      exams: true,
    },
  });
  if (!sp) return { input: {}, exists: false };
  return {
    input: {
      state: sp.state,
      targetCountry: sp.targetCountry,
      targetCountries: sp.targetCountries,
      tuitionBudget: sp.tuitionBudget,
      preferredCareer: sp.preferredCareer,
      targetColleges: sp.targetColleges,
      averageGrade: sp.averageGrade,
      gradeLevel: sp.gradeLevel,
      studyLevel: sp.studyLevel,
      exams: sp.exams,
    },
    exists: true,
  };
}

async function loadContexts(studentId: string, input: ContextInput): Promise<{
  careerContext: CareerContext | null;
  educationContext: EducationContext | null;
  degreeName: string | null;
}> {
  let careerContext: CareerContext | null = null;
  let educationContext: EducationContext | null = null;
  let degreeName: string | null = null;

  if (input.careerId) {
    const career = await prisma.career.findUnique({
      where: { id: input.careerId },
      select: { id: true, name: true, slug: true },
    });
    if (career) {
      careerContext = { careerId: career.id, careerName: career.name };
      const path = await prisma.careerEducationPathway.findFirst({
        where: { careerId: career.id, type: "DEGREE_PATHWAY", priority: "PRIMARY", degreeId: { not: null } },
        include: { degree: true, specialization: true },
      });
      if (path) {
        degreeName = path.degree?.name || null;
        educationContext = {
          degreeName,
          specializationName: path.specialization?.name || null,
          pathwayPriority: path.priority,
        };
      }
    }
  }

  if (input.degreeId) {
    const d = await prisma.degree.findUnique({ where: { id: input.degreeId }, select: { name: true } });
    if (d) {
      degreeName = d.name;
      educationContext = { ...educationContext, degreeName: d.name };
    }
  }

  if (input.specializationId) {
    const s = await prisma.specialization.findUnique({
      where: { id: input.specializationId },
      include: { degree: true },
    });
    if (s) {
      degreeName = s.degree?.name || degreeName || null;
      educationContext = {
        degreeName: s.degree?.name || null,
        specializationName: s.name,
        pathwayPriority: null,
      };
    }
  }

  return { careerContext, educationContext, degreeName };
}

function summarizeInputs(input: StudentMatchInput): Record<string, boolean> {
  return {
    state: !!input.state,
    targetCountry: !!(input.targetCountry || (input.targetCountries && input.targetCountries.length)),
    averageGrade: !!input.averageGrade,
    tuitionBudget: !!input.tuitionBudget,
    targetColleges: !!(input.targetColleges && input.targetColleges.length),
    exams: !!(input.exams && input.exams.length),
    gradeLevel: !!(input.gradeLevel || input.studyLevel),
  };
}

export async function getUniversityMatchesForStudent(
  studentId: string,
  input: ContextInput
): Promise<StudentUniversityMatchResponse> {
  const { input: studentInput, exists } = await loadStudentInput(studentId);
  if (!exists) {
    return {
      matches: [],
      totalCandidates: 0,
      studentInputsUsed: {},
      careerContext: null,
      educationContext: null,
      disclaimer: "Student profile not found.",
    };
  }

  const { careerContext, educationContext, degreeName } = await loadContexts(studentId, input);
  const weights = normalizeWeights(input.weights || {});

  const { candidates, total, disclaimer } = await getCandidateSet({
    careerId: input.careerId,
    degreeId: input.degreeId,
    specializationId: input.specializationId,
  });

  // STEP 4: hard filters are intentionally minimal (no required-country flag
  // exists in the data model). Soft preferences drive the score instead.
  let results = candidates.map((c) =>
    buildExplanation(
      scoreInstitution(c, studentInput, educationContext || {}, careerContext, weights),
      careerContext?.careerName
    )
  );

  // STEP 17: deterministic ranking — match desc, confidence desc, name asc.
  results.sort(
    (a, b) =>
      b.matchScore - a.matchScore ||
      b.confidence - a.confidence ||
      a.institution.name.localeCompare(b.institution.name)
  );

  const limit = Math.min(Math.max(1, input.limit || 10), 20);
  const matches = results.slice(0, limit);

  return {
    matches,
    totalCandidates: total,
    studentInputsUsed: summarizeInputs(studentInput),
    careerContext,
    educationContext,
    disclaimer: [disclaimer, MATCHING_DISCLAIMER].filter(Boolean).join(" "),
  };
}

export async function getUniversityMatchForInstitution(
  studentId: string,
  institutionId: string,
  input: { careerId?: string; degreeId?: string; specializationId?: string; dataset: "indian" | "global"; weights?: Partial<MatchWeights> }
): Promise<{
  result: MatchResult;
  careerContext: CareerContext | null;
  educationContext: EducationContext | null;
  disclaimer: string;
} | null> {
  const { input: studentInput, exists } = await loadStudentInput(studentId);
  if (!exists) return null;

  const { careerContext, educationContext, degreeName } = await loadContexts(studentId, input);
  const weights = normalizeWeights(input.weights || {});

  const candidate = await getSingleCandidate(institutionId, input.dataset, degreeName);
  if (!candidate) return null;

  const result = buildExplanation(
    scoreInstitution(candidate, studentInput, educationContext || {}, careerContext, weights),
    careerContext?.careerName
  );

  return {
    result,
    careerContext,
    educationContext,
    disclaimer: MATCHING_DISCLAIMER,
  };
}
