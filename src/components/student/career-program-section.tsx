"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SaveButton from "@/components/student/save-button";
import { GraduationCap, ShieldCheck, ArrowRight, Check, X } from "lucide-react";

type ProgramItem = {
  programId: string;
  programName: string;
  programSlug: string;
  level: string;
  category: string;
  relationshipType: string;
  saved: boolean;
  sharedWithCareers: number;
  normalized: {
    qualification: { name: string } | null;
    discipline: { name: string };
    educationStageFit: string[];
    nextStep: string;
    admission: {
      entranceExam: string | null;
      admissionType: string | null;
      source: { label: string; lastReviewed: string } | null;
      note: string;
    } | null;
  } | null;
};

export function ProgramCard({
  program,
  onGoalProgram,
}: {
  program: ProgramItem;
  onGoalProgram?: (programId: string) => void;
}) {
  const [goalBusy, setGoalBusy] = useState(false);
  const [goalState, setGoalState] = useState<"idle" | "saved" | "error">("idle");

  const qualification = program.normalized?.qualification;
  const discipline = program.normalized?.discipline;
  const admission = program.normalized?.admission;
  const nextStep = program.normalized?.nextStep;

  const relationLabel = (
    {
      PRIMARY: "Primary route",
      COMMON: "Common route",
      SPECIALIZED: "Specialized route",
      RELEVANT: "Relevant",
      OPTIONAL: "Optional",
    } as Record<string, string>
  )[program.relationshipType] ?? "Mapped route";

  async function setAsGoal() {
    setGoalBusy(true);
    try {
      const res = await fetch("/api/student/roadmap/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: program.programId, programName: program.programName }),
      });
      if (res.ok) {
        setGoalState("saved");
        onGoalProgram?.(program.programId);
      } else {
        setGoalState("error");
      }
    } catch {
      setGoalState("error");
    } finally {
      setGoalBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm">{program.programName}</h3>
            <Badge variant="secondary" className="text-xs">{relationLabel}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {qualification?.name ?? program.level} · {discipline?.name ?? program.category}
            {program.sharedWithCareers > 0 ? ` · referenced by ${program.sharedWithCareers} career paths` : ""}
          </p>
        </div>
        <SaveButton
          itemType="PROGRAM"
          itemId={program.programId}
          initialSaved={program.saved}
          size="sm"
        />
      </div>

      {program.normalized && (
        <div className="space-y-2 text-xs">
          {program.normalized.educationStageFit.length > 0 && (
            <p className="text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 inline mr-1 text-accent" />
              <span className="font-medium text-foreground">Education stage:</span>{" "}
              {program.normalized.educationStageFit.join(" · ")}
            </p>
          )}
          {nextStep && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Next step:</span> {nextStep}
            </p>
          )}
          {admission && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Admission:</span>{" "}
              {[admission.entranceExam, admission.admissionType].filter(Boolean).join(" · ") || "Verify with official sources"}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
        {admission?.source && (
          <span className="text-[11px] text-muted-foreground" title={admission.note}>
            {admission.source.label} · reviewed {admission.source.lastReviewed}
          </span>
        )}
        <div className="flex-1" />
        <Link href={`/student/programs?p=${encodeURIComponent(program.programSlug ?? program.programName)}`}>
          <Button variant="outline" size="sm" className="text-xs">
            Explore <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
        <Button
          variant={goalState === "saved" ? "default" : "ghost"}
          size="sm"
          className="text-xs"
          onClick={setAsGoal}
          disabled={goalBusy || goalState === "saved"}
        >
          {goalState === "saved" ? (
            <><Check className="h-3 w-3 mr-1" /> Set as program</>
          ) : goalState === "error" ? (
            <><X className="h-3 w-3 mr-1" /> Retry</>
          ) : (
            <><GraduationCap className="h-3 w-3 mr-1" /> Set as my program</>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function CareerProgramSection({
  careerId,
  onGoalProgram,
}: {
  careerId: string;
  onGoalProgram?: (programId: string) => void;
}) {
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/careers/${careerId}/programs`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setPrograms(data.programs ?? []);
        }
      } catch {
        // leave empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [careerId]);

  if (loading) {
    return <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">Loading recommended programs...</div>;
  }
  if (programs.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        No mapped programs for this career yet. Use the Program Explorer to search the catalog.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Exact qualification labels are shown — a Diploma is never merged into a "degree". Admission routes are
        conservative and never include invented dates or cutoffs.
      </p>
      <ProgramCard program={programs[0]} onGoalProgram={onGoalProgram} />
      {programs.slice(1, 5).map((p) => (
        <ProgramCard key={p.programId} program={p} onGoalProgram={onGoalProgram} />
      ))}
      {programs.length > 5 && (
        <Link href="/student/programs" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
          View all {programs.length} recommended programs in the explorer <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}