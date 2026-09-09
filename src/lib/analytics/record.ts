// Phase 25 — lightweight, privacy-safe product analytics.
// Stores coarse recommendation interaction events. NEVER accepts assessment
// answers or sensitive raw profile data — only event names + optional career
// references + arbitrary small JSON meta.
import { prisma } from "../prisma";

export type ProductEventName =
  | "recommendation_viewed"
  | "career_detail_opened"
  | "compare_opened"
  | "program_explored"
  | "university_explored"
  | "profile_completion_cta_clicked"
  | "assessment_cta_clicked"
  | "journey_step_viewed"
  | "career_shortlisted"
  | "pathway_started"
  | "university_shortlisted"
  | "program_shortlisted"
  | "roadmap_action_completed"
  | "next_best_action_clicked"
  | "decision_center_viewed"
  | "career_option_opened"
  | "program_option_opened"
  | "institution_option_opened"
  | "decision_shortlisted"
  | "pathway_selected"
  | "counselor_review_clicked"
  | "decision_pack_viewed"
  | "decision_pack_printed"
  | "decision_pack_action_opened"
  | "decision_pack_counselor_reviewed";

export type ProductEventInput = {
  userId: string;
  event: ProductEventName;
  careerId?: string | null;
  careerSlug?: string | null;
  careerName?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function recordProductEvent(input: ProductEventInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { tenantId: true },
  });
  if (!user) return;
  await prisma.productEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: input.userId,
      event: input.event,
      careerId: input.careerId ?? null,
      careerSlug: input.careerSlug ?? null,
      careerName: input.careerName ?? null,
      meta: (input.meta as any) ?? undefined,
    },
  });
}
