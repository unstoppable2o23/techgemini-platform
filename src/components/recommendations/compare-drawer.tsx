"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import { matchStrengthLabel } from "@/lib/recommendations/explainability";
import type { RecommendationMatch } from "./recommendation-card";
import { trackRecommendationEvent } from "@/lib/analytics/client";

type CompareCareer = {
  match: RecommendationMatch;
  workEnvironment: string | null;
  workActivities: string[];
  skills: string[];
  careerOptions: string[];
  minStudyLevel: string | null;
  educationPath: string[];
  programs: string[];
};

export function CompareDrawer({
  matches,
  onClose,
}: {
  matches: RecommendationMatch[];
  onClose: () => void;
}) {
  const [data, setData] = useState<CompareCareer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (matches.length === 0 || matches.length > 3) return;
    trackRecommendationEvent({ event: "compare_opened", meta: { count: matches.length } });
    const qs = matches.map((m, i) => `careerId=${encodeURIComponent(m.careerId)}`).join("&");
    fetch(`/api/student/career-matches/compare?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error);
        else setData(j.careers ?? []);
      })
      .catch(() => setError("Couldn't load comparison."));
  }, [matches]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl" aria-label="Compare careers">
        <DialogHeader>
          <DialogTitle>Compare careers</DialogTitle>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !data ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading comparison" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="min-w-[140px] text-left font-medium text-muted-foreground">Attribute</th>
                  {data.map((c) => (
                    <th key={c.match.careerId} className="min-w-[180px] text-left align-top">
                      <div className="font-semibold">{c.match.career.name}</div>
                      <div className="mt-0.5 text-[11px] font-normal text-muted-foreground">
                        Match Score: {c.match.matchScore} · {matchStrengthLabel(c.match.matchStrength)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <Row label="Education path" cells={data.map((c) => c.educationPath.join(", ") || "—")} />
                <Row label="Programs" cells={data.map((c) => c.programs.slice(0, 4).join(", ") || "—")} />
                <Row label="Career options" cells={data.map((c) => c.careerOptions.slice(0, 5).join(", ") || "—")} />
                <Row label="Skills gained" cells={data.map((c) => c.skills.slice(0, 8).join(", ") || "—")} />
                <Row label="Work environment" cells={data.map((c) => c.workEnvironment || "—")} />
                <Row label="Work activities" cells={data.map((c) => c.workActivities.slice(0, 5).join(", ") || "—")} />
                <Row
                  label="Why it fits you"
                  cells={data.map((c) => c.match.strengths?.slice(0, 3).join(" | ") || "Limited evidence — complete your profile.")}
                />
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {data
            ? data.map((c) => (
                <Link
                  key={c.match.careerId}
                  href={`/career-library/${c.match.career.slug}`}
                  className="inline-flex"
                >
                  <Badge className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/15">
                    View {c.match.career.name} →
                  </Badge>
                </Link>
              ))
            : matches.map((m) => (
                <Link key={m.careerId} href={`/career-library/${m.career.slug}`} className="inline-flex">
                  <Badge className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/15">
                    View {m.career.name} →
                  </Badge>
                </Link>
              ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          aria-label="Close comparison"
        >
          <X className="h-4 w-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, cells }: { label: string; cells: string[] }) {
  return (
    <tr>
      <td className="py-2 pr-3 align-top text-xs font-medium text-muted-foreground">{label}</td>
      {cells.map((c, i) => (
        <td key={i} className="py-2 pr-3 align-top text-xs text-foreground/80">
          {c}
        </td>
      ))}
    </tr>
  );
}