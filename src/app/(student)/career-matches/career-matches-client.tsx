"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertCircle, TrendingUp, Info } from "lucide-react";

type MatchReason = {
  type: "strength" | "development_area" | "missing_evidence" | "preference_boost";
  dimension?: string;
  text: string;
};

type CareerMatch = {
  careerId: string;
  career: {
    id: string;
    name: string;
    slug: string;
    title: string;
    category: string | null;
    shortDescription: string | null;
    demandLevel: string;
    salaryEntry: string;
    isEmerging: boolean;
  };
  matchScore: number;
  confidenceScore: number;
  matchStrength: string;
  strengths: string[];
  developmentAreas: string[];
  reasons: MatchReason[];
  sourceSummary: string[];
  preferenceBoost: boolean;
};

type MatchData = {
  matches: CareerMatch[];
  totalCareersScored: number;
  studentSignalsUsed: number;
  assessmentCoverage: string[];
  hasAssessmentData: boolean;
  disclaimer: string | null;
};

const STRENGTH_STYLES: Record<string, { label: string; variant: string }> = {
  strong: { label: "Strong Match", variant: "bg-emerald-50 text-emerald-700" },
  moderate: { label: "Moderate Match", variant: "bg-blue-50 text-blue-700" },
  weak: { label: "Weak Match", variant: "bg-yellow-50 text-yellow-700" },
  development_area: { label: "Developing", variant: "bg-orange-50 text-orange-700" },
  missing_evidence: { label: "Limited Data", variant: "bg-slate-50 text-slate-500" },
};

export function CareerMatchesClient() {
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/career-matches?limit=20")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-6 pt-20 max-w-3xl mx-auto">
        <PageHeader icon={TrendingUp} title="Career Matches" description="" eyebrow="" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!data || data.matches.length === 0) {
    return (
      <div className="space-y-6 p-6 pt-20 max-w-3xl mx-auto">
        <PageHeader icon={TrendingUp} title="Career Matches" description="" eyebrow="" />
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No career matches yet. Complete your career preferences or take an
              assessment to get started.
            </p>
            <div className="mt-4 flex gap-2 justify-center">
              <Link href="/career-preferences">
                <Button size="sm">Fill Career Preferences</Button>
              </Link>
              <Link href="/dashboard">
                <Button size="sm" variant="outline">Go to My Tests</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pt-20 max-w-3xl mx-auto">
      <PageHeader
        icon={TrendingUp}
        title="Your Career Matches"
        description={`Based on ${data.studentSignalsUsed} career signals across ${data.totalCareersScored} careers.`}
        eyebrow="Career Intelligence"
      />

      {data.disclaimer && (
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{data.disclaimer}</p>
        </div>
      )}

      <div className="space-y-4">
        {data.matches.map((match, rank) => {
          const style = STRENGTH_STYLES[match.matchStrength] || STRENGTH_STYLES.weak;
          return (
            <Card key={match.careerId} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-muted-foreground">#{rank + 1}</span>
                      <CardTitle className="text-base">{match.career.name}</CardTitle>
                      {match.career.isEmerging && (
                        <Badge className="text-[10px] bg-purple-50 text-purple-700">Emerging</Badge>
                      )}
                      {match.preferenceBoost && (
                        <Badge className="text-[10px] bg-blue-50 text-blue-700">Your preference</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {match.career.category || "—"} · {match.career.demandLevel} demand ·{" "}
                      {match.career.salaryEntry}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-primary">{match.matchScore}%</div>
                    <Badge variant="outline" className={`text-[10px] ${style.variant}`}>
                      {style.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Why it matches */}
                {match.reasons.filter((r) => r.type === "strength" || r.type === "preference_boost").length > 0 && (
                  <div className="space-y-1">
                    {match.reasons
                      .filter((r) => r.type === "strength" || r.type === "preference_boost")
                      .slice(0, 4)
                      .map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                          <span>{r.text}</span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Development areas */}
                {match.developmentAreas.length > 0 && (
                  <div className="space-y-1">
                    {match.developmentAreas.slice(0, 3).map((area, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{area}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Confidence + View */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Confidence: {match.confidenceScore}%
                    </span>
                    {match.sourceSummary.map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                  <Link href={`/career-library/${match.career.slug}`}>
                    <Button size="sm" variant="outline">
                      View Career
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">
            These matches are based on the information currently available in your profile.
            They are not scientifically validated predictions. Explore the{" "}
            <Link href="/career-library" className="text-primary underline">
              Career Library
            </Link>{" "}
            to browse all careers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
