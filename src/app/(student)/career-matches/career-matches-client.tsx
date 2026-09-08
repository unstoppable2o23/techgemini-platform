"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import Breadcrumbs from "@/components/student/breadcrumbs";
import { TrendingUp, Info, Scale } from "lucide-react";
import type { CareerMatch } from "@/lib/career-matching/types";
import {
  RecommendationCard,
  type RecommendationMatch,
} from "@/components/recommendations/recommendation-card";
import { LowInformationState } from "@/components/recommendations/low-information-state";
import { CompareDrawer } from "@/components/recommendations/compare-drawer";
import { trackRecommendationEvent } from "@/lib/analytics/client";

type MatchData = {
  matches: RecommendationMatch[];
  totalCareersScored: number;
  studentSignalsUsed: number;
  assessmentCoverage: string[];
  hasAssessmentData: boolean;
  disclaimer: string | null;
  lowInformation: boolean;
  topMatchStrength: string;
};

export function CareerMatchesClient() {
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RecommendationMatch[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/student/career-matches?limit=20")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }: { ok: boolean; d: any }) => {
        if (ok && d && Array.isArray(d.matches)) {
          setData(d);
        } else {
          setError(d?.error || "We couldn't load your career matches right now.");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("We couldn't load your career matches right now.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (data && !loading) {
      trackRecommendationEvent({ event: "recommendation_viewed" });
    }
  }, [data, loading]);

  const toggleCompare = useCallback((m: RecommendationMatch) => {
    setSelected((prev) => {
      if (prev.some((p) => p.careerId === m.careerId)) {
        return prev.filter((p) => p.careerId !== m.careerId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, m];
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-6 pt-20 max-w-3xl mx-auto">
        <PageHeader icon={TrendingUp} title="Career Matches" description="" eyebrow="" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6 pt-20 max-w-3xl mx-auto">
        <PageHeader icon={TrendingUp} title="Career Matches" description="" eyebrow="" />
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="mt-4">
              <Button size="sm" onClick={load}>
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Part 5 — honest low-information state: the engine explicitly signals that
  // no meaningful evidence exists yet, so we don't dress up an arbitrary order
  // as "recommended careers".
  if (data.lowInformation) {
    const ALL_PROFILE_KINDS = [
      "EDUCATION",
      "SUBJECT",
      "APTITUDE",
      "PERSONALITY",
      "INTEREST",
      "WORK_ENVIRONMENT",
    ];
    const missingKinds = ALL_PROFILE_KINDS.filter(
      (k) => !data.assessmentCoverage.includes(k)
    );
    return (
      <div className="space-y-6 p-6 pt-20 max-w-3xl mx-auto">
        <Breadcrumbs items={[{ label: "Discover" }, { label: "Career Matches" }]} />
        <PageHeader
          icon={TrendingUp}
          title="Your Career Matches"
          description="Begin building your profile to unlock personal career suggestions."
          eyebrow="Recommended Careers"
        />
        <LowInformationState
          completedKinds={data.assessmentCoverage}
          missingKinds={missingKinds}
        />
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Not sure where to start? Browse the full{" "}
            <Link href="/career-library" className="text-primary underline">
              Career Library
            </Link>{" "}
            anytime, or talk it through with your counselor.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pt-20 max-w-3xl mx-auto">
      <Breadcrumbs items={[{ label: "Discover" }, { label: "Career Matches" }]} />
      <PageHeader
        icon={TrendingUp}
        title="Your Career Matches"
        description="Careers highlighted based on the interests, subjects and goals you've shared."
        eyebrow="Recommended Careers"
      />

      {data.disclaimer && (
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{data.disclaimer}</p>
        </div>
      )}

      {data.studentSignalsUsed === 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Matches are built only from what you've shared so far. Adding subjects, goals and
            assessments will make them more accurate.{" "}
            <Link href="/career-preferences" className="underline">
              Update profile
            </Link>
          </p>
        </div>
      )}

      <div className="space-y-4">
        {data.matches.map((match, rank) => (
          <RecommendationCard
            key={match.careerId}
            match={match}
            rank={rank}
            selected={selected.some((s) => s.careerId === match.careerId)}
            onToggleCompare={toggleCompare}
          />
        ))}
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

      {/* Next-step funnel */}
      <Card className="border-accent bg-accent/5">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">What&apos;s next?</p>
            <p className="text-sm text-muted-foreground">
              Explore the study path and universities behind your top match, or talk it through
              with your counselor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <Link href="/dashboard">
              <Button size="sm">See study pathways</Button>
            </Link>
            <Link href="/appointments">
              <Button size="sm" variant="outline">
                Book a session
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Part 11 — compare up to 3 */}
      {selected.length > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto w-fit rounded-full border bg-background/95 px-4 py-2 shadow-md backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              <Scale className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              {selected.length}/3 selected
            </span>
            <Button size="sm" onClick={() => setCompareOpen(true)} disabled={selected.length === 0}>
              Compare
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {compareOpen && selected.length > 0 && (
        <CompareDrawer matches={selected} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  );
}