"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  ListChecks,
} from "lucide-react";
import {
  matchStrengthLabel,
  confidenceHeading,
  confidenceExplanation,
  whyThisMatches,
  whatIsMissing,
  developmentAreas,
  nextActions,
} from "@/lib/recommendations/explainability";
import type { CareerMatch } from "@/lib/career-matching/types";
import { trackRecommendationEvent } from "@/lib/analytics/client";

export type RecommendationMatch = CareerMatch & {
  educationPath?: { primary: string[]; alternative: string[] };
};

const STRENGTH_BADGE: Record<string, string> = {
  strong: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  moderate: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  weak: "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200",
  development_area: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  missing_evidence: "bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200",
};

export function RecommendationCard({
  match,
  rank,
  selected,
  onToggleCompare,
}: {
  match: RecommendationMatch;
  rank: number;
  selected: boolean;
  onToggleCompare: (m: RecommendationMatch) => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const label = matchStrengthLabel(match.matchStrength);
  const reasons = whyThisMatches(match, 4);
  const missing = whatIsMissing(match, 3);
  const developing = developmentAreas(match, 3);
  const actions = nextActions(match);
  const level = match.confidenceDetail?.level ?? "LOW";

  const openDetail = () => {
    const next = !detailOpen;
    setDetailOpen(next);
    if (next) {
      trackRecommendationEvent({
        event: "career_detail_opened",
        careerId: match.careerId,
        careerSlug: match.career.slug,
        careerName: match.career.name,
      });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground" aria-label={`Rank ${rank + 1}`}>
                #{rank + 1}
              </span>
              <CardTitle className="text-base">{match.career.name}</CardTitle>
              {match.career.isEmerging && (
                <Badge className="text-[10px] bg-purple-50 text-purple-700">Emerging</Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {match.career.category || "General"} · {match.career.demandLevel} demand
            </p>
            {/* Part 6 — student preference vs system recommendation */}
            {match.preferenceBoost ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-blue-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Your selected preference
              </p>
            ) : (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                Recommended from your profile
              </p>
            )}
          </div>

          <div className="text-right shrink-0 space-y-1">
            {/* Part 3 — score is NOT a probability */}
            <p className="text-xl font-bold text-foreground">
              Match Score: <span>{match.matchScore}</span>
            </p>
            <p className="max-w-[170px] text-[10px] leading-tight text-muted-foreground">
              Based on the evidence currently available in your profile.
            </p>
            <Badge variant="outline" className={`text-[10px] ${STRENGTH_BADGE[match.matchStrength] || STRENGTH_BADGE.missing_evidence}`}>
              {label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Part 2 — top evidence reasons */}
        {reasons.length > 0 && (
          <div className="space-y-1">
            {reasons.slice(0, 4).map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        )}

        {/* Part 4 — confidence */}
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <p className="text-xs font-medium">
            {confidenceHeading(level)} <span className="text-muted-foreground">· {match.confidenceScore}%</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{confidenceExplanation(level)}</p>
        </div>

        {/* Missing + development indicators */}
        {(missing.length > 0 || developing.length > 0) && (
          <div className="space-y-1.5">
            {missing.slice(0, 3).map((m, i) => (
              <div key={`m${i}`} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-medium text-foreground/70">What is missing: </span>
                  {m}
                </span>
              </div>
            ))}
            {developing.slice(0, 3).map((d, i) => (
              <div key={`d${i}`} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-medium text-foreground/70">Area to develop: </span>
                  {d}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Part 7/13 — education pathway (from existing career data) */}
        {match.educationPath && match.educationPath.primary.length > 0 && (
          <div className="flex items-start gap-1.5 text-xs">
            <GraduationCap className="h-3.5 w-3.5 mt-0.5 text-indigo-500 shrink-0" aria-hidden="true" />
            <div>
              <span className="font-medium text-foreground/70">Education pathway: </span>
              <span className="text-foreground/80">{match.educationPath.primary.join(", ")}</span>
              {match.educationPath.alternative.length > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  · alternatives: {match.educationPath.alternative.join(", ")}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action plan (Part 9) */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {actions.map((a, i) =>
              a.assessmentKind ? (
                <Link key={i} href="/assessments">
                  <Badge className="cursor-pointer bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200">
                    <ListChecks className="h-3 w-3 mr-1" aria-hidden="true" />
                    {a.label}
                  </Badge>
                </Link>
              ) : (
                <Link key={i} href={a.href || "/career-library"}>
                  <Badge className="cursor-pointer bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200">
                    {a.label}
                  </Badge>
                </Link>
              )
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleCompare(match)}
                aria-label={`Compare ${match.career.name}`}
                className="h-3.5 w-3.5 accent-primary"
              />
              Compare
            </label>
            <button
              type="button"
              onClick={openDetail}
              aria-expanded={detailOpen}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary"
            >
              {detailOpen ? (
                <>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> Hide why this matches
                </>
              ) : (
                <>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> Why this matches
                </>
              )}
            </button>
          </div>
          <Link href={`/career-library/${match.career.slug}`}>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                trackRecommendationEvent({
                  event: "career_detail_opened",
                  careerId: match.careerId,
                  careerSlug: match.career.slug,
                  careerName: match.career.name,
                })
              }
            >
              View Career
            </Button>
          </Link>
        </div>

        {/* Part 8 — evidence-based detail */}
        {detailOpen && <MatchDetailPanel match={match} />}
      </CardContent>
    </Card>
  );
}

function MatchDetailPanel({ match }: { match: RecommendationMatch }) {
  const strengths = match.strengths ?? [];
  const developing = developmentAreas(match, 5);
  const missing = whatIsMissing(match, 5);
  const educationLines = (match.educationPath?.primary ?? []).slice(0, 3);
  const actions = nextActions(match);

  const supportedDims =
    match.dimensionScores
      ?.filter((ds) => ds.matchedCount > 0 && ds.score >= 50)
      .sort((a, b) => b.score - a.score) ?? [];

  return (
    <div className="mt-2 space-y-4 rounded-lg border border-border/60 bg-muted/30 p-3" role="region" aria-label="Career match details">
      <section>
        <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
          Why this career
        </h3>
        {strengths.length === 0 && supportedDims.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            There isn't enough evidence in your profile yet to name specific strengths for this
            career. Completing your profile will improve how we can explain matches.
          </p>
        ) : (
          <ul className="mt-1 space-y-1 text-xs text-foreground/80">
            {(match.matchStrength === "strong" ? strengthLines(strengths, supportedDims) : strengths.slice(0, 4)).map((s, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {developing.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-foreground">Areas to develop</h3>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {developing.map((d, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" aria-hidden="true" />
                <span>
                  {d} — adding evidence in this area could strengthen the pathway.
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {missing.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-foreground">Evidence that is missing</h3>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {missing.map((m, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {educationLines.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-foreground">Education path</h3>
          <p className="mt-1 text-xs text-foreground/80">{educationLines.join(" → ")}</p>
          <Link href={`/career-library/${match.career.slug}`} className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
            Explore programs and institutions →
          </Link>
        </section>
      )}

      {actions.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-foreground">Recommended next steps</h3>
          <ol className="mt-1 space-y-1 text-xs text-foreground/80">
            {actions.map((a, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="font-semibold text-muted-foreground">{i + 1}.</span>
                {a.assessmentKind ? (
                  <Link href="/assessments" className="text-primary hover:underline">
                    {a.label}
                  </Link>
                ) : (
                  <Link href={a.href || "/career-library"} className="text-primary hover:underline">
                    {a.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function strengthLines(strengths: string[], supportedDims: { dimension: string; score: number; matchedCount: number }[]): string[] {
  const MAX = 4;
  const lines = supportedDims
    .map((ds) => `${ds.matchedCount} matching signal${ds.matchedCount === 1 ? "" : "s"} in your profile support this`)
    .slice(0, MAX);
  if (lines.length === 0) return strengths.slice(0, MAX);
  return strengths.slice(0, 2).concat(lines.slice(0, 2)).slice(0, MAX);
}