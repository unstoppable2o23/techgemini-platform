"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Compass,
  GraduationCap,
  Building2,
  Target,
  Route,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import SaveButton from "@/components/student/save-button";
import { trackRecommendationEvent } from "@/lib/analytics/client";
import type { DecisionCenterState, CareerOption } from "@/lib/decision-center/center";

const STATUS_VARIANT: Record<string, "success" | "secondary" | "outline" | "warning" | "destructive"> = {
  RECOMMENDED: "success",
  SUPPORTED: "secondary",
  EXPLORE: "outline",
  MORE_INFORMATION_NEEDED: "warning",
  NOT_VERIFIED: "destructive",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "outline"}>
      {status === "RECOMMENDED" && <CheckCircle2 className="mr-1 h-3 w-3" />}
      {status === "MORE_INFORMATION_NEEDED" && <AlertTriangle className="mr-1 h-3 w-3" />}
      {status}
    </Badge>
  );
}

function SaveWrap({
  itemType,
  itemId,
  saved,
}: {
  itemType: "CAREER" | "PROGRAM" | "UNIVERSITY" | "INDIAN_INSTITUTION";
  itemId: string;
  saved: boolean;
}) {
  return (
    <span
      className="inline-flex"
      onClickCapture={() =>
        trackRecommendationEvent({
          event: "decision_shortlisted",
          meta: { itemType, itemId },
        })
      }
    >
      <SaveButton itemType={itemType} itemId={itemId} initialSaved={saved} />
    </span>
  );
}

function OptionRow({ option, index }: { option: CareerOption; index: number }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 py-4 last:border-0 sm:flex-nowrap">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/career-library/${option.careerSlug ?? option.careerId}`}
            className="text-base font-semibold text-foreground hover:underline"
            onClick={() =>
              trackRecommendationEvent({
                event: "career_option_opened",
                careerId: option.careerId,
                careerName: option.careerName,
                meta: { group: option.group, matchScore: option.matchScore, rank: index },
              })
            }
          >
            {option.careerName}
          </Link>
          <StatusBadge status={option.status} />
          {option.preferred && <Badge variant="default">Selected pathway</Badge>}
          {option.supportedByProfile ? (
            <Badge variant="outline">Supported by your profile</Badge>
          ) : null}
        </div>
        {option.program ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" />
            {option.program.programName}
            {option.program.verified ? (
              <Badge variant="success">Program VERIFIED · {option.program.verifiedInstitutionCount} institution(s)</Badge>
            ) : (
              <Badge variant="destructive">Program NOT VERIFIED</Badge>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No program mapped yet</p>
        )}
        {option.topReasons.length > 0 && (
          <ul className="space-y-0.5 pt-1 text-sm text-muted-foreground">
            {option.topReasons.map((r, i) => (
              <li key={i} className="flex gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}
        {option.stage !== "Exploring" && (
          <p className="text-xs text-accent">Journey stage: {option.stage}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <SaveWrap itemType="CAREER" itemId={option.careerId} saved={option.saved} />
        <Badge variant="secondary" className="tabular-nums">
          {Math.round(option.matchScore)}/100
        </Badge>
      </div>
    </li>
  );
}

function optionsCard(
  title: string,
  description: string,
  options: CareerOption[],
  emptyHint: string
) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-accent" />
          {title}
          <Badge variant="secondary">{options.length}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {options.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          <ol className="divide-y divide-border/60">
            {options.map((o, i) => (
              <OptionRow key={o.careerId} option={o} index={i} />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export default function DecisionCenterPage() {
  const [state, setState] = useState<DecisionCenterState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/decision-center");
      const data = await res.json();
      if (!res.ok || !data?.state) {
        setError(true);
      } else {
        setState(data.state);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    trackRecommendationEvent({ event: "decision_center_viewed" });
  }, [load]);

  if (loading) {
    return (
      <div className="p-6 pt-20 max-w-5xl mx-auto text-center text-muted-foreground">
        Loading your decision center...
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="p-6 pt-20 max-w-5xl mx-auto space-y-4">
        <PageHeader
          icon={Compass}
          title="Decision Center"
          description="Your personalized career and education decision hub"
        />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Couldn't load your decision center</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={load}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { header, parentSummary, selectedPathway, roadmapProgress, nextDecision, informationGaps } = state;
  const discussHref = "/appointments";

  return (
    <div className="space-y-6 p-6 pt-20 max-w-5xl mx-auto">
      <PageHeader
        icon={Sparkles}
        eyebrow="Decision Center"
        title="Your plan, at a glance"
        description={`${header.careerMatchCount} career options · ${state.strongOptions.length} recommended · based on your profile and verified data only`}
        actions={
          selectedPathway.careerId ? (
            <Link href={discussHref}>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/15 ring-1 ring-white/30 hover:bg-white/25"
                onClick={() =>
                  trackRecommendationEvent({ event: "counselor_review_clicked" })
                }
              >
                <Route className="mr-1 h-4 w-4" /> Discuss with counselor
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* 1 — Strongest options */}
      {optionsCard(
        "Strongest career options",
        "Best matched to your current profile evidence.",
        state.strongOptions,
        "No strongly matched careers yet — complete your profile to unlock them."
      )}

      {/* 2 — Explore options */}
      {optionsCard(
        "Explore options",
        "Viable alternatives with some evidence — worth comparing.",
        state.exploreOptions,
        header.lowInformation
          ? "Add more evidence to reveal alternative matches."
          : "No alternative matches yet."
      )}

      {/* 3 — Needs more information */}
      {optionsCard(
        "Needs more information",
        "Not enough evidence to weigh these yet — the app does not guess.",
        state.moreInfoOptions,
        "No unresolved careers."
      )}

      {/* 4 — Recommended programs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4 text-accent" />
            Recommended programs
            <Badge variant="secondary">{state.recommendedPrograms.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Degrees linked to your options from the existing career→program mapping. VERIFIED means a source-verified institution offer exists in our catalog.
          </p>
        </CardHeader>
        <CardContent>
          {state.recommendedPrograms.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No curated programs yet — choose a career direction first.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {state.recommendedPrograms.map((p) => (
                <div
                  key={p.programId}
                  className="rounded-2xl border border-border/70 p-4"
                  onClickCapture={() =>
                    trackRecommendationEvent({
                      event: "program_option_opened",
                      meta: { programId: p.programId },
                    })
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href="/student/programs"
                      className="font-semibold text-foreground hover:underline"
                    >
                      {p.programName}
                    </Link>
                    <SaveWrap itemType="PROGRAM" itemId={p.programId} saved={p.saved} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[p.level, p.category].filter(Boolean).join(" · ") || "Level unavailable"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.verified ? (
                      <Badge variant="success">
                        Program VERIFIED · {p.verifiedInstitutionCount} institution(s)
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Program NOT VERIFIED</Badge>
                    )}
                    {p.countries.slice(0, 3).map((c) => (
                      <Badge key={c} variant="outline">{c}</Badge>
                    ))}
                  </div>
                  {p.careerConnections.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Pathway for: {p.careerConnections.map((c) => c.careerName).join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5 — Verified institution options */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-accent" />
            Verified institution options
            <Badge variant="success">{state.institutionOptions.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Source-verified institutions offering your recommended programs. No fees, cutoffs or admission guarantees are claimed.
          </p>
        </CardHeader>
        <CardContent>
          {state.institutionOptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No verified institution offers yet — availability is withheld rather than guessed.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {state.institutionOptions.map((o, i) => (
                <li
                  key={`${o.academicProgramId}-${o.institutionId}`}
                  className="flex flex-wrap items-start justify-between gap-3 py-3"
                  onClickCapture={() =>
                    trackRecommendationEvent({
                      event: "institution_option_opened",
                      meta: { institutionId: o.institutionId, programId: o.academicProgramId, rank: i },
                    })
                  }
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-foreground">{o.institutionName}</p>
                    <p className="text-sm text-muted-foreground">
                      {o.programName}
                      {[o.country, o.state, o.city].filter(Boolean).join(", ") ? (
                        <> · {[o.city, o.state, o.country].filter(Boolean).join(", ")}</>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[o.qualification, o.studyMode, o.duration].filter(Boolean).join(" · ") ||
                        "Qualification details pending verification"}
                    </p>
                    {o.sourceUrl ? (
                      <Link
                        href={o.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-accent hover:underline"
                      >
                        Source: {o.source}
                      </Link>
                    ) : (
                      <p className="text-xs text-muted-foreground">Source: {o.source}</p>
                    )}
                  </div>
                  <SaveWrap
                    itemType={o.institutionKind === "INDIAN_INSTITUTION" ? "INDIAN_INSTITUTION" : "UNIVERSITY"}
                    itemId={o.institutionId}
                    saved={o.saved}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 6 — Next decision + roadmap progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Route className="h-4 w-4 text-accent" />
            Your next decision
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {nextDecision ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/5 p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{nextDecision.label}</p>
                <p className="text-xs text-muted-foreground">{nextDecision.detail}</p>
              </div>
              <Link href={nextDecision.href}>
                <Button
                  size="sm"
                  onClick={() =>
                    trackRecommendationEvent({
                      event: "next_best_action_clicked",
                      meta: { id: nextDecision.id, href: nextDecision.href },
                    })
                  }
                >
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing pending — revisit anytime.</p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                {roadmapProgress.exists ? "Study roadmap progress" : "No roadmap yet"}
              </span>
              {roadmapProgress.exists && (
                <span className="tabular-nums text-muted-foreground">
                  {roadmapProgress.percent}% · {roadmapProgress.completedCount}/{roadmapProgress.stepCount} actions
                </span>
              )}
            </div>
            {roadmapProgress.exists && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${roadmapProgress.percent}%` }}
                />
              </div>
            )}
            {roadmapProgress.nextStep ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <p className="text-sm text-muted-foreground">
                  Next step: <span className="font-medium text-foreground">{roadmapProgress.nextStep.title}</span>
                  <span className="ml-1 text-xs text-muted-foreground">({roadmapProgress.nextStep.category})</span>
                </p>
                <Link href="/roadmap" className="text-xs text-accent hover:underline">
                  Open roadmap
                </Link>
              </div>
            ) : roadmapProgress.exists ? (
              <p className="text-sm text-muted-foreground">All roadmap actions are complete.</p>
            ) : null}
          </div>

          {informationGaps.length > 0 && (
            <div className="rounded-2xl border border-border/70 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Info className="h-4 w-4 text-muted-foreground" />
                {informationGaps.length} thing{informationGaps.length === 1 ? "" : "s"} to add
              </p>
              <ul className="space-y-2">
                {informationGaps.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-foreground">{g.label}</p>
                      <p className="text-xs text-muted-foreground">{g.detail}</p>
                    </div>
                    {g.action && (
                      <Link href={g.action.href} className="text-xs text-accent hover:underline">
                        {g.action.label} →
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 7 — Selected pathway + parent summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="h-4 w-4 text-accent" />
            Selected pathway & road ahead
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Career</p>
              <p className="font-semibold text-foreground">
                {selectedPathway.careerName ?? "Not chosen yet"}
                {selectedPathway.pathwaySelected ? " · pathway selected" : ""}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Program</p>
              <p className="font-semibold text-foreground">
                {selectedPathway.programName ?? "Not chosen yet"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Universities shortlisted</p>
              <p className="font-semibold text-foreground">
                {selectedPathway.universityShortlistCount} saved
              </p>
            </div>
            {selectedPathway.counselorRecommended && (
              <p className="flex items-center gap-1.5 text-sm text-foreground">
                <Route className="h-4 w-4 text-accent" />
                COUNSELOR REVIEW recommended for this stage.
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/career-matches">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    trackRecommendationEvent({
                      event: "pathway_selected",
                      meta: { href: "/career-matches" },
                    })
                  }
                >
                  <Target className="mr-1 h-4 w-4" /> Review matches
                </Button>
              </Link>
              <Link href="/roadmap">
                <Button size="sm" variant="outline">
                  <Route className="mr-1 h-4 w-4" /> Open roadmap
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border/70 bg-secondary/30 p-4">
            <p className="text-sm font-semibold text-foreground">In simple words</p>
            <p className="text-sm text-muted-foreground">
              {parentSummary.careerArea
                ? `${parentSummary.careerArea} looks like a good area to build toward. `
                : "Build your profile evidence to reveal the strongest area for you. "}
              {parentSummary.possibleProgram
                ? `The degrees to explore are around ${parentSummary.possibleProgram}. `
                : "Curated program options appear once you pick a direction. "}
              {parentSummary.institutionOptionCount > 0
                ? `${parentSummary.institutionOptionCount} verified institution option${parentSummary.institutionOptionCount === 1 ? "" : "s"} ${parentSummary.destinations.length ? `in ${parentSummary.destinations.join(", ")} ` : ""}are confirmable today. `
                : "Institution offers are still being verified — nothing is guessed. "}
            </p>
            <p className="text-sm text-muted-foreground">
              Next step: <span className="font-medium text-foreground">{parentSummary.nextStep}</span>.
            </p>
            <div className="pt-1">
              <Badge
                variant={
                  parentSummary.counselorRecommendation.tone === "recommended"
                    ? "success"
                    : parentSummary.counselorRecommendation.tone === "helpful"
                      ? "secondary"
                      : "outline"
                }
              >
                {parentSummary.counselorRecommendation.label}
              </Badge>
              <p className="mt-1 text-xs text-muted-foreground">
                {parentSummary.counselorRecommendation.detail}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}