import type { StudentDashboard } from "./dashboard.ts";

export type JourneyStatus = "done" | "current" | "upcoming";

export interface JourneyStep {
  id: string;
  title: string;
  description: string;
  href: string;
  status: JourneyStatus;
  optional?: boolean;
}

export interface StudentJourney {
  steps: JourneyStep[];
  next: JourneyStep | null;
  completedCount: number;
  total: number;
}

export interface JourneyInput {
  appointmentBooked?: boolean;
  counselorAssigned?: boolean;
}

export function buildStudentJourney(
  d: StudentDashboard,
  opts: JourneyInput = {}
): StudentJourney {
  const profileDone = d.profileCompleteness >= 60;
  const assessCount = d.assessmentCompletedCount ?? 0;
  const assessDone = assessCount >= 5;
  const matchesDone = (d.topCareerMatches?.length ?? 0) > 0;
  const educationDone = Boolean(d.educationPathways);
  const universitiesDone = (d.universityMatches?.length ?? 0) > 0;
  const shortlistDone = (d.savedCount ?? 0) > 0;
  const counselorDone = Boolean(opts.appointmentBooked);

  const raw: Array<
    Omit<JourneyStep, "status"> & { done: boolean; optional?: boolean }
  > = [
    {
      id: "profile",
      title: "Build your career profile",
      description: "Add academics, interests and preferences.",
      href: "/career-preferences",
      done: profileDone,
    },
    {
      id: "assess",
      title: "Take assessments",
      description: "Optional tests that personalize your matches.",
      href: "/assessments",
      done: assessDone,
      optional: true,
    },
    {
      id: "matches",
      title: "Discover & review career matches",
      description: "See careers that fit your profile.",
      href: "/career-matches",
      done: matchesDone,
    },
    {
      id: "education",
      title: "Explore education pathways",
      description: "Find degrees and subjects for your path.",
      href: "/education",
      done: educationDone,
    },
    {
      id: "universities",
      title: "Explore universities",
      description: "Find institutions that fit your pathway.",
      href: "/indian-colleges",
      done: universitiesDone,
    },
    {
      id: "shortlist",
      title: "Build your shortlist",
      description: "Save careers and universities you like.",
      href: "/saved",
      done: shortlistDone,
    },
    {
      id: "counselor",
      title: "Talk to your counselor",
      description: "Get a second opinion and plan next steps.",
      href: "/appointments",
      done: counselorDone,
    },
  ];

  let currentAssigned = false;
  const steps: JourneyStep[] = raw.map((s) => {
    if (s.done) return { ...s, status: "done" };
    if (s.optional) return { ...s, status: "upcoming" };
    if (!currentAssigned) {
      currentAssigned = true;
      return { ...s, status: "current" };
    }
    return { ...s, status: "upcoming" };
  });

  const next = steps.find((s) => s.status === "current") ?? null;
  const completedCount = steps.filter((s) => s.status === "done").length;

  return { steps, next, completedCount, total: steps.length };
}
