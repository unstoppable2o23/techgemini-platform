import { prisma } from "../prisma.ts";
import { generateStudentCareerProfile } from "../career-profile/generate.ts";

export class PrefsValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PrefsValidationError";
    this.status = status;
  }
}

export type SaveCareerPrefsInput = {
  targetColleges?: string[];
  collegeNotFinalized?: boolean;
  nationality?: string;
  state?: string;
  hasEnglishResult?: boolean;
  englishTestType?: string;
  englishTestScore?: string;
  englishProficiency?: string;
  tuitionBudget?: string;
  fundingSource?: string;
  targetCountries?: string[];
  countryNotFinalized?: boolean;
  preferredCareer?: string;
  careerNotFinalized?: boolean;
  prospectiveSessions?: string[];
  preferredIntake?: string;
  preferredYear?: string;
  highestEducation?: string;
  averageGrade?: string;
  careerPlanNotes?: string;
  gradeLevel?: string;
  studyLevel?: string;
  exams?: string[];
  subjectsStudied?: string[];
  subjectsEnjoyed?: string[];
  activityInterests?: string[];
  mobile?: string;
  gender?: string;
  dateOfBirth?: string | null;
};

function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[])
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validates a student's career/onboarding submission and persists it to their
 * StudentProfile. Validates that referenced Career / Subject records actually
 * exist (security: never persist arbitrary foreign-key strings) and then
 * regenerates the derived career profile used by the dashboard.
 */
export async function saveCareerPreferences(
  userId: string,
  input: SaveCareerPrefsInput
): Promise<{ ok: true }> {
  const targetColleges = cleanArray(input.targetColleges);
  const targetCountries = cleanArray(input.targetCountries);
  const collegeNotFinalized = Boolean(input.collegeNotFinalized);
  const countryNotFinalized = Boolean(input.countryNotFinalized);
  const careerNotFinalized = Boolean(input.careerNotFinalized);

  if (targetColleges.length === 0 && !collegeNotFinalized) {
    throw new PrefsValidationError(
      "Please add at least one target college or tick 'I haven't finalized the college yet'"
    );
  }
  if (targetCountries.length === 0 && !countryNotFinalized) {
    throw new PrefsValidationError(
      "Please add at least one target country or tick 'I haven't finalized the country yet'"
    );
  }

  const preferredCareer = cleanString(input.preferredCareer);
  if (!preferredCareer && !careerNotFinalized) {
    throw new PrefsValidationError(
      "Please choose a preferred career or tick 'I haven't finalized the career yet'"
    );
  }

  // Validate preferredCareer exists in the Career catalogue.
  if (preferredCareer) {
    const career = await prisma.career.findFirst({
      where: { name: { equals: preferredCareer, mode: "insensitive" } },
      select: { id: true },
    });
    if (!career) {
      throw new PrefsValidationError(
        `Career '${preferredCareer}' is not recognized. Choose a career from the list.`
      );
    }
  }

  // Validate subjects exist in the Subject catalogue (reuse canonical list).
  const subjectsStudied = cleanArray(input.subjectsStudied);
  const subjectsEnjoyed = cleanArray(input.subjectsEnjoyed);
  if (subjectsStudied.length > 0 || subjectsEnjoyed.length > 0) {
    const wanted = Array.from(new Set([...subjectsStudied, ...subjectsEnjoyed]));
    const found = await prisma.subject.findMany({
      where: { name: { in: wanted, mode: "insensitive" }, isActive: true },
      select: { name: true },
    });
    const foundNames = new Set(found.map((s) => s.name.toLowerCase()));
    const unknown = wanted.filter((w) => !foundNames.has(w.toLowerCase()));
    if (unknown.length > 0) {
      throw new PrefsValidationError(
        `Subject(s) not recognized: ${unknown.join(", ")}. Choose subjects from the list.`
      );
    }
  }

  const activityInterests = cleanArray(input.activityInterests);
  const exams = cleanArray(input.exams);

  const hasEnglishResult = Boolean(input.hasEnglishResult);
  if (hasEnglishResult) {
    if (!input.englishTestType) {
      throw new PrefsValidationError("Please select an English exam type");
    }
    const score = parseFloat(String(input.englishTestScore ?? ""));
    if (!input.englishTestScore || isNaN(score)) {
      throw new PrefsValidationError("Please enter your overall English test score");
    }
  }

  let dateOfBirth: Date | null = null;
  if (input.dateOfBirth) {
    const parsed = new Date(input.dateOfBirth);
    if (!isNaN(parsed.getTime())) dateOfBirth = parsed;
  }

  const averageGrade = cleanString(input.averageGrade);
  if (averageGrade) {
    const g = parseFloat(averageGrade);
    if (isNaN(g) || g < 0 || g > 100) {
      throw new PrefsValidationError("Average grade must be between 0 and 100");
    }
  }

  const data: Record<string, unknown> = {
    targetColleges,
    targetCountries,
    nationality: cleanString(input.nationality),
    state: cleanString(input.state),
    hasEnglishResult,
    englishTestType: hasEnglishResult ? cleanString(input.englishTestType) : null,
    englishTestScore: hasEnglishResult ? cleanString(input.englishTestScore) : null,
    englishProficiency: hasEnglishResult ? null : cleanString(input.englishProficiency),
    tuitionBudget: cleanString(input.tuitionBudget),
    fundingSource: cleanString(input.fundingSource),
    preferredCareer: preferredCareer ?? null,
    prospectiveSessions: cleanArray(input.prospectiveSessions),
    preferredIntake: cleanString(input.preferredIntake),
    preferredYear: cleanString(input.preferredYear),
    highestEducation: cleanString(input.highestEducation),
    averageGrade,
    careerPlanNotes: cleanString(input.careerPlanNotes),
    gradeLevel: cleanString(input.gradeLevel),
    studyLevel: cleanString(input.studyLevel),
    exams,
    subjectsStudied,
    subjectsEnjoyed,
    activityInterests,
    mobile: cleanString(input.mobile),
    gender: cleanString(input.gender),
    dateOfBirth,
    targetCountry: targetCountries[0] ?? null,
    careerPrefsFilled: true,
  };

  await prisma.studentProfile.update({
    where: { userId },
    data,
  });

  // Regenerate the derived career profile so the dashboard reflects the new data.
  try {
    await generateStudentCareerProfile(userId);
  } catch (err) {
    console.error("Career profile regeneration failed after prefs save:", err);
  }

  return { ok: true };
}
