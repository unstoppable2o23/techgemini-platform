// Phase 24 — Student Registration V2: server-side (authoritative) validation.
//
// These zod schemas are the FIRST gate on every write path (register + career
// preferences). The saveCareerPreferences resolver remains the second,
// database-verifying gate (career/subject/institution ids resolve to real
// records). Between the two, arbitrary input never reaches the DB.

import { z } from "zod";

const optionalString = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label} is too long (max ${max} characters)`)
    .trim()
    .optional()
    .or(z.literal(""));

const optionalStringArray = (max: number, label: string) =>
  z
    .array(z.string().trim().max(max, `${label} entries are too long`))
    .max(100, `${label} has too many entries`)
    .optional();

const optionalBool = () => z.boolean().optional();

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name is too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name is too long"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address").max(120),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
  dateOfBirth: optionalString(20, "Date of birth"),
  mobile: z
    .string()
    .trim()
    .max(20, "Mobile number is too long")
    .regex(/^\+?[\d\s\-]+$/, "Please enter a valid mobile number")
    .optional()
    .or(z.literal("")),
  gender: optionalString(20, "Gender"),
  gradeLevel: optionalString(60, "Student status"),
  studyLevel: optionalString(100, "Student status"),
  currentProgram: optionalString(120, "Program / qualification"),
  currentProgramYear: optionalString(40, "Current year"),
  _hp: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

const prefString = (max: number, label: string) =>
  z.string().max(max, `${label} is too long`).trim().optional().or(z.literal(""));

export const careerPrefsShapeSchema = z
  .object({
    mode: z.enum(["finalize", "draft"]).optional(),
    // About You
    nationality: prefString(60, "Nationality"),
    state: prefString(80, "State"),
    mobile: prefString(30, "Mobile"),
    gender: prefString(20, "Gender"),
    dateOfBirth: prefString(20, "Date of birth"),
    // Study
    studyLevel: prefString(100, "Current level of study"),
    studyLevelOther: prefString(100, "Current level of study"),
    gradeLevel: prefString(100, "Grade"),
    highestEducation: prefString(100, "Highest education"),
    highestEducationOther: prefString(100, "Highest education"),
    averageGrade: prefString(20, "Average grade"),
    studyAbroad: prefString(20, "Study abroad"),
    currentProgram: prefString(120, "Program / qualification"),
    currentProgramYear: prefString(40, "Current year"),
    // Lookups
    careerId: prefString(64, "Career"),
    preferredCareer: prefString(150, "Career"),
    // Array fields
    exams: optionalStringArray(40, "Exams"),
    activityInterests: optionalStringArray(60, "Activities"),
    subjectsStudied: optionalStringArray(80, "Subjects"),
    subjectsEnjoyed: optionalStringArray(80, "Subjects"),
    subjectIdsStudied: optionalStringArray(80, "Subjects"),
    subjectIdsEnjoyed: optionalStringArray(80, "Subjects"),
    subjectOtherStudied: optionalStringArray(80, "Subjects"),
    subjectOtherEnjoyed: optionalStringArray(80, "Subjects"),
    targetCountries: optionalStringArray(60, "Countries"),
    targetColleges: optionalStringArray(150, "Colleges"),
    targetCollegeIds: optionalStringArray(80, "Colleges"),
    // Booleans
    careerNotFinalized: optionalBool(),
    countryNotFinalized: optionalBool(),
    collegeNotFinalized: optionalBool(),
    hasEnglishResult: optionalBool(),
    // Education goals
    tuitionBudget: prefString(60, "Budget"),
    fundingSource: prefString(150, "Funding source"),
    englishTestType: prefString(60, "English test"),
    englishTestScore: prefString(20, "English test score"),
    englishProficiency: prefString(40, "English proficiency"),
    preferredIntake: prefString(40, "Intake"),
    preferredYear: prefString(20, "Year"),
    careerPlanNotes: prefString(2000, "Career notes"),
  })
  .passthrough();

export type CareerPrefsShapeInput = z.infer<typeof careerPrefsShapeSchema>;

/**
 * Returns a friendly error message, or null when the payload conforms.
 */
export function validateRegisterPayload(body: unknown): string | null {
  const r = registerSchema.safeParse(body);
  if (!r.success) {
    const first = r.error.issues[0];
    return first?.message ?? "Please check your details and try again.";
  }
  const dob = r.data.dateOfBirth;
  if (dob) {
    const parsed = new Date(dob);
    if (isNaN(parsed.getTime())) return "Please enter a valid date of birth.";
    if (parsed.getTime() > Date.now()) return "Date of birth cannot be in the future.";
    if (parsed.getFullYear() < 1900) return "Please enter a valid date of birth.";
  }
  const mobile = r.data.mobile;
  if (mobile && !isValidMobile(mobile)) {
    return "Please enter a valid mobile number with the correct country code.";
  }
  return null;
}

/**
 * Strict mobile check (brief §6): accepts either a bare subscriber number
 * (legacy) or a dial code + national number. Dial codes are 1-4 digits and
 * never start with zero; the national part must be 5-13 digits. Combined
 * input stays within 8-15 digits when a dial code is present.
 */
function isValidMobile(value: string): boolean {
  const v = value.trim();
  if (v.startsWith("+")) {
    const body = v.slice(1).trim();
    const digits = body.replace(/[^\d]/g, "");
    if (digits.length < 8 || digits.length > 15) return false;
    const tokens = body.split(/[\s-]+/).filter(Boolean);
    if (tokens.length === 1) {
      return /^[1-9]\d+$/.test(digits);
    }
    const code = tokens[0];
    if (!/^[1-9]\d{0,3}$/.test(code)) return false;
    const national = tokens.slice(1).join("");
    return /^\d{5,13}$/.test(national);
  }
  const digits = v.replace(/[^\d]/g, "");
  return digits.length >= 6 && digits.length <= 15;
}

export function validateCareerPrefsPayload(body: unknown): string | null {
  const r = careerPrefsShapeSchema.safeParse(body);
  if (!r.success) {
    const first = r.error.issues[0];
    return first?.message ?? "Please check your details and try again.";
  }
  return null;
}