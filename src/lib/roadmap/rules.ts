/**
 * Phase 21 — Roadmap generator (core rules).
 *
 * Turns a student's profile + career intelligence + destination into a
 * personalized, ordered set of steps. This is a CONSUMER of the frozen engine:
 * it reads top career matches, preferred career, program mappings, institution
 * matches, and StudentProfile fields. It never modifies the engine or catalog.
 *
 * Design rules (§31):
 *   - No impossible education sequencing (never suggest PG applications to a
 *     school student as the immediate step).
 *   - No exam is required without evidence; all external requirements are
 *     phrased as CHECK / REQUIRED / RECOMMENDED on official sources.
 *   - No guaranteed admission / scholarship / visa / employment.
 *   - Conservative wording; relative timing, never invented dates.
 */
import type {
  DestinationLabel,
  GeneratedRoadmap,
  RoadmapInputs,
  RoadmapMilestoneSpec,
  RoadmapStepSpec,
} from "./types.ts";
import { MILESTONE_ORDER } from "./types.ts";
import { COUNTRY_PATHWAYS, requirementQuestions, destinationLabel } from "./country-config.ts";

/**
 * Turns a destination's conservative requirement config into roadmap steps
 * (English test, standardized test, visa, scholarships, documents, credential,
 * application system). Uses CHECK/REQUIRED/RECOMMENDED wording; never fabricates.
 */
function countryRequirementSteps(destination: DestinationLabel): RoadmapStepSpec[] {
  const config = COUNTRY_PATHWAYS[destination];
  const base: RoadmapStepSpec[] = [];
  const push = (
    horizon: RoadmapStepSpec["timeHorizon"],
    category: RoadmapStepSpec["category"],
    title: string,
    description: string,
    priority: RoadmapStepSpec["priority"],
    reason?: string
  ) => {
    base.push({
      title,
      description,
      category,
      priority,
      timeHorizon: horizon,
      status: "NOT_STARTED",
      origin: "SYSTEM",
      reason,
      pathType: destination === "INDIA" ? "INDIA" : "ABROAD",
      educationLevel: "Varies by stage",
      index: 0,
    });
  };
  const qs = requirementQuestions(config);
  for (const q of qs) {
    const horizon: RoadmapStepSpec["timeHorizon"] =
      q.id === "english_test" || q.id === "standardized_test" || q.id === "documents" || q.id === "credential"
        ? "THREE_MONTHS"
        : q.id === "visa"
          ? "SIX_TWELVE_MONTHS"
          : "SIX_TWELVE_MONTHS";
    const category: RoadmapStepSpec["category"] =
      q.id === "visa" ? "VISA_IMMIGRATION"
      : q.id === "scholarship" ? "SCHOLARSHIP_FUNDING"
      : q.id === "documents" ? "DOCUMENTS"
      : q.id === "credential" ? "DOCUMENTS"
      : q.id === "english_test" ? "ENGLISH_TEST"
      : q.id === "standardized_test" ? "STANDARDIZED_TEST"
      : "APPLICATION";
    push(
      horizon,
      category,
      q.label,
      q.text,
      q.confidence === "REQUIRED" ? "HIGH" : "MEDIUM"
    );
  }
  push(
    "THREE_MONTHS",
    "APPLICATION",
    `${destinationLabel(destination)} application route`,
    `Most applications for ${destinationLabel(destination)} use ${config.applicationSystem.label.toLowerCase()}. Confirm the route for each program you shortlist. ${CHECK_INSTITUTION}`,
    "HIGH",
    `Because you are targeting study in ${destinationLabel(destination)}.`
  );
  return base;
}

type NowBuilder = () => RoadmapStepSpec[];

/** Standard wording markers for requirement confidence. */
const CHECK_INSTITUTION =
  "Check the official institution's current requirements — these can change.";

export function buildRoadmap(input: RoadmapInputs): GeneratedRoadmap {
  const specs: RoadmapStepSpec[] = [];
  const milestones: RoadmapMilestoneSpec[] = MILESTONE_ORDER.map((key, i) => ({
    key,
    label: M_MILESTONE(key),
    index: i,
  }));

  const builder = new StepBuilder(specs);
  const destination = input.destinationLabel;
  const pathType = destination === "INDIA" ? "INDIA" : "ABROAD";

  // =====================================================================
  // Stage-aware core path (the personalised spine).
  // =====================================================================
  switch (input.educationStage) {
    case "SCHOOL_CLASS10": {
      builder
        .now("Confirm your target career direction", EXPLAIN_GOAL(input), "SUBJECTS", "MEDIUM")
        .now("Choose Class 11–12 subjects to match your goal", subjectChoiceReason(input), "SUBJECTS", "HIGH")
        .now("Keep your core subjects strong", coreSubjectsReason(input), "SUBJECTS", "HIGH")
        ;
      if (destination === "INDIA") {
        builder
          .next3("Compare relevant degree programs", programCompareReason(input), "PROGRAM_SELECTION", "HIGH")
          .next3("Check entrance-exam requirements for shortlisted programs", "Some Indian programs are entrance-based; check whether your selected program/institution uses one before planning.", "ENTRANCE_EXAM", "MEDIUM")
          ;
      } else if (destination) {
        builder
          .next3("Compare relevant degree programs abroad", programCompareReason(input), "PROGRAM_SELECTION", "HIGH")
          .next3("Identify country and university shortlist", "Begin shortlisting institutions in your target destination for your selected direction.", "UNIVERSITY_SHORTLIST", "MEDIUM");
      } else {
        builder.next3("Compare relevant degree programs", programCompareReason(input), "PROGRAM_SELECTION", "HIGH");
      }
      builder
        .later("Plan Class 11–12 strategy ahead of applications", "Use this phase to build strong grades, relevant activities and any programme prerequisites before you apply.", "APPLICATION", "LOW")
        .target("Track your roadmap toward application readiness", "As you finish school, the roadmap shifts to entrance tests, applications and offers.", "OTHER", "LOW");
      break;
    }

    case "SCHOOL_CLASS12": {
      builder
        .now("Confirm your target career and degree program", EXPLAIN_GOAL(input), "PROGRAM_SELECTION", "HIGH")
        .now("Keep your Class 12 core subjects strong", coreSubjectsReason(input), "SUBJECTS", "HIGH")
        .now("Build a program and university shortlist", shortlistReason(input, destination), "UNIVERSITY_SHORTLIST", "HIGH");
      if (destination === "INDIA") {
        builder
          .now("Identify applicable entrance examinations", "Check whether your shortlisted programs/institutions require an entrance exam; only prepare for the ones that apply.", "ENTRANCE_EXAM", "HIGH")
          .now("Apply for applicable entrance examinations", "Register for the entrance exams your shortlisted programs actually require, within their official windows.", "APPLICATION", "HIGH")
          .next3("Prepare application documents", "Gather the transcripts, certificates and any statements the institutions you apply to require.", "DOCUMENTS", "MEDIUM")
          .next3("Submit program applications", "Submit applications to your shortlisted Indian institutions within their official timelines.", "APPLICATION", "HIGH")
          .later("Review offers and enrol", "Compare offers, complete enrolment and plan your funding.", "OFFER", "HIGH");
      } else if (destination) {
        builder
          .now("Check English-language and standardized-test requirements", destTestReason(destination), "ENGLISH_TEST", "HIGH")
          .now("Prepare a country & university application plan", `Plan your application for ${destinationLabel(destination)}. ${CHECK_INSTITUTION}`, "APPLICATION", "HIGH")
          .next3("Prepare documents, statement and recommendations", "Gather transcripts, any statement/personal essay, and recommendation letters the university asks for.", "DOCUMENTS", "MEDIUM")
          .next3("Submit your applications", "Submit applications within each institution's official deadlines for your intake.", "APPLICATION", "HIGH")
          .later("Plan funding and scholarships", "Research scholarships and funding for your destination; check eligibility — do not assume you qualify.", "SCHOLARSHIP_FUNDING", "MEDIUM")
          .later("Prepare for offers and visa", "When offers arrive, review them and begin the official visa process for your destination.", "VISA_IMMIGRATION", "MEDIUM")
          .target("Arrange travel, accommodation and enrolment", "Complete enrolment, travel and accommodation once your offer and visa are confirmed.", "TRAVEL_ACCOMMODATION", "LOW");
      } else {
        builder
          .next3("Decide your destination (India / abroad)", "Choose where to apply so your roadmap can show the right steps for each path.", "OTHER", "MEDIUM")
          .next3("Prepare application documents", "Gather transcripts, certificates and any statements your programs require.", "DOCUMENTS", "MEDIUM");
      }
      builder.target("Begin your degree and build career-relevant experience", "Once enrolled, focus on internships, projects and skills that support your goal.", "INTERNSHIP_PROJECTS", "LOW");
      break;
    }

    case "UNDERGRADUATE": {
      builder
        .now("Confirm your postgraduate / career goal", EXPLAIN_GOAL(input), "PROGRAM_SELECTION", "HIGH")
        .now("Check your program's postgraduate or employment path", programCompareReason(input), "SKILL_DEVELOPMENT", "HIGH")
        .now("Pursue internships and hands-on projects", "Practical experience strengthens applications and employability for your goal.", "INTERNSHIP_PROJECTS", "HIGH")
        .next3("Build key skills and portfolio", "Develop the technical and soft skills your target roles or programs look for.", "SKILL_DEVELOPMENT", "MEDIUM")
        .later("Shortlist postgraduate programs or career options", "Compare options that build on your degree toward your goal.", "PROGRAM_SELECTION", "MEDIUM")
        .target("Prepare applications to your chosen next step", "When you're close to applying, prepare tests, documents and applications for your path.", "APPLICATION", "LOW");
      break;
    }

    case "POSTGRADUATE": {
      builder
        .now("Clarify your postgraduate goal", EXPLAIN_GOAL(input), "PROGRAM_SELECTION", "HIGH")
        .now("Map your qualifications to your target roles", "Confirm how your postgraduate study supports your target career.", "SKILL_DEVELOPMENT", "HIGH")
        .next3("Build projects, research and professional experience", "Strengthen the evidence for your target roles or further study.", "INTERNSHIP_PROJECTS", "MEDIUM")
        .later("Shortlist jobs, further study or certifications", "Compare the next opportunities your postgraduate path unlocks.", "CAREER_PREPARATION", "MEDIUM")
        .target("Prepare for applications or interviews", "Tailor CVs, statements and references for your chosen next step.", "CAREER_PREPARATION", "LOW");
      break;
    }

    case "CAREER_SWITCHER": {
      builder
        .now("Confirm the new career direction you are targeting", EXPLAIN_GOAL(input), "PROGRAM_SELECTION", "HIGH")
        .now("Identify prerequisite knowledge and bridge skills", "Check what foundational knowledge the new field requires before you commit to a program.", "SKILL_DEVELOPMENT", "HIGH")
        .next3("Research programs or certifications for the switch", programCompareReason(input), "PROGRAM_SELECTION", "HIGH")
        .later("Build a transition portfolio", "Projects, coursework or certifications that show your new direction.", "INTERNSHIP_PROJECTS", "MEDIUM")
        .target("Prepare applications for your new path", "Prepare applications, statements and references for your target program or role.", "CAREER_PREPARATION", "LOW");
      break;
    }

    case "UNKNOWN":
    default: {
      builder
        .now("Complete your profile so we can personalise this roadmap", "Our guidance is personalised from your profile — share your education level, target career and destination for a tailored plan.", "OTHER", "HIGH")
        .now("Confirm your target career direction", "Choose a direction to explore so the roadmap can recommend relevant programs and universities.", "PROGRAM_SELECTION", "HIGH")
        .later("Explore programs and universities for your goal", "Once your goal is set, we can map programs, universities and next actions.", "PROGRAM_SELECTION", "LOW");
      break;
    }
  }

  // =====================================================================
  // Destination-specific requirements (added for abroad where meaningful).
  // Uses conservative wording and never fabricates requirements.
  // =====================================================================
  if (destination && destination !== "INDIA") {
    // Add conservative destination requirement steps, but avoid duplicating
    // steps the stage-template already covered by the same category.
    const existingCategories = new Set(specs.map((s) => s.category));
    const countrySteps = countryRequirementSteps(destination).filter(
      (s) => !existingCategories.has(s.category)
    );
    specs.push(...countrySteps);
  }

  const deduped = dedupeSteps(specs, input);
  const progress = input.educationStage === "UNKNOWN" ? 0 : computeProgress(deduped);

  return {
    version: 1,
    goalCareerId: input.goalCareerId ?? input.topCareerId ?? null,
    goalCareerName: input.goalCareerName ?? input.topCareerName ?? null,
    destination: input.destination ?? null,
    destinationLabel: destination,
    pathType: input.destinationLabel ? (input.destinationLabel === "INDIA" ? "INDIA" : "ABROAD") : undefined,
    educationStage: input.educationStage,
    currentStage: currentStageLabel(input.educationStage),
    progress,
    steps: deduped,
    milestones,
    snapshot: makeSnapshot(input),
  };
}

/* ------------------------------- helpers ------------------------------- */

function M_MILESTONE(key: string): string {
  switch (key) {
    case "NOW": return "Do this now";
    case "NEXT_3_MONTHS": return "Next 3 months";
    case "NEXT_6_12_MONTHS": return "Next 6–12 months";
    case "APPLICATION": return "Application phase";
    case "TARGET": return "Reaching your goal";
    default: return key;
  }
}

function currentStageLabel(stage: RoadmapInputs["educationStage"]): string | undefined {
  switch (stage) {
    case "SCHOOL_CLASS10": return "School (Class 10)";
    case "SCHOOL_CLASS12": return "School (Class 12)";
    case "UNDERGRADUATE": return "Undergraduate";
    case "POSTGRADUATE": return "Postgraduate";
    case "CAREER_SWITCHER": return "Career transition";
    default: return undefined;
  }
}

/** Chained builder so steps read naturally. */
class StepBuilder {
  private readonly out: RoadmapStepSpec[];

  constructor(out: RoadmapStepSpec[]) {
    this.out = out;
  }

  private push(
    horizon: "NOW" | "THREE_MONTHS" | "SIX_TWELVE_MONTHS" | "LONGER_TERM",
    title: string,
    description: string,
    category: RoadmapStepSpec["category"],
    priority: RoadmapStepSpec["priority"],
    reason?: string
  ) {
    this.out.push({
      title,
      description,
      category,
      priority,
      status: "NOT_STARTED",
      timeHorizon: horizon,
      reason,
      origin: "SYSTEM",
      index: this.out.length,
    });
    return this;
  }

  now(title: string, description: string, category: RoadmapStepSpec["category"], priority: RoadmapStepSpec["priority"], reason?: string) {
    return this.push("NOW", title, description, category, priority, reason);
  }
  next3(title: string, description: string, category: RoadmapStepSpec["category"], priority: RoadmapStepSpec["priority"], reason?: string) {
    return this.push("THREE_MONTHS", title, description, category, priority, reason);
  }
  later(title: string, description: string, category: RoadmapStepSpec["category"], priority: RoadmapStepSpec["priority"], reason?: string) {
    return this.push("SIX_TWELVE_MONTHS", title, description, category, priority, reason);
  }
  target(title: string, description: string, category: RoadmapStepSpec["category"], priority: RoadmapStepSpec["priority"], reason?: string) {
    return this.push("LONGER_TERM", title, description, category, priority, reason);
  }
}

function EXPLAIN_GOAL(input: RoadmapInputs): string {
  if (input.goalCareerName) {
    return `Your roadmap is built around reaching a ${input.goalCareerName.toLowerCase()} path. Review this direction with your counselor and confirm it fits your goals.`;
  }
  if (input.topCareerName) {
    return `Your strongest recommended direction is ${input.topCareerName.toLowerCase()}. Use this as your working goal and confirm it with your counselor.`;
  }
  return "Set a target career direction so we can personalise the next steps in this roadmap.";
}

function subjectChoiceReason(input: RoadmapInputs): string {
  if (input.recommendedSubjects?.length) {
    return `Your recommended direction typically builds on: ${input.recommendedSubjects.slice(0, 4).join(", ")}. Confirm the subject choices with your school and counselor.`;
  }
  return "Choose the Class 11–12 subject combination that supports your intended career direction.";
}

function coreSubjectsReason(input: RoadmapInputs): string {
  const subs = input.subjectsEnjoyed?.length
    ? input.subjectsEnjoyed.slice(0, 4).join(", ")
    : "your core subjects";
  if (input.goalCareerName) {
    return `Strong grades in ${subs} support a ${input.goalCareerName.toLowerCase()} direction.`;
  }
  return `Keep ${subs} strong — they matter for your next applications.`;
}

function programCompareReason(input: RoadmapInputs): string {
  if (input.programNames?.length) {
    const names = input.programNames.slice(0, 4).join(", ");
    return `Programs like ${names} are mapped to your recommended direction. Compare their content and prerequisites.`;
  }
  if (input.recommendedDegrees?.length) {
    return `A degree in areas such as ${input.recommendedDegrees.slice(0, 4).join(", ")} commonly supports your direction.`;
  }
  return "Compare degree programs linked to your recommended career direction.";
}

function shortlistReason(input: RoadmapInputs, destination?: DestinationLabel | null): string {
  const where = destination && destination !== "INDIA" ? ` in ${destinationLabel(destination)}` : "";
  if (input.institutionNames?.length) {
    return `You can already see options like ${input.institutionNames.slice(0, 4).join(", ")}${where}. Build a shortlist that fits your goals and budget.`;
  }
  return `Start shortlisting institutions${where} for your selected program.`;
}

function destTestReason(destination: DestinationLabel): string {
  return `For ${destinationLabel(destination)}, applications often involve English-language and possibly standardized tests. Check each institution's official requirements rather than assuming a specific test.`;
}

/** Removes duplicate step titles (case-insensitive) and keeps relative order. */
function dedupeSteps(steps: RoadmapStepSpec[], input: RoadmapInputs): RoadmapStepSpec[] {
  const seen = new Set<string>();
  const out: RoadmapStepSpec[] = [];
  for (const s of steps) {
    const key = s.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  // Reindex sequentially after dedupe.
  return out.map((s, i) => ({ ...s, index: i }));
}

/** Progress = completed planned actions only; never equated with outcomes. */
function computeProgress(steps: RoadmapStepSpec[]): number {
  if (!steps.length) return 0;
  const counted = steps.filter((s) => s.status !== "NOT_APPLICABLE");
  if (!counted.length) return 0;
  const done = steps.filter((s) => s.status === "COMPLETED").length;
  return Math.round((done / counted.length) * 100);
}

function makeSnapshot(input: RoadmapInputs): Record<string, unknown> {
  return {
    career: input.goalCareerName ?? input.topCareerName ?? null,
    careerSource: input.goalCareerId ? "preferred" : input.topCareerId ? "match" : null,
    destination: input.destination ?? null,
    destinationLabel: input.destinationLabel ?? null,
    educationStage: input.educationStage,
    exams: input.exams ?? [],
    recommendedDegrees: input.recommendedDegrees ?? [],
    programNames: input.programNames ?? [],
    institutionNames: input.institutionNames ?? [],
    tuitionBudget: input.tuitionBudget ?? null,
    generatedAt: new Date().toISOString(),
  };
}