"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  UserRound,
  ClipboardList,
  Sparkles,
  GraduationCap,
  Landmark,
  Map as MapIcon,
  Gauge,
  Target,
  ArrowRight,
  Lock,
  Check,
  Compass,
} from "lucide-react";
import type { JourneyState, JourneyStatus } from "@/lib/student/journey-state";
import { trackRecommendationEvent } from "@/lib/analytics/client";

const STEP_ICONS: Record<string, any> = {
  profile: UserRound,
  assessments: ClipboardList,
  discovery: Sparkles,
  programs: GraduationCap,
  universities: Landmark,
  roadmap: MapIcon,
  progress: Gauge,
};

const STATUS_META: Record<
  JourneyStatus,
  { label: string; ring: string; bg: string; text: string; badge: string }
> = {
  done: {
    label: "Complete",
    ring: "border-emerald-300",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
  },
  current: {
    label: "In progress",
    ring: "border-accent",
    bg: "bg-accent/5",
    text: "text-accent",
    badge: "bg-accent/10 text-accent",
  },
  upcoming: {
    label: "Up next",
    ring: "border-slate-200",
    bg: "bg-muted/30",
    text: "text-muted-foreground",
    badge: "bg-slate-100 text-slate-600",
  },
  locked: {
    label: "Locked",
    ring: "border-slate-200",
    bg: "bg-muted/20",
    text: "text-muted-foreground",
    badge: "bg-slate-100 text-slate-500",
  },
};

export function JourneySection({ journey }: { journey: JourneyState }) {
  const currentStep = journey.steps.find((s) => s.status === "current");
  const nba = journey.nextBestAction;
  const actions = journey.actions.slice(0, 4);
  const realSteps = journey.steps.filter((s) => s.id !== "progress");

  useEffect(() => {
    if (currentStep && currentStep.id !== "progress") {
      trackRecommendationEvent({
        event: "journey_step_viewed",
        meta: { step: currentStep.id, percent: journey.percentComplete },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section aria-label="Career journey" className="space-y-4">
      {/* Header + overall progress */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-accent">Your journey</p>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Career Journey
          </h2>
          <p className="text-sm text-muted-foreground">
            One connected path from profile to roadmap.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-accent/20 bg-accent/5 text-sm font-bold text-accent">
            {journey.percentComplete}%
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Journey progress</p>
            <p className="text-[11px] text-muted-foreground">
              Profile · Assessments · Matches · Programs · Universities · Roadmap
            </p>
          </div>
        </div>
      </div>

      {/* Next best action */}
      {nba && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl bg-accent/5 p-4 ring-1 ring-inset ring-accent/20 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Target className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Next best action: <span className="text-accent">{nba.label}</span>
              </p>
              <p className="text-xs text-muted-foreground">{nba.detail}</p>
            </div>
          </div>
          <Link
            href={nba.href}
            onClick={() =>
              trackRecommendationEvent({
                event: "next_best_action_clicked",
                meta: { action: nba.id },
              })
            }
            className="inline-flex shrink-0 items-center rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-accent/90"
          >
            Go <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Available actions */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Link
              key={a.id}
              href={a.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-accent hover:text-accent"
            >
              <Compass className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              {a.label}
              {a.reason && (
                <span className="text-[11px] text-muted-foreground">· {a.reason}</span>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Steps */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {realSteps.map((step, i) => {
          const Icon = STEP_ICONS[step.id] ?? Compass;
          const meta = STATUS_META[step.status] ?? STATUS_META.upcoming;
          const content = (
            <div
              className={`flex h-full flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm ${meta.ring}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${meta.bg} ${meta.text}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                  {step.status === "done" && <Check className="mr-1 h-3 w-3" aria-hidden="true" />}
                  {step.status === "locked" && <Lock className="mr-1 h-3 w-3" aria-hidden="true" />}
                  {meta.label}
                </span>
              </div>
              <div className="space-y-0.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <span className="text-[11px] text-muted-foreground">{i + 1}.</span>
                  <span>{step.title}</span>
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
                {step.lockedReason && (
                  <p className="text-[11px] italic text-muted-foreground">{step.lockedReason}</p>
                )}
              </div>
              <div className="mt-auto space-y-1">
                <p className="text-xs font-medium text-foreground">{step.value}</p>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={step.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${step.title} progress`}
                >
                  <div
                    className={`h-full rounded-full bg-accent ${step.status === "done" ? "bg-emerald-500" : ""} ${step.status === "upcoming" ? "bg-muted-foreground/40" : ""}`}
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
          return step.href && step.status !== "locked" ? (
            <Link key={step.id} href={step.href} className="group">
              {content}
            </Link>
          ) : (
            <div key={step.id}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}