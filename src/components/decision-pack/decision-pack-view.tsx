"use client";

import Link from "next/link";
import { useEffect, type ComponentType, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  FileText,
  GraduationCap,
  Info,
  ListChecks,
  MessageSquare,
  Target,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { trackRecommendationEvent } from "@/lib/analytics/client";
import { PrintButton } from "./print-button";
import type {
  DecisionPack,
  DecisionPackAction,
  DecisionPackCareerCard,
  DecisionPackPathwayAdmissions,
  ProgramVerification,
} from "@/lib/decision-pack/types";

export type DecisionPackMode = "student" | "counselor";

const VERIFY_VARIANT: Record<ProgramVerification, "success" | "warning" | "destructive"> = {
  VERIFIED: "success",
  PARTIAL: "warning",
  NOT_VERIFIED: "destructive",
};

const PRIORITY_VARIANT: Record<DecisionPackAction["priority"], "warning" | "secondary" | "outline"> = {
  high: "warning",
  medium: "secondary",
  low: "outline",
};

export function DecisionPackView({
  pack,
  mode,
}: {
  pack: DecisionPack;
  mode: DecisionPackMode;
}) {
  useEffect(() => {
    if (mode !== "student") return;
    trackRecommendationEvent({ event: "decision_pack_viewed" });
  }, [mode]);

  useEffect(() => {
    if (mode !== "student") return;
    const onPrint = () => {
      trackRecommendationEvent({ event: "decision_pack_printed" });
    };
    window.addEventListener("beforeprint", onPrint);
    return () => window.removeEventListener("beforeprint", onPrint);
  }, [mode]);

  const openAction = (a: DecisionPackAction) =>
    trackRecommendationEvent({
      event: "decision_pack_action_opened",
      meta: { actionId: a.id, type: a.type, priority: a.priority },
    });

  const strong = pack.careerDirections.filter((c) => c.group === "strong");
  const explore = pack.careerDirections.filter((c) => c.group === "explore");
  const moreInfo = pack.careerDirections.filter((c) => c.group === "more_info");

  return (
    <div className="mx-auto max-w-4xl space-y-10 p-4 pb-16 sm:p-6">
      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {mode === "counselor" ? "Counselor workspace · Decision Pack" : "Technically Guided Decision Pack"}
          </p>
          <h1 className="text-2xl font-bold">{pack.student.firstName} {pack.student.lastName}</h1>
        </div>
        <PrintButton onPrint={() => {}} label="Print / Save PDF" />
      </div>
      <p className="sr-only">
        Decision pack for {pack.student.firstName} {pack.student.lastName}
      </p>

      {/* Snapshot strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 print:grid-cols-5">
        <StatCard label="Profile completeness" value={`${pack.snapshot.profileCompleteness}%`} />
        <StatCard
          label="Assessments"
          value={`${pack.snapshot.assessmentCompletedCount}/${pack.snapshot.assessmentTotal}`}
        />
        <StatCard
          label="Career matches"
          value={pack.snapshot.lowInformation ? "More info needed" : `${pack.snapshot.careerMatchCount}`}
        />
        <StatCard label="Decision stage" value={pack.currentDecision.stage} />
        <StatCard label="Admissions readiness" value={pack.admissionsSummary.readinessLabel} />
      </div>

      <Section id="student" icon={Users} title="Student snapshot">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Field label="Education stage" value={pack.student.educationStageLabel ?? "Not set"} />
          <Field label="Grade / study level" value={`${pack.student.gradeLevel ?? "—"}${pack.student.studyLevel ? ` · ${pack.student.studyLevel}` : ""}`} />
          <Field label="Current program" value={pack.student.currentProgram ?? "—"} />
          <Field label="State" value={pack.student.state ?? "—"} />
          <Field label="Target country" value={pack.student.targetCountry ?? "—"} />
          <Field label="Preferred intake" value={`${pack.student.preferredIntake ?? "—"}${pack.student.preferredYear ? ` · ${pack.student.preferredYear}` : ""}`} />
        </dl>
      </Section>

      <Section id="assessments" icon={FileText} title="Assessment snapshot">
        <p className="text-sm text-muted-foreground">
          {pack.assessments.completedCount} of {pack.assessments.total} assessments completed.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {pack.assessments.completed.map((k) => (
            <Badge key={k} variant="success">
              <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
              {k} — completed
            </Badge>
          ))}
          {pack.assessments.remaining.map((k) => (
            <Badge key={k} variant="outline">
              <Circle className="mr-1 h-3 w-3" aria-hidden="true" />
              {k} — pending
            </Badge>
          ))}
          {pack.assessments.completed.length === 0 && (
            <span className="text-sm text-muted-foreground">No assessments completed yet.</span>
          )}
        </div>
      </Section>

      <Section
        id="careers"
        icon={Target}
        title="Career directions"
        hint="Supported by the current profile evidence — these are guidance, not a promise."
      >
        <CareerGroup
          heading="Strongly aligned"
          notice="Supported by your profile"
          careers={strong}
          mode={mode}
        />
        <CareerGroup heading="Worth exploring" careers={explore} mode={mode} />
        <CareerGroup
          heading="Need more information"
          notice="More evidence required before relying on these"
          careers={moreInfo}
          mode={mode}
        />
      </Section>

      <Section id="pathway" icon={GraduationCap} title="Education pathway">
        {pack.educationPathways.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No education pathway can be listed yet — more career evidence is needed.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {pack.educationPathways.map((p) => (
              <li key={`${p.kind}-${p.programId ?? p.programName}`} className="py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant={p.kind === "PROGRAM" ? "secondary" : "outline"}>{p.kind === "PROGRAM" ? "Program" : "Degree route"}</Badge>
                    <span className="font-medium">{p.programName ?? p.careerName}</span>
                    {p.careerName && p.kind === "PROGRAM" && (
                      <span className="text-muted-foreground">· {p.careerName}</span>
                    )}
                  </span>
                  <VerifyBadge verification={p.verification} count={p.verifiedInstitutionCount} />
                </div>
                {p.admissions && (
                  <AdmissionsStep admissions={p.admissions} programName={p.programName} />
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="universities" icon={Building2} title="University options (verified availability only)">
        {pack.universityOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No verified institution offers are available for the current pathway yet.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {pack.universityOptions.map((o) => (
              <li key={o.institutionId} className="py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="font-medium">{o.institutionName}</span>
                    <span className="text-muted-foreground">· {o.institutionKind.toLowerCase()}</span>
                    {o.saved && <Badge variant="default">Saved</Badge>}
                  </span>
                  <VerifyBadge verification="VERIFIED" count={1} />
                </div>
                <p className="text-muted-foreground">
                  {o.programName} · {o.studyMode ?? "mode not stated"} · {o.duration ?? "duration not stated"}
                  {o.country ? ` · ${o.country}` : o.state ? ` · ${o.state}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="current-decision" icon={Info} title="Current decision">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">Stage: {pack.currentDecision.stage}</Badge>
          {pack.currentDecision.decision && (
            <span className="text-sm font-medium">{pack.currentDecision.decision.label}</span>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{pack.currentDecision.why}</p>

        {pack.currentDecision.evidenceStillMissing.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Evidence still missing</h3>
            <ul className="mt-2 space-y-1">
              {pack.currentDecision.evidenceStillMissing.map((g) => (
                <li key={g.label} className="flex gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                  <span>
                    <span className="font-medium">{g.label}.</span> <span className="text-muted-foreground">{g.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pack.currentDecision.recommendedAction && (
          <div className="mt-4">
            <Link
              href={pack.currentDecision.recommendedAction.href}
              className={buttonVariants({ size: "sm" })}
              onClick={() =>
                trackRecommendationEvent({
                  event: "decision_pack_action_opened",
                  meta: { actionId: "recommended_action", type: "NEXT_DECISION" },
                })
              }
            >
              {pack.currentDecision.recommendedAction.label}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </Section>

      <Section id="action-plan" icon={ListChecks} title="Action plan">
        {pack.actionPlan.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everything tracked is up to date.</p>
        ) : (
          <ul className="space-y-2">
            {pack.actionPlan.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <Badge variant={PRIORITY_VARIANT[a.priority]}>{a.priority}</Badge>
                  <Badge variant="outline">{a.type}</Badge>
                  <span className="font-medium">{a.title}</span>
                  <span className="text-muted-foreground">{a.reason}</span>
                </span>
                <Link
                  href={a.href}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                  onClick={() => openAction(a)}
                >
                  Open
                  {a.done ? <CheckCircle2 className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" /> : <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {mode === "student" && (
        <Section id="parent" icon={Users} title="Parent-friendly summary">
          <ul className="space-y-2 text-sm leading-relaxed">
            <li><strong>Where the student is now.</strong> {pack.parentSummary.whereTheStudentIsNow}</li>
            <li><strong>Career directions supported by current evidence.</strong> {pack.parentSummary.careerDirectionsSupported}</li>
            <li><strong>Possible study pathway.</strong> {pack.parentSummary.studyPathway}</li>
            <li><strong>What still needs to be confirmed.</strong> {pack.parentSummary.whatStillNeedsConfirmation}</li>
            <li><strong>What should happen next.</strong> {pack.parentSummary.nextRecommendedStep}</li>
            <li><strong>Counselor support.</strong> {pack.parentSummary.counselorSupport}</li>
          </ul>
        </Section>
      )}

      {mode === "counselor" && pack.counselor && (
        <CounselorSection pack={pack} />
      )}

      <footer className="rounded-xl border bg-muted/40 p-4 text-xs text-muted-foreground">
        {pack.disclaimer}
        {/* Note is intentionally text-only: no colour conveys meaning. */}
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  hint,
  children,
}: {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`dp-${id}`}
      className={id !== "student" ? "print:break-before-page" : ""}
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 id={`dp-${id}`} className="text-lg font-bold">
          {title}
        </h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Card>
        <CardContent className="p-4">{children}</CardContent>
      </Card>
    </section>
  );
}

function AdmissionsStep({
  admissions,
  programName,
}: {
  admissions: DecisionPackPathwayAdmissions;
  programName: string | null;
}) {
  void programName;
  return (
    <div className="mt-1.5 ml-6 rounded-xl border border-border/70 bg-secondary/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Admissions &amp; next steps
      </p>
      {admissions.routes.length > 0 && (
        <p className="mt-1 text-xs text-foreground">
          Route(s): {admissions.routes.join(" · ")}
        </p>
      )}
      {admissions.needsVerification && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          Confirm current-year eligibility, dates and cutoffs with the official source — never assumed.
        </p>
      )}
      {admissions.eligibilityGuidance && (
        <p className="mt-1 text-xs text-muted-foreground">
          {admissions.eligibilityGuidance}
        </p>
      )}
      {admissions.entranceGuidance && (
        <p className="mt-1 text-xs text-muted-foreground">
          Entrance: {admissions.entranceGuidance}
        </p>
      )}
      {admissions.officialSources.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5">
          {admissions.officialSources.map((s) => (
            <li key={s.url}>
              <Link
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent hover:underline"
              >
                {s.name} — {s.url}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          No official source linked yet — check the institution&apos;s admissions page.
        </p>
      )}
      {admissions.note && (
        <p className="mt-1.5 text-xs text-muted-foreground">{admissions.note}</p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function VerifyBadge({ verification, count }: { verification: ProgramVerification; count: number }) {
  return (
    <Badge variant={VERIFY_VARIANT[verification]}>
      {verification === "VERIFIED" && <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />}
      {verification === "PARTIAL" && <AlertTriangle className="mr-1 h-3 w-3" aria-hidden="true" />}
      {verification === "NOT_VERIFIED" && <Info className="mr-1 h-3 w-3" aria-hidden="true" />}
      {verification}
      {verification === "VERIFIED" && count > 0 ? ` · ${count}` : ""}
    </Badge>
  );
}

function CareerGroup({
  heading,
  notice,
  careers,
  mode,
}: {
  heading: string;
  notice?: string;
  careers: DecisionPackCareerCard[];
  mode: DecisionPackMode;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{heading}</h3>
        {notice && <Badge variant="outline">{notice}</Badge>}
      </div>
      {careers.length === 0 ? (
        <p className="text-sm text-muted-foreground">None yet.</p>
      ) : (
        <ul className="space-y-2">
          {careers.map((c) => (
            <CareerRow key={c.careerId} c={c} mode={mode} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CareerRow({ c, mode }: { c: DecisionPackCareerCard; mode: DecisionPackMode }) {
  const open = () =>
    trackRecommendationEvent({
      event: "decision_pack_action_opened",
      careerId: c.careerId,
      meta: { actionId: `career_${c.group}`, type: "CAREER" },
    });

  return (
    <li className="rounded-xl border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold">{c.careerName}</span>
          <Badge variant="secondary">{c.status}</Badge>
          {c.supportedByProfile && (
            <Badge variant="outline">
              <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
              Supported by your profile
            </Badge>
          )}
          {c.preferred && <Badge>Selected pathway</Badge>}
          {c.saved && <Badge variant="default">Saved</Badge>}
        </span>
        {c.detailHref && (
          <Link
            href={c.detailHref}
            className={buttonVariants({ size: "sm", variant: "ghost" })}
            onClick={open}
          >
            Details
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {c.program ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          {c.program.programName}
          <VerifyBadge verification={c.program.verification} count={c.program.verifiedInstitutionCount} />
          {c.program.level ? <span>· {c.program.level}</span> : null}
        </p>
      ) : (
        <p className="mt-1.5 text-sm text-muted-foreground">No program mapped yet.</p>
      )}

      {c.topReasons.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
          {c.topReasons.map((r, i) => (
            <li key={i} className="flex gap-1.5">
              {c.group === "more_info" ? (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" aria-hidden="true" />
              )}
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {c.developmentAreas.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold">Development areas:</span> {c.developmentAreas.join("; ")}
        </p>
      )}
      {c.missingEvidence.length > 0 && (
        <p className="mt-1 text-xs text-amber-700">
          <span className="font-semibold">Missing evidence:</span> {c.missingEvidence.join("; ")}
        </p>
      )}
      {mode === "counselor" && (
        <p className="mt-1 text-[11px] text-muted-foreground">Journey stage: {c.stage}</p>
      )}
    </li>
  );
}

function CounselorSection({ pack }: { pack: DecisionPack }) {
  const c = pack.counselor!;
  const decisions = c.counselorDecisions.filter(
    (d) => d.shortlistedCareer || d.selectedPathway || d.followUpRequired || d.studentInterest
  );
  return (
    <section aria-labelledby="dp-counselor" className="print:break-before-page">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 id="dp-counselor" className="text-lg font-bold">
          Counselor summary
        </h2>
        {c.counselorName && (
          <Badge variant="secondary">Prepared by {c.counselorName}</Badge>
        )}
      </div>
      <Card>
        <CardContent className="space-y-4 p-4">
          <p className="text-sm text-muted-foreground">
            {c.snapshot.studentName} · {c.snapshot.educationStageLabel ?? "stage not set"} · profile{" "}
            {c.snapshot.profileCompleteness}% · assessments {c.snapshot.assessmentCompletedCount}/
            {c.snapshot.assessmentTotal} · roadmap {c.snapshot.roadmapProgress}%
          </p>

          <div>
            <h3 className="text-sm font-semibold">Recommendations</h3>
            <p className="text-sm text-muted-foreground">
              {c.recommendations.strongOptionCount} strong · {c.recommendations.exploreOptionCount} to
              explore · {c.recommendations.moreInformationCount} need more information.
              {c.recommendations.topCareerName ? ` Top direction: ${c.recommendations.topCareerName}.` : ""}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Information gaps</h3>
            {c.gaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">None flagged.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {c.gaps.map((g) => (
                  <li key={g.label} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{g.label}.</span> {g.detail}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold">Pathway</h3>
            <p className="text-sm text-muted-foreground">
              {c.pathway.careerName ?? "No career direction yet"}
              {c.pathway.programName ? ` · ${c.pathway.programName}` : ""} · stage {c.decisionStage}
            </p>
          </div>

          {decisions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Career decisions (advisor)</h3>
              <ul className="space-y-1 text-sm">
                {decisions.map((d) => (
                  <li key={d.id} className="text-muted-foreground">
                    {d.careerName}
                    {d.shortlistedCareer && <Badge variant="secondary" className="ml-1">Shortlisted</Badge>}
                    {d.selectedPathway && <Badge variant="success" className="ml-1">Selected pathway</Badge>}
                    {d.followUpRequired && <Badge variant="warning" className="ml-1">Follow-up</Badge>}
                    {d.studentInterest && <Badge variant="outline" className="ml-1">Student interested</Badge>}
                    {d.counselorRecommendation && (
                      <p className="text-xs">{d.counselorRecommendation}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.programPlans.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Program planning</h3>
              <ul className="space-y-1 text-sm">
                {c.programPlans.map((p) => (
                  <li key={p.id} className="text-muted-foreground">
                    {p.programName}
                    {p.shortlisted && <Badge variant="secondary" className="ml-1">Shortlisted</Badge>}
                    {p.requiresResearch && <Badge variant="warning" className="ml-1">Needs research</Badge>}
                    {p.studentInterested && <Badge variant="outline" className="ml-1">Student interested</Badge>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.notes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Counselor notes</h3>
              <ul className="space-y-1 text-sm">
                {c.notes.map((n) => (
                  <li key={n.id} className="text-muted-foreground">
                    {n.content}
                    <span className="text-xs"> · {n.type.toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.openActions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Open advisor actions</h3>
              <ul className="space-y-1 text-sm">
                {c.openActions.map((a) => (
                  <li key={a.id} className="text-muted-foreground">
                    {a.title} {a.dueDate ? `· due ${new Date(a.dueDate).toLocaleDateString()}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold">Discussion topics</h3>
            {c.discussionTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                {c.discussionTopics.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold">Next-best actions</h3>
            <ul className="space-y-1 text-sm">
              {c.nextBestActions.map((a) => (
                <li key={a.id} className="text-muted-foreground">
                  <Badge variant={PRIORITY_VARIANT[a.priority]}>{a.priority}</Badge>{" "}
                  <span className="font-medium text-foreground">{a.title}</span> — {a.reason}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}