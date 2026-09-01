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
  // About You
  nationality?: string;
  state?: string;
  mobile?: string;
  gender?: string;
  dateOfBirth?: string | null;
  // Study
  studyLevel?: string;
  studyLevelOther?: string;
  gradeLevel?: string;
  highestEducation?: string;
  highestEducationOther?: string;
  averageGrade?: string;
  studyAbroad?: string; // "yes" | "no" | "unsure"
  exams?: string[];
  activityInterests?: string[];
  // Subjects (names/ids are canonical and validated; custom "Other" text is explicit)
  subjectsStudied?: string[];
  subjectsEnjoyed?: string[];
  subjectIdsStudied?: string[];
  subjectIdsEnjoyed?: string[];
  subjectOtherStudied?: string[];
  subjectOtherEnjoyed?: string[];
  // Career
  preferredCareer?: string;
  careerId?: string;
  careerNotFinalized?: boolean;
  // Education Goals
  targetCountries?: string[];
  countryNotFinalized?: boolean;
  targetColleges?: string[];
  targetCollegeIds?: string[];
  collegeNotFinalized?: boolean;
  tuitionBudget?: string;
  fundingSource?: string;
  hasEnglishResult?: boolean;
  englishTestType?: string;
  englishTestScore?: string;
  englishProficiency?: string;
  preferredIntake?: string;
  preferredYear?: string;
  careerPlanNotes?: string;
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

function normalizeStudyAbroad(v?: string): "yes" | "no" | "unsure" | "" {
  const s = (v || "").toLowerCase().trim();
  if (s === "yes" || s === "y" || s === "true") return "yes";
  if (s === "no" || s === "n" || s === "false") return "no";
  if (s === "unsure" || s === "not sure" || s === "not sure yet" || s === "maybe") return "unsure";
  return "";
}

/**
 * Validates a student's onboarding/career submission and persists it to their
 * StudentProfile. References to Career / Subject / University / IndianInstitution
 * records are verified to exist (security: never persist arbitrary foreign-key
 * strings), then the derived career profile is regenerated for the dashboard.
 */
export async function saveCareerPreferences(
  userId: string,
  input: SaveCareerPrefsInput
): Promise<{ ok: true }> {
  const studyAbroad = normalizeStudyAbroad(input.studyAbroad);
  const abroadRequired = studyAbroad === "yes";

  // ---- Current study level (single source; gradeLevel is derived from it) ----
  let studyLevel = cleanString(input.studyLevel);
  if (studyLevel && studyLevel.toLowerCase() === "other") {
    const other = cleanString(input.studyLevelOther);
    if (!other) throw new PrefsValidationError("Please specify your current level of study.");
    studyLevel = other;
  }
  // Preserve an explicit gradeLevel if provided, otherwise derive from studyLevel.
  const gradeLevel = cleanString(input.gradeLevel) || studyLevel;

  // ---- Highest completed education (context-aware; "Other" reveals a spec) ----
  let highestEducation = cleanString(input.highestEducation);
  if (highestEducation && highestEducation.toLowerCase() === "other") {
    const other = cleanString(input.highestEducationOther);
    if (!other) throw new PrefsValidationError("Please specify your highest completed education.");
    highestEducation = other;
  }

  // ---- Preferred career (canonical by id, legacy by name, or not finalized) ----
  let preferredCareer: string | null = null;
  let preferredCareerId: string | null = null;
  if (input.careerNotFinalized) {
    preferredCareer = null;
    preferredCareerId = null;
  } else if (input.careerId) {
    const career = await prisma.career.findFirst({
      where: { id: input.careerId, isActive: true },
      select: { id: true, name: true },
    });
    if (!career) {
      throw new PrefsValidationError("We couldn't find that career. Please choose from the available careers.");
    }
    preferredCareer = career.name;
    preferredCareerId = career.id;
  } else if (input.preferredCareer) {
    const name = cleanString(input.preferredCareer);
    if (!name) {
      throw new PrefsValidationError('Please choose a preferred career or select "I haven\'t decided yet".');
    }
    const career = await prisma.career.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, isActive: true },
      select: { id: true, name: true },
    });
    if (!career) {
      throw new PrefsValidationError("We couldn't find that career. Please choose from the available careers.");
    }
    preferredCareer = career.name;
    preferredCareerId = career.id;
  } else {
    throw new PrefsValidationError('Please choose a preferred career or select "I haven\'t decided yet".');
  }

  // ---- Subjects (resolve canonical ids to names; validate canonical names) ----
  const subjectIdsStudied = cleanArray(input.subjectIdsStudied);
  const subjectIdsEnjoyed = cleanArray(input.subjectIdsEnjoyed);
  const idName = new Map<string, string>();
  const allIds = Array.from(new Set([...subjectIdsStudied, ...subjectIdsEnjoyed]));
  if (allIds.length) {
    const found = await prisma.subject.findMany({
      where: { id: { in: allIds }, isActive: true },
      select: { id: true, name: true },
    });
    for (const s of found) idName.set(s.id, s.name);
    const missing = allIds.filter((id) => !idName.has(id));
    if (missing.length) {
      throw new PrefsValidationError("One or more selected subjects are not valid. Please choose from the list.");
    }
  }
  // Canonical subject names submitted directly must exist in the taxonomy.
  const nameStudied = cleanArray(input.subjectsStudied);
  const nameEnjoyed = cleanArray(input.subjectsEnjoyed);
  if (nameStudied.length || nameEnjoyed.length) {
    const wanted = Array.from(new Set([...nameStudied, ...nameEnjoyed]));
    const found = await prisma.subject.findMany({
      where: { name: { in: wanted, mode: "insensitive" }, isActive: true },
      select: { name: true },
    });
    const foundNames = new Set(found.map((s) => s.name.toLowerCase()));
    const unknown = wanted.filter((w) => !foundNames.has(w.toLowerCase()));
    if (unknown.length) {
      throw new PrefsValidationError(`Subject(s) not recognized: ${unknown.join(", ")}. Choose subjects from the list.`);
    }
  }
  const subjectOtherStudied = cleanArray(input.subjectOtherStudied);
  const subjectOtherEnjoyed = cleanArray(input.subjectOtherEnjoyed);
  const subjectsStudied = Array.from(
    new Set([
      ...subjectIdsStudied.map((id) => idName.get(id)).filter(Boolean),
      ...nameStudied,
      ...subjectOtherStudied,
    ])
  );
  const subjectsEnjoyed = Array.from(
    new Set([
      ...subjectIdsEnjoyed.map((id) => idName.get(id)).filter(Boolean),
      ...nameEnjoyed,
      ...subjectOtherEnjoyed,
    ])
  );

  // ---- Target colleges (resolve canonical institution ids to names) ----
  const targetCollegeIds = cleanArray(input.targetCollegeIds);
  const collegeName = new Map<string, string>();
  if (targetCollegeIds.length) {
    const unis = await prisma.university.findMany({
      where: { id: { in: targetCollegeIds } },
      select: { id: true, name: true },
    });
    const inds = await prisma.indianInstitution.findMany({
      where: { id: { in: targetCollegeIds } },
      select: { id: true, name: true },
    });
    for (const u of unis) collegeName.set(u.id, u.name);
    for (const i of inds) collegeName.set(i.id, i.name);
    const missing = targetCollegeIds.filter((id) => !collegeName.has(id));
    if (missing.length) {
      throw new PrefsValidationError("One or more selected colleges are not valid. Please choose from the list.");
    }
  }
  const targetColleges = Array.from(
    new Set([...targetCollegeIds.map((id) => collegeName.get(id)).filter(Boolean), ...cleanArray(input.targetColleges)])
  );

  // ---- Countries ----
  const targetCountries = cleanArray(input.targetCountries);
  const countryNotFinalized = Boolean(input.countryNotFinalized);
  const collegeNotFinalized = Boolean(input.collegeNotFinalized);

  // Study-abroad planning gates the abroad-specific questions so domestic
  // students are never forced through them.
  if (abroadRequired) {
    if (targetCountries.length === 0 && !countryNotFinalized) {
      throw new PrefsValidationError('Please add at least one country or select "I haven\'t finalized the country yet".');
    }
    if (targetColleges.length === 0 && !collegeNotFinalized) {
      throw new PrefsValidationError('Please add at least one college or select "I haven\'t finalized the college yet".');
    }
    if (!cleanString(input.tuitionBudget)) {
      throw new PrefsValidationError("Please select your annual tuition budget.");
    }
  }

  const activityInterests = cleanArray(input.activityInterests);
  const exams = cleanArray(input.exams);

  const hasEnglishResult = Boolean(input.hasEnglishResult);
  if (hasEnglishResult) {
    if (!input.englishTestType) throw new PrefsValidationError("Please select an English exam type.");
    const score = parseFloat(String(input.englishTestScore ?? ""));
    if (!input.englishTestScore || isNaN(score)) {
      throw new PrefsValidationError("Please enter your overall English test score.");
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
      throw new PrefsValidationError("Average grade must be between 0 and 100.");
    }
  }

  const data: Record<string, unknown> = {
    nationality: cleanString(input.nationality),
    state: cleanString(input.state),
    mobile: cleanString(input.mobile),
    gender: cleanString(input.gender),
    dateOfBirth,
    studyLevel,
    studyAbroad,
    gradeLevel,
    highestEducation,
    averageGrade,
    exams,
    activityInterests,
    subjectsStudied,
    subjectsEnjoyed,
    preferredCareer,
    preferredCareerId,
    targetCountries,
    targetColleges,
    tuitionBudget: cleanString(input.tuitionBudget),
    fundingSource: cleanString(input.fundingSource),
    hasEnglishResult,
    englishTestType: hasEnglishResult ? cleanString(input.englishTestType) : null,
    englishTestScore: hasEnglishResult ? cleanString(input.englishTestScore) : null,
    englishProficiency: hasEnglishResult ? null : cleanString(input.englishProficiency),
    preferredIntake: cleanString(input.preferredIntake),
    preferredYear: cleanString(input.preferredYear),
    careerPlanNotes: cleanString(input.careerPlanNotes),
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
