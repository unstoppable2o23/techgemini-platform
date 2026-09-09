"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  ListChecks,
  HelpCircle,
  ExternalLink,
  ArrowRight,
  AlertTriangle,
  Info,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { trackRecommendationEvent } from "@/lib/analytics/client";
import type { DecisionCenterState } from "@/lib/decision-center/center";
import type { StudentAdmissionsGuidance } from "@/lib/admissions-intelligence/types";

const READINESS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  READY_TO_RESEARCH: "success",
  NEEDS_VERIFICATION: "warning",
  INFORMATION_MISSING: "destructive",
};

const VERIFY_STATE_VARIANT: Record<string, "success" | "secondary" | "warning" | "outline" | "destructive"> = {
  VERIFIED: "success",
  PARTIALLY_VERIFIED: "secondary",
  SOURCE_AVAILABLE: "outline",
  NOT_VERIFIED: "warning",
  UNKNOWN: "destructive",
};

function ReadinessCard({ guidance }: { guidance: StudentAdmissionsGuidance }) {
  const variant = READINESS_VARIANT[guidance.readiness] ?? "secondary";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-accent" />
          Admissions readiness
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          How much of the admission picture is established for your current pathway.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant={variant} className="text-sm">
          {guidance.readiness === "READY_TO_RESEARCH" && (
            <CheckCircle2 className="mr-1 h-3 w-3" />
          )}
          {guidance.readiness === "NEEDS_VERIFICATION" && (
            <AlertTriangle className="mr-1 h-3 w-3" />
          )}
          {guidance.readiness === "INFORMATION_MISSING" && (
            <Info className="mr-1 h-3 w-3" />
          )}
          {guidance.readinessLabel}
        </Badge>
        <p className="text-sm text-muted-foreground">{guidance.readinessReason}</p>
        <p className="text-xs text-muted-foreground">
          {guidance.focusPrograms.length
            ? `${guidance.focusPrograms.length} focus program(s) · ${guidance.missingInformation.length} item(s) to confirm · ${guidance.officialSources.length} official source(s)`
            : "Nothing to verify yet until a pathway is chosen."}
        </p>
      </CardContent>
    </Card>
  );
}

function ProgramGuidanceCard({
  program,
}: {
  program: StudentAdmissionsGuidance["focusPrograms"][number];
}) {
  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-accent" />
          <p className="font-semibold text-foreground">{program.programName}</p>
        </div>
        <Badge variant={VERIFY_STATE_VARIANT[program.verificationState]}>
          {program.verificationState === "PARTIALLY_VERIFIED" && (
            <CheckCircle2 className="mr-1 h-3 w-3" />
          )}
          {program.verificationState === "UNKNOWN" && <Info className="mr-1 h-3 w-3" />}
          {program.verificationState}
        </Badge>
      </div>
      {program.expectedRoutes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {program.expectedRoutes.map((r) => (
            <Badge key={r.route} variant="outline">
              {r.label}
            </Badge>
          ))}
        </div>
      )}
      {program.relevantEntranceExams.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {program.relevantEntranceExams.map((e, i) => (
            <li key={i}>
              <span className="font-medium text-foreground">{e.name}.</span> {e.context}
            </li>
          ))}
        </ul>
      )}
      {program.counsellingProcess && (
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Counselling:</span>{" "}
          {program.counsellingProcess}
        </p>
      )}
      {program.eligibilityGuidance && (
        <p className="mt-2 text-sm text-muted-foreground">{program.eligibilityGuidance}</p>
      )}
      {program.unknownAspects.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Still to confirm: {program.unknownAspects.join(" · ")}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{program.note}</p>
    </div>
  );
}

export default function AdmissionsPage() {
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
    trackRecommendationEvent({ event: "admissions_guidance_viewed" });
  }, [load]);

  if (loading) {
    return (
      <div className="p-6 pt-20 max-w-5xl mx-auto text-center text-muted-foreground">
        Loading admissions guidance...
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="p-6 pt-20 max-w-5xl mx-auto space-y-4">
        <PageHeader
          icon={ShieldCheck}
          title="Admissions"
          description="Evidence-first admission and counselling guidance"
        />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Couldn&apos;t load admissions guidance</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={load}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const g = state.admissionsGuidance;

  return (
    <div className="space-y-6 p-6 pt-20 max-w-5xl mx-auto">
      <PageHeader
        icon={ShieldCheck}
        eyebrow="Admissions & Counselling Intelligence"
        title="What applies to your pathway"
        description="Which admission routes and official sources to check — based on verified reference data, with unknowns stated clearly."
      />

      <ReadinessCard guidance={g} />

      {/* What applies to your pathway */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4 text-accent" />
            What applies to your pathway
            <Badge variant="secondary">{g.focusPrograms.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Guidance for the programs recommended in your Decision Center. Eligibility should be verified against the official criteria — it is never inferred here.
          </p>
        </CardHeader>
        <CardContent>
          {g.focusPrograms.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No education pathway is mapped yet — revisit after choosing a career direction in the Decision Center.
            </p>
          ) : (
            <div className="grid gap-4">
              {g.focusPrograms.map((p) => (
                <ProgramGuidanceCard key={p.programId} program={p} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* What you need to check */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-accent" />
            What you need to check
            <Badge variant="secondary">{g.missingInformation.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            These items change every year and must be confirmed against the official source — never assumed.
          </p>
        </CardHeader>
        <CardContent>
          {g.missingInformation.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing pending right now — revisit once a pathway is chosen.
            </p>
          ) : (
            <ul className="space-y-3">
              {g.missingInformation.map((m) => (
                <li key={m.id} className="flex gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{m.label}</p>
                    <p className="text-sm text-muted-foreground">{m.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Official sources */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-accent" />
            Official sources
            <Badge variant="secondary">{g.officialSources.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Official domains only. Opening a source fires no forms or submissions — you verify on the official site directly.
          </p>
        </CardHeader>
        <CardContent>
          {g.officialSources.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No official source is linked yet — check the institution&apos;s admissions page.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {g.officialSources.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.purpose}</p>
                    <Badge variant="outline" className="text-xs">
                      {s.domain}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{s.jurisdiction}</Badge>
                    <Link
                      href={s.canonicalUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        trackRecommendationEvent({
                          event: "admissions_source_opened",
                          meta: { sourceId: s.id, domain: s.domain },
                        });
                        trackRecommendationEvent({
                          event: "admissions_verify_clicked",
                          meta: { sourceId: s.id },
                        });
                      }}
                    >
                      <Button size="sm" variant="secondary">
                        Verify on official source <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* What's still unknown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4 text-accent" />
            What&apos;s still unknown
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Unknown is a real answer. Missing information is never converted into &quot;No&quot;.
          </p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {g.generalGuidance.map((line, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Next actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRight className="h-4 w-4 text-accent" />
            Next actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {g.nextActions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Choose a career direction first, then return here for your admission next steps.
            </p>
          ) : (
            <ul className="space-y-3">
              {g.nextActions.map((a) =>
                a.href.startsWith("/") ? (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{a.label}</p>
                      <p className="text-xs text-muted-foreground">{a.detail}</p>
                    </div>
                    <Link href={a.href} onClick={() =>
                      trackRecommendationEvent({
                        event: "admissions_action_opened",
                        meta: { actionId: a.id, href: a.href },
                      })
                    }>
                      <Button size="sm" variant="outline">
                        Continue <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </li>
                ) : (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{a.label}</p>
                      <p className="text-xs text-muted-foreground">{a.detail}</p>
                    </div>
                    <Link href={a.href} target="_blank" rel="noreferrer" onClick={() =>
                      trackRecommendationEvent({
                        event: "admissions_action_opened",
                        meta: { actionId: a.id, sourceId: a.sourceId },
                      })
                    }>
                      <Button size="sm" variant="secondary">
                        Open official source <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </li>
                )
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}