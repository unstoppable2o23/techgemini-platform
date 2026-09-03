"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import Breadcrumbs from "@/components/student/breadcrumbs";
import {
  Target,
  Map as MapIcon,
  Compass,
  Loader2,
  CheckCircle2,
  Circle,
  SkipForward,
  Flag,
  ArrowRight,
  Sparkles,
  RefreshCw,
  MessageSquare,
} from "lucide-react";

type Step = {
  id?: string;
  index: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  timeHorizon: string;
  status: string;
  reason?: string;
  dependency?: string;
  origin: string;
  counselorNote?: string;
  dueHint?: string;
};

type Milestone = { key: string; label: string; index: number };

type RoadmapData = {
  version: number;
  goalCareerName?: string | null;
  destinationLabel?: string | null;
  pathType?: string | null;
  educationStage: string;
  currentStage?: string;
  progress: number;
  steps: Step[];
  milestones: Milestone[];
};

const HORIZON_TO_MILESTONE: Record<string, string> = {
  NOW: "NOW",
  THREE_MONTHS: "NEXT_3_MONTHS",
  SIX_TWELVE_MONTHS: "NEXT_6_12_MONTHS",
  LONGER_TERM: "TARGET",
};

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: "bg-red-50 text-red-700 ring-red-200",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-200",
  LOW: "bg-slate-50 text-slate-600 ring-slate-200",
};

const STAGE_LABELS: Record<string, string> = {
  SCHOOL_CLASS10: "School (Class 10)",
  SCHOOL_CLASS12: "School (Class 12)",
  UNDERGRADUATE: "Undergraduate",
  POSTGRADUATE: "Postgraduate",
  CAREER_SWITCHER: "Career transition",
  UNKNOWN: "Getting started",
};

export function RoadmapClient() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showExplanation, setShowExplanation] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/student/roadmap")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }: { ok: boolean; d: any }) => {
        if (ok && d?.roadmap) {
          setData(d.roadmap);
        } else {
          setError(d?.error || "We couldn't load your roadmap right now.");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("We couldn't load your roadmap right now.");
        setLoading(false);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStep = useCallback(async (stepIndex: number, status: string) => {
    if (!data) return;
    const step = data.steps[stepIndex];
    if (!step?.id) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/student/roadmap/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const j = await r.json();
      if (r.ok && j?.roadmap) setData(j.roadmap);
    } catch {
      // ignore transient errors; user can retry
    }
    setBusy(false);
  }, [data]);

  const switchDestination = useCallback(async () => {
    setBusy(true);
    try {
      const next = data?.destinationLabel === "INDIA" ? "US" : "INDIA";
      const r = await fetch("/api/student/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: next }),
      });
      const j = await r.json();
      if (r.ok && j?.roadmap) setData(j.roadmap);
    } catch {
      // ignore
    }
    setBusy(false);
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-4 p-6 pt-20 max-w-4xl mx-auto">
        <PageHeader icon={Compass} title="My Study Roadmap" description="" eyebrow="" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 pt-20 max-w-4xl mx-auto space-y-4">
        <PageHeader icon={Compass} title="My Study Roadmap" description="" eyebrow="" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 pt-20 max-w-4xl mx-auto">
        <PageHeader icon={Compass} title="My Study Roadmap" description="" eyebrow="" />
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No roadmap yet. Complete your profile and assessment to get a personalized plan.</CardContent></Card>
      </div>
    );
  }

  const byMilestone = new Map<string, Step[]>();
  for (const s of data.steps) {
    const key = HORIZON_TO_MILESTONE[s.timeHorizon] || "NEXT_3_MONTHS";
    if (!byMilestone.has(key)) byMilestone.set(key, []);
    byMilestone.get(key)!.push(s);
  }

  const orderedMilestones = [
    "NOW",
    "NEXT_3_MONTHS",
    "NEXT_6_12_MONTHS",
    "TARGET",
  ];
  const msLabel = (k: string) =>
    data.milestones.find((m) => m.key === k)?.label || k;

  return (
    <div className="p-6 pt-20 max-w-4xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "My Study Roadmap" }]} />
      <PageHeader
        icon={Compass}
        title="My Study Roadmap"
        description="Personalized next steps toward your target career."
        eyebrow="Your plan"
      />

      {/* Goal + stage + progress */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">My Career Goal</p>
            <p className="text-xl font-bold">
              {data.goalCareerName || "Set a career direction to personalize this roadmap"}
            </p>
            <p className="text-sm text-muted-foreground">
              Current education: {STAGE_LABELS[data.educationStage] || data.educationStage}
              {data.currentStage ? ` · ${data.currentStage}` : ""}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-muted-foreground">Path:</span>
              <Badge variant="secondary">
                {data.pathType === "INDIA" ? "India" : data.destinationLabel ? "Abroad" : "Undecided"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {data.destinationLabel && data.destinationLabel !== "INDIA"
                  ? data.destinationLabel.replace(/_/g, " ")
                  : ""}
              </span>
              <Button size="sm" variant="outline" onClick={switchDestination} disabled={busy} className="ml-auto">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {data.destinationLabel === "INDIA" ? "Try Abroad" : "Try India"}
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary/20 bg-white text-2xl font-bold text-primary shadow-sm">
              {data.progress}%
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Progress</p>
          </div>
        </CardContent>
      </Card>

      {/* Steps grouped by milestone */}
      {orderedMilestones.map((mk) => {
        const steps = byMilestone.get(mk) || [];
        if (steps.length === 0) return null;
        return (
          <section key={mk} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                {mk === "NOW" ? <Target className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
              </span>
              <h2 className="text-lg font-semibold">{msLabel(mk)}</h2>
            </div>
            <div className="space-y-2">
              {steps.map((s, i) => {
                const actualIndex = data.steps.indexOf(s);
                return (
                  <Card key={s.id || `${mk}-${i}`} className={s.status === "COMPLETED" ? "opacity-70" : ""}>
                    <CardContent className="flex items-start gap-3 p-4">
                      <button
                        onClick={() => updateStep(actualIndex, s.status === "COMPLETED" ? "NOT_STARTED" : "COMPLETED")}
                        disabled={busy}
                        className="mt-0.5 shrink-0 text-primary hover:opacity-70"
                        aria-label="toggle complete"
                      >
                        {s.status === "COMPLETED" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{s.title}</p>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${PRIORITY_STYLES[s.priority] || PRIORITY_STYLES.MEDIUM}`}>
                            {s.priority}
                          </span>
                          {s.origin === "COUNSELOR" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                              <MessageSquare className="h-3 w-3" /> Counselor
                            </span>
                          )}
                        </div>
                        {s.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                        )}
                        {s.counselorNote && (
                          <p className="mt-1 rounded-md bg-violet-50 p-2 text-xs text-violet-700">
                            Counselor note: {s.counselorNote}
                          </p>
                        )}
                        {s.dueHint && <p className="mt-1 text-[11px] text-muted-foreground">{s.dueHint}</p>}
                        {showExplanation === actualIndex && s.reason && (
                          <p className="mt-2 rounded-md bg-accent/10 p-2 text-xs text-accent-foreground">
                            <Sparkles className="mr-1 inline h-3 w-3" /> Why: {s.reason}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => setShowExplanation(showExplanation === actualIndex ? null : actualIndex)} className="h-7 px-2 text-[11px]">
                            <Sparkles className="mr-1 h-3 w-3" /> Why
                          </Button>
                          {(s.status === "NOT_STARTED" || s.status === "IN_PROGRESS") && (
                            <Button size="sm" variant="outline" onClick={() => updateStep(actualIndex, "SKIPPED")} disabled={busy} className="h-7 px-2 text-[11px]">
                              <SkipForward className="mr-1 h-3 w-3" /> Skip
                            </Button>
                          )}
                          <Link href={`/career-library`}>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                              Explore <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Next action callout */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Flag className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold">Next action</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.steps.find((s) => s.status === "NOT_STARTED" && s.timeHorizon === "NOW")?.title ||
                data.steps.find((s) => s.status === "NOT_STARTED")?.title ||
                "All planned steps are in progress or complete — great work!"}
            </p>
          </div>
        </CardContent>
      </Card>

      {data.steps.length > 0 && (
        <p className="text-center text-xs text-muted-foreground italic">
          Roadmap version {data.version}. Steps are guidance to discuss with your counselor — not guarantees of
          admission, scholarship, visa, or employment.
        </p>
      )}
    </div>
  );
}
