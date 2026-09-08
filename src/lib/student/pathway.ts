/**
 * Phase 26 — "Build my pathway" / career selection.
 *
 * Confirming a career direction reuses the existing StudentProfile mechanism
 * (preferredCareerId/preferredCareer) instead of inventing a duplicate
 * preference system. It then regenerates the roadmap around that career
 * (the roadmap service already targets preferredCareerId first) and records a
 * `pathway_started` product event. Does NOT touch the frozen matching engine.
 */
import { prisma } from "../prisma.ts";
import { regenerateRoadmap } from "../roadmap/service.ts";
import { recordProductEvent } from "../analytics/record.ts";

export interface SetPathwayResult {
  ok: boolean;
  error?: string;
  preferredCareerId?: string | null;
  preferredCareerName?: string | null;
  roadmap?: unknown;
}

export async function setStudentPathway(
  userId: string,
  careerId: string
): Promise<SetPathwayResult> {
  const career = await prisma.career.findFirst({
    where: { id: careerId, isActive: true },
    select: { id: true, name: true, slug: true },
  });
  if (!career) {
    return { ok: false, error: "We couldn't find that career. Please choose from the available careers." };
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) {
    return { ok: false, error: "Complete your career profile before choosing a pathway." };
  }

  await prisma.studentProfile.update({
    where: { userId },
    data: {
      preferredCareer: career.name,
      preferredCareerId: career.id,
    },
  });

  try {
    await recordProductEvent({
      userId,
      event: "pathway_started",
      careerId: career.id,
      careerSlug: career.slug ?? null,
      careerName: career.name,
      meta: { decidedAt: new Date().toISOString() },
    });
  } catch {
    // analytics are best-effort, never block the pathway flow
  }

  try {
    // Regenerate future roadmap steps around the selected career.
    const changed = await regenerateRoadmap(userId);
    if (!changed.ok) {
      return {
        ok: true,
        preferredCareerId: career.id,
        preferredCareerName: career.name,
        roadmap: null,
        error: changed.error,
      };
    }
    return {
      ok: true,
      preferredCareerId: career.id,
      preferredCareerName: career.name,
      roadmap: changed.roadmap,
    };
  } catch {
    // Roadmap regeneration is best-effort — the selection is already persisted.
    return {
      ok: true,
      preferredCareerId: career.id,
      preferredCareerName: career.name,
      roadmap: null,
    };
  }
}