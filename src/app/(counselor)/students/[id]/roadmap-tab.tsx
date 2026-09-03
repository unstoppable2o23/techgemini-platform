"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Target,
  Compass,
  CheckCircle2,
  Circle,
  SkipForward,
  Sparkles,
  MessageSquare,
  RefreshCw,
  Plus,
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

function fmtHorizon(h: string): string {
  switch (h) {
    case "NOW": return "Now";
    case "THREE_MONTHS": return "Next 3 months";
    case "SIX_TWELVE_MONTHS": return "Next 6–12 months";
    case "LONGER_TERM": return "Longer term";
    default: return h;
  }
}

export function RoadmapTab({
  studentId,
  onCounselorStep,
}: {
  studentId: string;
  onCounselorStep: (changed: boolean) => void;
}) {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [stepTitle, setStepTitle] = useState("");
  const [stepDesc, setStepDesc] = useState("");
  const [stepNote, setStepNote] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/counselor/students/${studentId}/roadmap`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }: { ok: boolean; d: any }) => {
        if (ok && d?.roadmap) setData(d.roadmap);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const updateStep = useCallback(async (step: Step, status: string) => {
    if (!step.id) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/counselor/students/${studentId}/roadmap`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId: step.id, status }),
      });
      const j = await r.json();
      if (r.ok && j?.roadmap) setData(j.roadmap);
    } catch { /* ignore */ }
    setBusy(false);
  }, [studentId]);

  const regenerate = useCallback(async (destination?: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/counselor/students/${studentId}/roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: destination ?? null }),
      });
      const j = await r.json();
      if (r.ok && j?.roadmap) { setData(j.roadmap); onCounselorStep(true); }
    } catch { /* ignore */ }
    setBusy(false);
  }, [studentId, onCounselorStep]);

  const addStep = useCallback(async () => {
    if (!stepTitle.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/counselor/students/${studentId}/roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-step",
          title: stepTitle.trim(),
          description: stepDesc.trim(),
          note: stepNote.trim() || undefined,
          timeHorizon: "NOW",
        }),
      });
      const j = await r.json();
      if (r.ok && j?.roadmap) { setData(j.roadmap); setShowForm(false); setStepTitle(""); setStepDesc(""); setStepNote(""); onCounselorStep(true); }
    } catch { /* ignore */ }
    setBusy(false);
  }, [studentId, stepTitle, stepDesc, stepNote, onCounselorStep]);

  if (loading) {
    return (
      <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Loading roadmap…</CardContent></Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No roadmap available for this student yet.</p>
          <Button size="sm" onClick={() => regenerate(undefined)} disabled={busy}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Generate roadmap
          </Button>
        </CardContent>
      </Card>
    );
  }

  const byMilestone = new Map<string, Step[]>();
  for (const s of data.steps) {
    const key = HORIZON_TO_MILESTONE[s.timeHorizon] || "NEXT_3_MONTHS";
    if (!byMilestone.has(key)) byMilestone.set(key, []);
    byMilestone.get(key)!.push(s);
  }
  const order = ["NOW", "NEXT_3_MONTHS", "NEXT_6_12_MONTHS", "TARGET"];
  const msLabel = (k: string) => data.milestones.find((m) => m.key === k)?.label || k;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Goal</p>
            <p className="text-lg font-bold">{data.goalCareerName || "No goal set"}</p>
            <p className="text-sm text-muted-foreground">
              {STAGE_LABELS[data.educationStage] || data.educationStage}
              {data.currentStage ? ` · ${data.currentStage}` : ""}
              {data.destinationLabel && <span> · {data.destinationLabel !== "INDIA" ? data.destinationLabel.replace(/_/g, " ") : "India"}</span>}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => regenerate(data.destinationLabel === "INDIA" ? "US" : "INDIA")} disabled={busy}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Switch India/Abroad
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)} disabled={busy}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add counselor step
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary/20 bg-white text-xl font-bold text-primary">
              {data.progress}%
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Progress</p>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-violet-600" /> Counselor-authored action
            </p>
            <Input placeholder="Step title" value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} />
            <Input placeholder="Description (optional)" value={stepDesc} onChange={(e) => setStepDesc(e.target.value)} />
            <Input placeholder="Note to student (optional)" value={stepNote} onChange={(e) => setStepNote(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={addStep} disabled={busy || !stepTitle.trim()}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Counselor steps are preserved across roadmap regenerations.</p>
          </CardContent>
        </Card>
      )}

      {order.map((mk) => {
        const steps = byMilestone.get(mk) || [];
        if (!steps.length) return null;
        return (
          <section key={mk} className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> {msLabel(mk)}
            </h3>
            {steps.map((s, i) => {
              const actualIndex = data.steps.indexOf(s);
              return (
                <Card key={s.id || `${mk}-${i}`} className={s.status === "COMPLETED" ? "opacity-70" : ""}>
                  <CardContent className="flex items-start gap-3 p-3">
                    <button
                      onClick={() => updateStep(s, s.status === "COMPLETED" ? "NOT_STARTED" : "COMPLETED")}
                      disabled={busy}
                      className="mt-0.5 shrink-0 text-primary"
                      aria-label="toggle complete"
                    >
                      {s.status === "COMPLETED" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-muted-foreground/40" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{s.title}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${PRIORITY_STYLES[s.priority] || PRIORITY_STYLES.MEDIUM}`}>{s.priority}</span>
                        {s.origin === "COUNSELOR" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
                            <MessageSquare className="h-3 w-3" /> Counselor
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">{fmtHorizon(s.timeHorizon)}</span>
                      </div>
                      {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
                      {s.counselorNote && <p className="mt-1 rounded-md bg-violet-50 p-2 text-xs text-violet-700">Note: {s.counselorNote}</p>}
                      {s.reason && <p className="mt-1 text-[11px] text-muted-foreground"><Sparkles className="mr-1 inline h-3 w-3" /> {s.reason}</p>}
                      {(s.status === "NOT_STARTED" || s.status === "IN_PROGRESS") && (
                        <Button size="sm" variant="outline" onClick={() => updateStep(s, "SKIPPED")} disabled={busy} className="mt-2 h-7 px-2 text-[11px]">
                          <SkipForward className="mr-1 h-3 w-3" /> Skip
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        );
      })}

      <p className="text-center text-[11px] text-muted-foreground italic">
        Roadmap version {data.version}. SYSTEM steps are auto-generated; COUNSELOR steps are created by you and preserved across regenerations.
      </p>
    </div>
  );
}
