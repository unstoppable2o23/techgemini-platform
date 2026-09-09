// Phase 25 — client-side analytics helper. Fire-and-forget POSTs to the
// student analytics route. Never blocks UI and never carries sensitive data.
"use client";

export type ClientEventName =
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
  | "admissions_guidance_viewed"
  | "admissions_source_opened"
  | "admissions_action_opened"
  | "admissions_verify_clicked";

type ClientEvent = {
  event: ClientEventName;
  careerId?: string;
  careerSlug?: string;
  careerName?: string;
  meta?: Record<string, unknown>;
};

export function trackRecommendationEvent(payload: ClientEvent) {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/student/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // best-effort; do not hold up navigation/interactions
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never let analytics break the UI
  }
}