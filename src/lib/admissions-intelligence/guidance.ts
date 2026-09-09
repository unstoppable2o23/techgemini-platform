/**
 * Phase 31 — Admissions & Counselling Intelligence builder.
 *
 * PURE + DETERMINISTIC: identical inputs produce byte-identical output. No DB
 * reads, no career-engine calls, no randomness. Evidence is reused from the
 * already-vetted Medical education registry and the conservative Phase 28
 * admission-type patterns — nothing here fabricates cutoffs, deadlines, seats,
 * probabilities or eligibility verdicts.
 *
 * Medical programs reuse the Medical education registry (entrance text +
 * sources + lastReviewed) so admission facts never drift from that layer.
 * Non-medical programs get clearly-worded advice only when the national
 * pattern is well established — otherwise the state is UNKNOWN / NOT_VERIFIED.
 */
import {
  MEDICAL_DISCIPLINES,
  MEDICAL_EDUCATION_LAST_REVIEWED,
  type MedicalDisciplineInfo,
} from "../medical-education/registry.ts";
import {
  getOfficialSource,
  resolveCitedSource,
} from "./sources.ts";
import type {
  AdmissionRoute,
  AdmissionsMissingInfo,
  AdmissionsNextAction,
  AdmissionsReadiness,
  AdmissionsVerificationState,
  EntranceExamGuidance,
  OfficialSource,
  ProgramAdmissionGuidance,
  StudentAdmissionsGuidance,
} from "./types.ts";

/* ---------------------------- medical mapping ---------------------------- */

/** Well-known program-name tokens → Medical registry discipline id. */
const MEDICAL_TOKENS: Array<{ tokens: string[]; disciplineId: string }> = [
  { tokens: ["mbbs", "mbchb", "medicine (mbbs)"], disciplineId: "medicine" },
  { tokens: ["bds", "dental", "dentistry"], disciplineId: "dentistry" },
  {
    tokens: ["bams", "bhms", "bums", "bsms", "ayurveda", "ayush", "homeopathy", "homoeopathy"],
    disciplineId: "ayush",
  },
  { tokens: ["nursing", "b.sc nursing", "gnm"], disciplineId: "nursing" },
  { tokens: ["pharmacy", "pharma", "d.pharm", "b.pharm", "pharm.d"], disciplineId: "pharmacy" },
  { tokens: ["physiotherapy", "bpt"], disciplineId: "physiotherapy" },
  {
    tokens: ["bvsc", "b.v.sc", "veterinary", "animal husbandry"],
    disciplineId: "veterinary",
  },
];

const DISCIPLINE_BY_ID = new Map(
  MEDICAL_DISCIPLINES.map((d) => [d.id, d])
);

function medicalDisciplineForName(programName: string): MedicalDisciplineInfo | null {
  const name = (programName ?? "").toLowerCase();
  for (const entry of MEDICAL_TOKENS) {
    if (entry.tokens.some((t) => name.includes(t))) {
      return DISCIPLINE_BY_ID.get(entry.disciplineId) ?? null;
    }
  }
  return null;
}

/** Exam labels only where genuinely established — never invented. */
const MEDICAL_EXAM_LABEL: Record<string, string | null> = {
  medicine: "NEET-UG",
  dentistry: "NEET-UG",
  nursing: "Various (NEET-UG scores, own entrance, or merit — confirm)",
  ayush: "NEET-UG for notified AYUSH courses",
};

/* --------------------------- verification ranks -------------------------- */

export const PROGRAM_VERIFICATION_RANK: Record<
  AdmissionsVerificationState,
  number
> = {
  VERIFIED: 4,
  PARTIALLY_VERIFIED: 3,
  SOURCE_AVAILABLE: 2,
  NOT_VERIFIED: 1,
  UNKNOWN: 0,
};

/* ---------------------------- branch helpers ----------------------------- */

const ROUTE_LABELS: Record<AdmissionRoute, string> = {
  DIRECT_INSTITUTION_APPLICATION: "Direct application to the institution",
  NATIONAL_ENTRANCE: "National/common entrance route (where the institution participates)",
  STATE_ENTRANCE: "State-level entrance route (varies by state)",
  CENTRAL_COUNSELLING: "Centralized counselling (All-India quota where notified)",
  STATE_COUNSELLING: "State counselling (depends on domicile)",
  UNIVERSITY_COUNSELLING: "University/institution admission route (varies)",
  PORTFOLIO: "Portfolio/direct-review route",
  MERIT_BASED: "Merit-based admission (varies)",
  INTERVIEW: "Entrance test + interview (varies)",
  QUALIFICATION_REVIEW: "Qualification-based review (varies)",
  UNKNOWN: "Not yet established — verify with official sources",
};

function routesFor(ids: AdmissionRoute[]): ProgramAdmissionGuidance["expectedRoutes"] {
  return ids.map((route) => ({ route, label: ROUTE_LABELS[route] }));
}

const STANDARD_UNKNOWNS = [
  {
    label: "Eligibility criteria for your admission year",
    detail: "Eligibility should be verified against the official criteria — never inferred.",
  },
  {
    label: "Application windows and deadlines for your admission year",
    detail: "Dates change every year; always confirm on the official source.",
  },
  {
    label: "Current-year state/program-specific procedure",
    detail: "Counselling and quotas depend on your domicile and the institution's notified rules.",
  },
];

function medicalGuidance(
  program: { programId: string; programName: string; level: string | null; category: string | null },
  d: MedicalDisciplineInfo
): ProgramAdmissionGuidance {
  const routes: AdmissionRoute[] = d.regulatedEntrance
    ? d.id === "medicine" || d.id === "dentistry"
      ? ["NATIONAL_ENTRANCE", "CENTRAL_COUNSELLING"]
      : ["NATIONAL_ENTRANCE"]
    : ["UNIVERSITY_COUNSELLING", "MERIT_BASED"];
  const sources: OfficialSource[] = (d.sources ?? []).map(resolveCitedSource);
  const examLabel = MEDICAL_EXAM_LABEL[d.id] ?? null;
  const relevantEntranceExams: EntranceExamGuidance[] = examLabel
    ? [
        {
          name: examLabel,
          context: d.entrance,
        },
      ]
    : d.entrance
      ? [
          {
            name: "Varies — confirm which applies",
            context: d.entrance,
          },
        ]
      : [];
  const counsellingProcess =
    routes.includes("CENTRAL_COUNSELLING")
      ? "For the All-India quota, counselling is centralized (Medical Counselling Committee). State quotas run through the respective state counselling authorities — confirm the notified procedure for your domicile."
      : null;
  return {
    programId: program.programId,
    programName: program.programName,
    level: program.level,
    category: program.category,
    expectedRoutes: routesFor(routes),
    relevantEntranceExams,
    counsellingProcess,
    eligibilityGuidance: d.schoolSubjects?.length
      ? `Broad expectation: Class 12 with subjects including ${d.schoolSubjects.join(", ")}. Confirm the notified eligibility for your admission year.`
      : "Broad expectation: Class 12 completion. Confirm the notified eligibility for your admission year.",
    officialSources: sources,
    verificationState: "PARTIALLY_VERIFIED",
    needsVerification: true,
    unknownAspects: STANDARD_UNKNOWNS.map((u) => u.label),
    note: `Admission detail is sourced from the Medical education registry (reviewed ${d.lastReviewed ?? MEDICAL_EDUCATION_LAST_REVIEWED}). Confirm eligibility and dates with the official bodies for your admission year — nothing here is a guarantee.`,
    lastVerified: d.lastReviewed ?? MEDICAL_EDUCATION_LAST_REVIEWED ?? null,
  };
}

function nonMedicalGuidance(
  program: { programId: string; programName: string; level: string | null; category: string | null }
): ProgramAdmissionGuidance {
  const name = (program.programName ?? "").toLowerCase();
  const category = (program.category ?? "").toLowerCase();
  const level = (program.level ?? "").toLowerCase();

  if (category === "law") {
    return {
      programId: program.programId,
      programName: program.programName,
      level: program.level,
      category: program.category,
      expectedRoutes: routesFor(["NATIONAL_ENTRANCE", "UNIVERSITY_COUNSELLING"]),
      relevantEntranceExams: [
        {
          name: "CLAT / CUET-UG / state exams — varies",
          context:
            "Law admissions follow institution-specific routes: some National Law Universities use CLAT, others (or states) use CUET-UG or their own entrances. Verify the notified entrance per institution.",
        },
      ],
      counsellingProcess: null,
      eligibilityGuidance: "Class 12, unless the institution specifies otherwise.",
      officialSources: [
        getOfficialSource("clat-consortium")!,
        getOfficialSource("nta")!,
      ],
      verificationState: "SOURCE_AVAILABLE",
      needsVerification: true,
      unknownAspects: STANDARD_UNKNOWNS.map((u) => u.label),
      note: "Verify the notified entrance and eligibility for each institution and for your admission year.",
      lastVerified: null,
    };
  }

  if (category === "engineering" || category === "technology") {
    if (level.includes("diploma") || level.includes("certificate")) {
      return {
        programId: program.programId,
        programName: program.programName,
        level: program.level,
        category: program.category,
        expectedRoutes: routesFor(["DIRECT_INSTITUTION_APPLICATION", "MERIT_BASED"]),
        relevantEntranceExams: [],
        counsellingProcess: null,
        eligibilityGuidance: "Class 10 or Class 12, per the institution's rule.",
        officialSources: [getOfficialSource("aicte")!],
        verificationState: "SOURCE_AVAILABLE",
        needsVerification: true,
        unknownAspects: STANDARD_UNKNOWNS.map((u) => u.label),
        note: "A diploma or certificate is separate from a B.E./B.Tech degree. Confirm the institution's notified admission route.",
        lastVerified: null,
      };
    }
    return {
      programId: program.programId,
      programName: program.programName,
      level: program.level,
      category: program.category,
      expectedRoutes: routesFor(["NATIONAL_ENTRANCE", "STATE_ENTRANCE"]),
      relevantEntranceExams: [
        {
          name: "National entrance (JEE route)",
          context:
            "Applies only where the program participates (e.g. a notified JEE route). Many state and institution routes also exist — confirm which applies to your admission year.",
        },
      ],
      counsellingProcess:
        "Institutions that participate in a national joint-seat-allocation (JoSAA) round follow that process; others follow state or institution counselling — confirm the notified route.",
      eligibilityGuidance: "Class 12 (Maths + Science stream where required) — confirm the notified criteria.",
      officialSources: [
        getOfficialSource("nta")!,
        getOfficialSource("josaa")!,
        getOfficialSource("aicte")!,
      ],
      verificationState: "SOURCE_AVAILABLE",
      needsVerification: true,
      unknownAspects: STANDARD_UNKNOWNS.map((u) => u.label),
      note: "Not every engineering program shares the same exam — confirm each institution's notified entrance route for your admission year.",
      lastVerified: null,
    };
  }

  if (level.includes("master") || level.includes("postgraduate")) {
    return {
      programId: program.programId,
      programName: program.programName,
      level: program.level,
      category: program.category,
      expectedRoutes: routesFor(["UNIVERSITY_COUNSELLING", "MERIT_BASED"]),
      relevantEntranceExams: [
        {
          name: "Varies by institution",
          context: "National/state university entrances and merit; confirm which applies.",
        },
      ],
      counsellingProcess: null,
      eligibilityGuidance: "Relevant undergraduate qualification — confirm the notified criteria.",
      officialSources: [getOfficialSource("ugc")!],
      verificationState: "SOURCE_AVAILABLE",
      needsVerification: true,
      unknownAspects: STANDARD_UNKNOWNS.map((u) => u.label),
      note: "Postgraduate eligibility and entrances vary by institution — verify with the official admissions source.",
      lastVerified: null,
    };
  }

  if (category === "business") {
    return {
      programId: program.programId,
      programName: program.programName,
      level: program.level,
      category: program.category,
      expectedRoutes: routesFor(["UNIVERSITY_COUNSELLING", "INTERVIEW"]),
      relevantEntranceExams: [
        {
          name: "Varies by institution",
          context: "CAT / XAT / GMAT-style or institution-specific tests — confirm which applies.",
        },
      ],
      counsellingProcess: null,
      eligibilityGuidance: "Undergraduate qualification, per the institution's rule.",
      officialSources: [],
      verificationState: "NOT_VERIFIED",
      needsVerification: true,
      unknownAspects: ["Admission tests and interview format for each institution"].concat(
        STANDARD_UNKNOWNS.map((u) => u.label)
      ),
      note: "Management program admissions differ across institutes — verify the notified entrance route.",
      lastVerified: null,
    };
  }

  if (level.includes("diploma") || level.includes("certificate")) {
    return {
      programId: program.programId,
      programName: program.programName,
      level: program.level,
      category: program.category,
      expectedRoutes: routesFor(["DIRECT_INSTITUTION_APPLICATION", "MERIT_BASED"]),
      relevantEntranceExams: [],
      counsellingProcess: null,
      eligibilityGuidance: "Class 10 or Class 12, per the institution's rule.",
      officialSources: [],
      verificationState: "NOT_VERIFIED",
      needsVerification: true,
      unknownAspects: STANDARD_UNKNOWNS.map((u) => u.label),
      note: "Diploma admission routes vary by state and institution — confirm the notified procedure.",
      lastVerified: null,
    };
  }

  return {
    programId: program.programId,
    programName: program.programName,
    level: program.level,
    category: program.category,
    expectedRoutes: routesFor(["UNKNOWN"]),
    relevantEntranceExams: [],
    counsellingProcess: null,
    eligibilityGuidance: null,
    officialSources: [],
    verificationState: "UNKNOWN",
    needsVerification: true,
    unknownAspects: [
      "Admission route for this program",
      "Entrance and eligibility criteria",
      "Official admission source",
    ],
    note: "Nothing is established for this program yet — verify with the institution's official admissions page before planning.",
    lastVerified: null,
  };
}

/** Program-level admission guidance (pure). Null never appears for name issues. */
export function buildProgramAdmissionGuidance(input: {
  programId: string;
  programName: string;
  level: string | null;
  category: string | null;
}): ProgramAdmissionGuidance {
  const medical = medicalDisciplineForName(input.programName);
  if (medical) return medicalGuidance(input, medical);
  return nonMedicalGuidance(input);
}

/* -------------------------- student-level build -------------------------- */

const READINESS_META: Record<
  AdmissionsReadiness,
  { label: string; reason: string }
> = {
  READY_TO_RESEARCH: {
    label: "Ready to research",
    reason:
      "At least one focus pathway has an established admission route with official sources to research.",
  },
  NEEDS_VERIFICATION: {
    label: "Needs verification",
    reason:
      "Focus pathways exist, but current-year admission facts must be confirmed with official sources before planning.",
  },
  INFORMATION_MISSING: {
    label: "Information missing",
    reason:
      "No education pathway is mapped yet, so admission guidance cannot be composed.",
  },
};

const GENERAL_GUIDANCE = [
  "Admission dates, deadlines, eligibility and availability change every year — always confirm against the official source for your admission year.",
  "This is general guidance, not a guarantee. Official criteria are the only authority for eligibility and admission.",
];

function dedupe<T>(list: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of list) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

const MISSING_LABELS: Record<string, { label: string; detail: string }> = {
  "Eligibility criteria for your admission year": STANDARD_UNKNOWNS[0],
  "Application windows and deadlines for your admission year": STANDARD_UNKNOWNS[1],
  "Current-year state/program-specific procedure": STANDARD_UNKNOWNS[2],
  "Admission route for this program": {
    label: "Admission route for this program",
    detail: "Not established yet — the institution's official admissions page is the source of truth.",
  },
  "Entrance and eligibility criteria": {
    label: "Entrance and eligibility criteria",
    detail: "Not established for this program — verify with the official source.",
  },
  "Official admission source": {
    label: "Official admission source",
    detail: "No verified official source is linked for this program yet.",
  },
  "Admission tests and interview format for each institution": {
    label: "Admission tests and interview format",
    detail: "Entrance tests and interviews differ across institutions — confirm per institute.",
  },
};

/**
 * Student-level admissions view. `focusPrograms` are the recommended programs
 * already computed by the Decision Center (one engine pass) so this builder
 * never re-runs the career engine.
 */
export function buildAdmissionsGuidance(input: {
  focusPrograms: Array<{
    programId: string;
    programName: string;
    level: string | null;
    category: string | null;
  }>;
  hasCareerDirection: boolean;
  counselorAssigned?: boolean;
}): StudentAdmissionsGuidance {
  const programs = dedupe(
    input.focusPrograms.map((p) => ({ ...p })),
    (p) => p.programId ?? p.programName
  ).slice(0, 6);

  if (programs.length === 0) {
    const missingInformation: AdmissionsMissingInfo[] = [
      {
        id: "choose_direction",
        label: "Career direction",
        detail:
          "Choose a career direction so the app can map the education pathways and their admission routes.",
      },
    ];
    const nextActions: AdmissionsNextAction[] = input.hasCareerDirection
      ? [
          {
            id: "pick_program_pathway",
            label: "Review matched programs",
            detail: "Pick a program pathway so admission guidance can be composed for it.",
            href: "/decision-center",
            sourceId: null,
          },
        ]
      : [
          {
            id: "explore_career_matches",
            label: "Explore career matches",
            detail: "Start discovering careers that fit your goals.",
            href: "/career-matches",
            sourceId: null,
          },
        ];
    return {
      readiness: "INFORMATION_MISSING",
      readinessLabel: READINESS_META.INFORMATION_MISSING.label,
      readinessReason: READINESS_META.INFORMATION_MISSING.reason,
      focusPrograms: [],
      missingInformation,
      officialSources: [],
      nextActions,
      generalGuidance: GENERAL_GUIDANCE,
    };
  }

  const focusPrograms = programs.map(buildProgramAdmissionGuidance);
  const maxRank = Math.max(
    ...focusPrograms.map((p) => PROGRAM_VERIFICATION_RANK[p.verificationState])
  );
  const hasConfirmedRoute =
    focusPrograms.some((p) =>
      p.expectedRoutes.some((r) => r.route !== "UNKNOWN")
    ) && maxRank >= PROGRAM_VERIFICATION_RANK.SOURCE_AVAILABLE;
  const readiness: AdmissionsReadiness =
    maxRank >= PROGRAM_VERIFICATION_RANK.PARTIALLY_VERIFIED || hasConfirmedRoute
      ? "READY_TO_RESEARCH"
      : "NEEDS_VERIFICATION";

  const unknownLabels = dedupe(
    focusPrograms.flatMap((p) => p.unknownAspects),
    (l) => l
  ).slice(0, 6);
  const missingInformation: AdmissionsMissingInfo[] = unknownLabels.map((label) => {
    const known = MISSING_LABELS[label];
    return {
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      label: known?.label ?? label,
      detail: known?.detail ?? "Confirm with the official admission source.",
    };
  });

  const officialSources = dedupe(
    focusPrograms.flatMap((p) => p.officialSources),
    (s) => s.id
  );

  const nextActions: AdmissionsNextAction[] = [];
  for (const p of focusPrograms) {
    const primarySource = p.officialSources[0] ?? null;
    nextActions.push({
      id: `verify_${String(p.programId ?? p.programName ?? "program").replace(/[^a-z0-9_]/gi, "_")}`,
      label: `Check official sources for ${p.programName}`,
      detail: `${p.expectedRoutes[0]?.label ?? "Confirm the admission route"} — verify the notified process for your admission year.`,
      href: primarySource?.canonicalUrl ?? "/admissions",
      sourceId: primarySource?.id ?? null,
    });
  }
  if (input.counselorAssigned) {
    nextActions.push({
      id: "discuss_counselor",
      label: "Discuss admission steps with your counselor",
      detail: "An optional check-in can help you prioritize which source to verify first.",
      href: "/appointments",
      sourceId: null,
    });
  }

  return {
    readiness,
    readinessLabel: READINESS_META[readiness].label,
    readinessReason: READINESS_META[readiness].reason,
    focusPrograms,
    missingInformation,
    officialSources,
    nextActions: nextActions.slice(0, 6),
    generalGuidance: GENERAL_GUIDANCE,
  };
}

/** Look up one program's guidance inside a composed student view. */
export function focusProgramAdmission(
  guidance: StudentAdmissionsGuidance,
  programId: string | null
): ProgramAdmissionGuidance | null {
  if (!programId) return null;
  return guidance.focusPrograms.find((p) => p.programId === programId) ?? null;
}