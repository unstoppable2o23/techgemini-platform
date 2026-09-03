/**
 * Phase 21 — Roadmap service layer.
 *
 * Server-side orchestration for the student study roadmap. It:
 *   - loads the student's profile + frozen-engine career intelligence
 *   - detects education stage + destination
 *   - generates a personalized roadmap via `buildRoadmap`
 *   - persists it, preserving COMPLETED / counselor-authored steps across
 *     regeneration (future-step-only rewriting, versioning).
 *
 * Authorization is enforced by the calling API routes (student owns their
 * roadmap; counselors must pass the tenant/counselor gate). This service is
 * deliberately not a full authorization boundary by itself.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma, RoadmapStepCategory, RoadmapPriority, RoadmapStepOrigin, RoadmapStepStatus, RoadmapTimeHorizon } from "@prisma/client";
import { getCareerMatches } from "@/lib/career-matching/engine.ts";
import { getCareerPrograms } from "@/lib/career-program.ts";
import { getUniversityMatchesForStudent } from "@/lib/university-matching/engine.ts";
import type { GeneratedRoadmap, RoadmapInputs, RoadmapStepSpec } from "./types.ts";
import { buildRoadmap } from "./rules.ts";
import { detectEducationStage } from "./education-stage.ts";
import { resolveDestination, destinationLabel, SUPPORTED_DESTINATIONS } from "./country-config.ts";

export interface RoadmapLoadInput {
  userId: string;
  /** Optional override destination (e.g. from a counselor or a switch request). */
  destinationOverride?: string | null;
  /** Optional override preferred career id. */
  careerOverrideId?: string | null;
}

export interface RoadmapChangeAction {
  ok: boolean;
  error?: string;
  roadmap?: unknown;
}

export const normalizeDestination = resolveDestination;
export { destinationLabel, SUPPORTED_DESTINATIONS };

/**
 * Gathers the inputs the generator needs, reusing the frozen engine's outputs
 * (top career match, preferred career) and the existing catalog services.
 */
export async function loadRoadmapInputs(opts: RoadmapLoadInput): Promise<RoadmapInputs> {
  const { userId, destinationOverride, careerOverrideId } = opts;

  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  // Career intelligence (frozen engine).
  let topMatch: { careerId: string; careerName: string } | null = null;
  try {
    const matches = await getCareerMatches(userId, { limit: 6 });
    if (matches?.matches?.length) {
      const top = matches.matches[0];
      topMatch = { careerId: top.career.id, careerName: top.career.name };
    }
  } catch {
    topMatch = null; // low-information students are handled gracefully below
  }

  const goalCareerId = careerOverrideId ?? studentProfile?.preferredCareerId ?? topMatch?.careerId ?? null;
  const goalCareerName = studentProfile?.preferredCareer ?? topMatch?.careerName ?? null;

  // Programs mapped to the goal career.
  let programNames: string[] = [];
  try {
    if (goalCareerId) {
      const programs = await getCareerPrograms(goalCareerId);
      programNames = (programs ?? []).slice(0, 6).map((p) => p.programName).filter(Boolean) as string[];
    }
  } catch {
    programNames = [];
  }

  // Destination.
  const destinationRaw = destinationOverride ?? studentProfile?.targetCountry ?? null;
  const destinationLabel1 = resolveDestination(destinationRaw);

  // University / institution names (best-effort from matching — may be empty for low-info).
  let institutionNames: string[] = [];
  try {
    const univ = await getUniversityMatchesForStudent(userId, { limit: 4 });
    institutionNames = ((univ as { matches?: { university?: { name?: string } | string | null }[] }).matches ?? [])
      .map((m) => (typeof m.university === "object" && m.university?.name) || "")
      .filter(Boolean);
  } catch {
    institutionNames = [];
  }

  const educationStage = detectEducationStage({
    gradeLevel: studentProfile?.gradeLevel,
    studyLevel: studentProfile?.studyLevel,
    highestEducation: studentProfile?.highestEducation,
  });

  return {
    userId,
    goalCareerId,
    goalCareerName: goalCareerName ?? null,
    topCareerId: topMatch?.careerId ?? null,
    topCareerName: topMatch?.careerName ?? null,
    preferredCareer: studentProfile?.preferredCareer ?? null,
    destination: destinationRaw,
    destinationLabel: destinationLabel1,
    educationStage,
    gradeLevel: studentProfile?.gradeLevel,
    studyLevel: studentProfile?.studyLevel,
    highestEducation: studentProfile?.highestEducation,
    averageGrade: studentProfile?.averageGrade,
    tuitionBudget: studentProfile?.tuitionBudget,
    exams: studentProfile?.exams ?? [],
    subjectsStudied: studentProfile?.subjectsStudied ?? [],
    subjectsEnjoyed: studentProfile?.subjectsEnjoyed ?? [],
    recommendedDegrees: [],
    recommendedCareerNames: [topMatch?.careerName].filter(Boolean) as string[],
    recommendedSubjects: studentProfile?.subjectsStudied ?? [],
    programNames,
    institutionNames,
    targetIntake: studentProfile?.preferredIntake,
    targetYear: studentProfile?.preferredYear,
  };
}

/**
 * Returns a fully generated roadmap without persisting (used by tests/audit).
 */
export async function generateRoadmap(opts: RoadmapLoadInput): Promise<GeneratedRoadmap & { inputs: RoadmapInputs }> {
  const inputs = await loadRoadmapInputs(opts);
  const generated = buildRoadmap(inputs);
  return { ...generated, inputs };
}

/**
 * Gets the current roadmap for a student. Creates on-demand when none exists.
 */
export async function getOrCreateRoadmap(userId: string): Promise<GeneratedRoadmap | null> {
  const existing = await prisma.studentRoadmap.findUnique({
    where: { studentId: userId },
    include: { steps: { orderBy: { index: "asc" } }, milestones: { orderBy: { index: "asc" } } },
  });
  if (existing) return mapToGenerated(existing);
  return createRoadmap({ userId });
}

export async function createRoadmap(opts: RoadmapLoadInput): Promise<GeneratedRoadmap | null> {
  const generated = await generateRoadmap(opts);
  const spec = buildRoadmap(generated.inputs);

  // Create/replace rows with a consistent two-phase write (create + createMany).
  const roadmap = await prisma.$transaction(async (tx) => {
    const existing = await tx.studentRoadmap.findUnique({ where: { studentId: opts.userId } });
    let rowId: string;
    let version: number;
    if (existing) {
      rowId = existing.id;
      version = existing.version + 1;
      await tx.roadmapStep.deleteMany({ where: { roadmapId: rowId } });
      await tx.roadmapMilestone.deleteMany({ where: { roadmapId: rowId } });
      await tx.studentRoadmap.update({
        where: { id: rowId },
        data: {
          version,
          goalCareerId: spec.goalCareerId,
          goalCareerName: spec.goalCareerName,
          destination: spec.destination,
          pathType: spec.pathType,
          educationStage: spec.educationStage,
          currentStage: spec.currentStage,
          progress: spec.progress,
          snapshot: spec.snapshot as object | undefined,
          lastGeneratedAt: new Date(),
        },
      });
    } else {
      const created = await tx.studentRoadmap.create({
        data: {
          studentId: opts.userId,
          version: 1,
          goalCareerId: spec.goalCareerId,
          goalCareerName: spec.goalCareerName,
          destination: spec.destination,
          pathType: spec.pathType,
          educationStage: spec.educationStage,
          currentStage: spec.currentStage,
          progress: spec.progress,
          snapshot: spec.snapshot as object | undefined,
          lastGeneratedAt: new Date(),
        },
      });
      rowId = created.id;
      version = 1;
    }
    await tx.roadmapStep.createMany({
      data: spec.steps.map((s) => stepData(rowId, version, s)),
    });
    await tx.roadmapMilestone.createMany({
      data: spec.milestones.map((m) => ({ roadmapId: rowId, version, key: m.key, label: m.label, index: m.index })),
    });
    return tx.studentRoadmap.findUnique({
      where: { id: rowId },
      include: { steps: { orderBy: { index: "asc" } }, milestones: { orderBy: { index: "asc" } } },
    });
  });
  return roadmap ? mapToGenerated(roadmap) : null;
}

/**
 * Regenerates FUTURE steps only. Completed steps and counselor-originated steps
 * are preserved. Version increments on any regen that changes future steps.
 */
export async function regenerateRoadmap(
  userId: string,
  opts: { destinationOverride?: string | null; careerOverrideId?: string | null } = {}
): Promise<RoadmapChangeAction> {
  const existing = await prisma.studentRoadmap.findUnique({
    where: { studentId: userId },
    include: { steps: true },
  });
  if (!existing) {
    const created = await createRoadmap({ userId, destinationOverride: opts.destinationOverride, careerOverrideId: opts.careerOverrideId });
    return { ok: true, roadmap: created };
  }

  const generated = await generateRoadmap({ userId, destinationOverride: opts.destinationOverride, careerOverrideId: opts.careerOverrideId });
  const newVersion = existing.version + 1;

  // Preserve completed + counselor-originated steps.
  const preserved = existing.steps.filter(
    (s) => s.status === "COMPLETED" || s.origin === "COUNSELOR"
  );

  // Fresh step timeline from the generator.
  const fresh = generated.steps.map((s) => stepData(existing.id, newVersion, s));

  // Merge: keep preserved (completed/counselor) in place, fill the rest from fresh.
  // Simpler deterministic approach: order fresh steps, then re-position preserved
  // completed steps at the top by their original category.
  const preservedCompleted = preserved.filter((s) => s.status === "COMPLETED");
  const preservedCounselor = preserved.filter((s) => s.origin === "COUNSELOR");
  const keptTitles = new Set([...preservedCompleted.map((s) => s.title.toLowerCase())]);

  const merged = fresh
    .filter((s) => !keptTitles.has(s.title.toLowerCase()))
    .map((s, i) => ({ ...s, index: i }));

  const counselorSteps: StepRow[] = preservedCounselor.map((s, i) =>
    rewriteRow(existing.id, newVersion, s, s.status as RoadmapStepStatus)
  );

  const nextIndex = counselorSteps.length;
  const preservedCompletedData: StepRow[] = preservedCompleted.map((s, i) =>
    rewriteRow(existing.id, newVersion, { ...s, index: nextIndex + i }, "COMPLETED")
  );

  const finalSteps: StepRow[] = [
    ...counselorSteps,
    ...preservedCompletedData,
    ...merged.map((s, k) => ({
      roadmapId: existing.id,
      version: newVersion,
      index: k + nextIndex + preservedCompletedData.length,
      title: s.title,
      description: s.description,
      category: s.category,
      priority: s.priority,
      timeHorizon: s.timeHorizon,
      status: "NOT_STARTED" as RoadmapStepStatus,
      reason: s.reason,
      dependency: s.dependency,
      sourceLabel: s.sourceLabel,
      sourceUrl: s.sourceUrl,
      pathType: s.pathType,
      educationLevel: s.educationLevel,
      origin: "SYSTEM" as RoadmapStepOrigin,
      counselorNote: null,
      dueHint: s.dueHint,
    })),
  ];

  await prisma.$transaction(async (tx) => {
    await tx.roadmapStep.deleteMany({ where: { roadmapId: existing.id } });
    await tx.roadmapStep.createMany({ data: finalSteps });
    await tx.roadmapMilestone.deleteMany({ where: { roadmapId: existing.id } });
    await tx.roadmapMilestone.createMany({
      data: generated.milestones.map((m) => ({ roadmapId: existing.id, version: newVersion, key: m.key, label: m.label, index: m.index })),
    });
    await tx.studentRoadmap.update({
      where: { id: existing.id },
      data: {
        version: newVersion,
        goalCareerId: generated.goalCareerId,
        goalCareerName: generated.goalCareerName,
        destination: generated.destination,
        pathType: generated.pathType,
        educationStage: generated.educationStage,
        currentStage: generated.currentStage,
        progress: computeProgressOf(finalSteps),
        snapshot: generated.snapshot as object | undefined,
        lastGeneratedAt: new Date(),
      },
    });
  });

  const updated = await prisma.studentRoadmap.findUnique({
    where: { studentId: userId },
    include: { steps: { orderBy: { index: "asc" } }, milestones: { orderBy: { index: "asc" } } },
  });
  return { ok: true, roadmap: updated ? mapToGenerated(updated) : null };
}

export async function updateStepStatus(
  userId: string,
  stepId: string,
  status: string,
  opts: { note?: string } = {}
): Promise<RoadmapChangeAction> {
  const roadmap = await prisma.studentRoadmap.findUnique({ where: { studentId: userId } });
  if (!roadmap) return { ok: false, error: "No roadmap found" };
  const step = await prisma.roadmapStep.findUnique({ where: { id: stepId } });
  if (!step || step.roadmapId !== roadmap.id) return { ok: false, error: "Step not found" };
  const allowed = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SKIPPED", "NOT_APPLICABLE"];
  if (!allowed.includes(status)) return { ok: false, error: "Invalid status" };

  await prisma.roadmapStep.update({
    where: { id: stepId },
    data: { status: status as never, counselorNote: opts.note ?? step.counselorNote },
  });

  // Recompute progress.
  const all = await prisma.roadmapStep.findMany({ where: { roadmapId: roadmap.id } });
  const completed = all.filter((s) => s.status === "COMPLETED").length;
  const counted = all.filter((s) => s.status !== "NOT_APPLICABLE").length;
  const progress = counted ? Math.round((completed / counted) * 100) : 0;
  await prisma.studentRoadmap.update({ where: { id: roadmap.id }, data: { progress } });

  const updated = await prisma.studentRoadmap.findUnique({
    where: { studentId: userId },
    include: { steps: { orderBy: { index: "asc" } }, milestones: { orderBy: { index: "asc" } } },
  });
  return { ok: true, roadmap: updated ? mapToGenerated(updated) : null };
}

export async function addCounselorStep(userId: string, step: Omit<RoadmapStepSpec, "origin" | "index" | "status"> & { title: string; description: string; counselorNote?: string }): Promise<RoadmapChangeAction> {
  const roadmap = await prisma.studentRoadmap.findUnique({ where: { studentId: userId } });
  if (!roadmap) return { ok: false, error: "No roadmap found" };
  const maxIndex = await prisma.roadmapStep.aggregate({ where: { roadmapId: roadmap.id }, _max: { index: true } });
  const index = (maxIndex._max.index ?? 0) + 1;
  const created = await prisma.roadmapStep.create({
    data: {
      roadmapId: roadmap.id,
      version: roadmap.version,
      index,
      title: step.title,
      description: step.description,
      category: step.category,
      priority: step.priority ?? "MEDIUM",
      timeHorizon: step.timeHorizon,
      status: "NOT_STARTED",
      reason: step.reason,
      sourceLabel: step.sourceLabel,
      pathType: step.pathType,
      educationLevel: step.educationLevel,
      origin: "COUNSELOR",
      counselorNote: step.counselorNote,
      dueHint: step.dueHint,
    },
  });
  void created;
  return { ok: true };
}

export async function removeStep(userId: string, stepId: string): Promise<RoadmapChangeAction> {
  const roadmap = await prisma.studentRoadmap.findUnique({ where: { studentId: userId } });
  if (!roadmap) return { ok: false, error: "No roadmap found" };
  await prisma.roadmapStep.delete({ where: { id: stepId } }).catch(() => {});
  return { ok: true };
}

/* ----------------------------- mapping helpers --------------------------- */

type StepRow = Prisma.RoadmapStepCreateManyInput;

/** Builds a typed create-many row from a generated step spec. */
function stepData(roadmapId: string, version: number, s: RoadmapStepSpec): StepRow {
  return {
    roadmapId,
    version,
    index: s.index,
    title: s.title,
    description: s.description,
    category: s.category,
    priority: s.priority,
    timeHorizon: s.timeHorizon,
    status: "NOT_STARTED",
    reason: s.reason,
    dependency: s.dependency,
    sourceLabel: s.sourceLabel,
    sourceUrl: s.sourceUrl,
    pathType: s.pathType,
    educationLevel: s.educationLevel,
    origin: s.origin,
    counselorNote: null,
    dueHint: s.dueHint,
  };
}

/** Copies persisted fields into a create-many row (preserving a step across regen). */
function rewriteRow(roadmapId: string, version: number, s: { index: number; title: string; description: string; category: string; priority: string; timeHorizon: string; status: string; reason: string | null; dependency: string | null; sourceLabel: string | null; sourceUrl: string | null; pathType: string | null; educationLevel: string | null; origin: string; counselorNote: string | null; dueHint: string | null }, status: RoadmapStepStatus): StepRow {
  const row: StepRow = {
    roadmapId,
    version,
    index: s.index,
    title: s.title,
    description: s.description,
    category: s.category as RoadmapStepCategory,
    priority: s.priority as RoadmapPriority,
    timeHorizon: (s.timeHorizon === "LONGER_TERM" ? "SIX_TWELVE_MONTHS" : s.timeHorizon) as RoadmapTimeHorizon,
    status,
    reason: s.reason,
    dependency: s.dependency,
    sourceLabel: s.sourceLabel,
    sourceUrl: s.sourceUrl,
    pathType: s.pathType as RoadmapStepSpec["pathType"],
    educationLevel: s.educationLevel ?? undefined,
    origin: (s.origin === "COUNSELOR" ? "COUNSELOR" : "SYSTEM") as RoadmapStepOrigin,
    counselorNote: s.counselorNote,
    dueHint: s.dueHint,
  };
  return row;
}

type RoadmapWithSteps = Prisma.StudentRoadmapGetPayload<{
  include: { steps: { orderBy: { index: "asc" } }; milestones: { orderBy: { index: "asc" } } };
}>;

function mapToGenerated(r: RoadmapWithSteps): GeneratedRoadmap & { stepsWithIds: RoadmapWithSteps["steps"] } {
  return {
    version: r.version,
    goalCareerId: r.goalCareerId,
    goalCareerName: r.goalCareerName,
    destination: r.destination,
    destinationLabel: (r.destination ? resolveDestination(r.destination) : null),
    pathType: (r.pathType as GeneratedRoadmap["pathType"]) ?? undefined,
    educationStage: r.educationStage as GeneratedRoadmap["educationStage"],
    currentStage: r.currentStage ?? undefined,
    progress: r.progress,
    steps: r.steps.map((s) => ({
      id: s.id,
      version: s.version,
      index: s.index,
      title: s.title,
      description: s.description,
      category: s.category as RoadmapStepSpec["category"],
      priority: s.priority as RoadmapStepSpec["priority"],
      timeHorizon: s.timeHorizon as RoadmapStepSpec["timeHorizon"],
      status: s.status as RoadmapStepSpec["status"],
      reason: s.reason ?? undefined,
      dependency: s.dependency ?? undefined,
      sourceLabel: s.sourceLabel ?? undefined,
      sourceUrl: s.sourceUrl ?? undefined,
      pathType: s.pathType as RoadmapStepSpec["pathType"],
      educationLevel: s.educationLevel ?? undefined,
      origin: s.origin as RoadmapStepSpec["origin"],
      counselorNote: s.counselorNote ?? undefined,
      dueHint: s.dueHint ?? undefined,
    })),
    milestones: r.milestones,
    snapshot: (r.snapshot as Record<string, unknown>) ?? {},
    stepsWithIds: r.steps,
  } as unknown as GeneratedRoadmap & { stepsWithIds: typeof r.steps };
}

function computeProgressOf(steps: { status?: string }[]): number {
  if (!steps.length) return 0;
  const counted = steps.filter((s) => s.status !== "NOT_APPLICABLE");
  if (!counted.length) return 0;
  const done = steps.filter((s) => s.status === "COMPLETED").length;
  return Math.round((done / counted.length) * 100);
}