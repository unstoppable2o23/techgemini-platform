import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SaveButton from "@/components/student/save-button";
import { JourneySection } from "@/components/student/journey-section";
import {
  SectionHeading,
  EmptyState,
  MatchPill,
  ConfidencePill,
  PathwayBadge,
  ProgressRing,
} from "@/components/student/display";
import {
  Sparkles,
  GraduationCap,
  Building2,
  Flame,
  MessagesSquare,
  ArrowRight,
  Check,
  ArrowUpRight,
  Target,
  Compass,
  Bookmark,
  CircleHelp,
  Clock,
} from "lucide-react";
import type { StudentDashboard } from "@/lib/student/dashboard.ts";
import type { JourneyState } from "@/lib/student/journey-state.ts";

function MappingBadge({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, string> = {
    curated: "bg-emerald-100 text-emerald-700 border-emerald-200",
    "institutionType-category": "bg-amber-100 text-amber-700 border-amber-200",
    none: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${map[status] ?? map.none}`}>
      {status === "curated"
        ? "Verified mapping"
        : status === "institutionType-category"
        ? "Category-based"
        : "Unverified"}
    </span>
  );
}

export default function StudentIntelligenceHub({
  dashboard,
  studentName,
  journey,
}: {
  dashboard: StudentDashboard;
  studentName?: string;
  journey?: JourneyState;
}) {
  const d = dashboard;
  const completed = d.assessmentCompletedCount;
  const assigned = d.assessmentTotal ?? 5;
  const assessmentState =
    assigned === 0 ? "none" : completed === 0 ? "zero" : completed >= assigned ? "full" : "partial";

  const nba = journey?.nextBestAction ?? null;

  return (
    <div className="space-y-12">
      {/* HERO */}
      <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-accent">
          {assessmentState === "full"
            ? "Your profile is fully enriched"
            : assessmentState === "partial"
            ? "Your recommendations are taking shape"
            : assessmentState === "none"
            ? "Your profile is ready without assessments"
            : "Let's start discovering your path"}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Hi{studentName ? `, ${studentName}` : ""} 👋
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Let&apos;s build your next step.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl border bg-muted/20 p-4">
            <ProgressRing value={Math.round(d.profileCompleteness)} sublabel="complete" />
            <div>
              <p className="text-sm font-semibold text-foreground">Career Profile</p>
              <p className="text-xs text-muted-foreground">Based on what you&apos;ve shared</p>
            </div>
          </div>
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground">Assessment progress</p>
            <p className="mt-1 text-2xl font-bold text-accent">
              {assigned === 0 ? "—" : completed}
              {assigned > 0 && (
                <span className="text-base font-medium text-muted-foreground">
                  {" "}of {assigned} assigned
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {assessmentState === "none"
                ? "No assessments assigned yet — nothing blocks your path"
                : assessmentState === "zero"
                ? "Optional — profile info still guides you"
                : assessmentState === "partial"
                ? "More assessments = more personalization"
                : "All assigned assessments done"}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground">Saved items</p>
            <p className="mt-1 text-2xl font-bold text-accent">{d.savedCount}</p>
            <Link href="/saved" className="mt-1 inline-block text-xs text-accent hover:underline">
              View shortlist →
            </Link>
          </div>
        </div>

        {nba && (
          <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-xl bg-accent/5 p-4 ring-1 ring-inset ring-accent/15 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Target className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{nba.label}</p>
                <p className="text-xs text-muted-foreground">{nba.detail}</p>
              </div>
            </div>
            <Link
              href={nba.href}
              className={cn(buttonVariants({ variant: "default", size: "sm" }), "shrink-0")}
            >
              Get started
            </Link>
          </div>
        )}

        {assessmentState === "none" && (
          <p className="mt-3 text-sm text-muted-foreground">
            Your recommendations use your academics, subjects, interests and preferences — no
            assessment is required. Want deeper personalization? Ask your counselor to assign one.
          </p>
        )}
        {assessmentState === "zero" && (
          <p className="mt-3 text-sm text-muted-foreground">
            Your recommendations use your academics, subjects, interests and preferences.
            Want deeper personalization?{" "}
            <span className="font-medium text-accent">Take your assigned assessments →</span>
          </p>
        )}
        {assessmentState === "partial" && (
          <p className="mt-3 text-sm text-muted-foreground">
            Your recommendations will become more personalized as you complete more assessments.
          </p>
        )}
      </section>

      {journey && <JourneySection journey={journey} />}

      {/* CAREER MATCHES */}
      <section data-tour="matches" className="space-y-4">
        <SectionHeading
          icon={Sparkles}
          eyebrow="For you"
          title="Your Career Matches"
          subtitle="Careers that align with the information in your profile."
          action={
            d.topCareerMatches.length > 0 ? (
              <Link href="/career-matches" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                View all matches <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null
          }
        />
        {d.topCareerMatches.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="Discover careers that fit you"
            description="Add a few more details about your interests and subjects to improve career suggestions."
            action={
              <Link href="/career-preferences" className={cn(buttonVariants({ size: "sm" }))}>
                Update your profile
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {d.topCareerMatches.map((m: any) => (
              <Card key={m.careerId} className="min-w-0 flex flex-col border-accent/15 shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/career-library/${m.career.slug}`}
                        className="block truncate text-lg font-semibold text-foreground hover:text-accent"
                      >
                        {m.career.title || m.career.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{m.career.category}</p>
                    </div>
                    <MatchPill score={m.matchScore} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <ConfidencePill confidence={m.confidenceScore} />
                  </div>

                  {(m.strengths || []).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Why it fits</p>
                      {(m.strengths as string[]).slice(0, 3).map((s: string, i: number) => (
                        <p key={i} className="flex items-start gap-1.5 text-sm text-foreground">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          {s}
                        </p>
                      ))}
                    </div>
                  )}

                  {m.developmentAreas && (m.developmentAreas as string[]).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-amber-700">Develop: </span>
                      {(m.developmentAreas as string[]).slice(0, 2).join(", ")}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <SaveButton itemType="CAREER" itemId={m.careerId} />
                    <Link
                      href={`/career-library/${m.career.slug}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                    >
                      Explore <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {d.careerMatchDisclaimer && (
          <p className="text-xs text-muted-foreground">{d.careerMatchDisclaimer}</p>
        )}
      </section>

      {/* EDUCATION PATHWAYS */}
      <section className="space-y-4">
        <SectionHeading
          icon={GraduationCap}
          eyebrow="What to study"
          title="Education Pathways"
          subtitle={
            d.topCareerId && d.topCareerMatches[0]
              ? `Steps to prepare for ${d.topCareerMatches[0].career.title || d.topCareerMatches[0].career.name}.`
              : "Recommended study paths based on your top career match."
          }
        />
        {!d.educationPathways ? (
          <EmptyState
            icon={GraduationCap}
            title="Education pathways will appear soon"
            description="These show once a clear career direction is available."
          />
        ) : (
          <div className="space-y-6">
            {(
              [
                { key: "primary", label: "Recommended pathway" },
                { key: "alternative", label: "Alternative pathways" },
                { key: "optional", label: "Optional steps" },
              ] as const
            ).map((group) => {
              const items = (d.educationPathways?.[group.key] || []).slice(0, 3);
              if (items.length === 0) return null;
              return (
                <div key={group.key} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((p: any) => (
                      <Card key={p.id} className="border-accent/10 shadow-sm">
                        <CardContent className="space-y-2 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-foreground">
                              {p.degree?.name || "Degree"}
                              {p.specialization?.name ? ` → ${p.specialization.name}` : ""}
                            </p>
                            <PathwayBadge priority={p.priority} />
                          </div>
                          {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}

            {d.educationPathways.recommendedSubjects?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Helpful subjects
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {d.educationPathways.recommendedSubjects.map((s: any, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                    >
                      {s?.name || s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* UNIVERSITY MATCHES */}
      <section className="space-y-4">
        <SectionHeading
          icon={Building2}
          eyebrow="Where to study"
          title="Universities For Your Path"
          subtitle="Institutions that fit your education pathway."
        />
        {!d.universityMatches || d.universityMatches.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No verified matches yet"
                description={
                  d.topCareerId
                    ? "We couldn't find verified institution matches for this pathway yet. Some recommendations may be category-based rather than confirmed program offerings."
                    : "Complete your top career match to see personalized university recommendations."
                }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {d.universityMatches.slice(0, 3).map((m: any) => (
              <Card key={m.institution?.id} className="border-accent/10 shadow-sm">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{m.institution?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[m.institution?.institutionType, m.institution?.state, m.institution?.country]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <MatchPill score={m.matchScore} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <MappingBadge status={m.mappingStatus} />
                    <ConfidencePill confidence={m.confidence} />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {m.institution?.website ? (
                      <a
                        href={m.institution.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                      >
                        View institution <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span />
                    )}
                    <SaveButton itemType="UNIVERSITY" itemId={m.institution?.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {d.universityMatchDisclaimer && (
          <p className="text-xs text-muted-foreground">{d.universityMatchDisclaimer}</p>
        )}
      </section>

      {/* TRENDING — personalized "Trending for You" discovery layer */}
      <section className="space-y-4">
        <SectionHeading
          icon={Flame}
          eyebrow={d.trendingResult?.view === "foryou" ? "Personalized" : "Explore"}
          title={d.trendingResult?.view === "foryou" ? "Trending for You" : "Trending Careers"}
          subtitle={
            d.trendingResult?.view === "foryou"
              ? "Emerging careers that may be relevant to your education and interests."
              : "Emerging careers worth exploring."
          }
        />
        {d.trendingCareers.length === 0 ? (
          <EmptyState icon={Flame} title="Trend information isn't available right now" />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {d.trendingCareers.map((t: any) => (
              <Link
                key={t.career.id}
                href={`/career-library/${t.career.slug}`}
                className="group rounded-xl border border-dashed bg-muted/20 p-3 transition-colors hover:border-accent/40 hover:bg-accent/5"
              >
                <p className="truncate text-sm font-medium text-foreground">{t.career.title || t.career.name}</p>
                <p className="text-xs text-muted-foreground">{t.career.category}</p>
                {t.trendCategory && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700 ring-1 ring-inset ring-orange-200">
                    {t.trendCategory?.replace(/_/g, " ") ?? "Trending"}
                  </span>
                )}
                {d.trendingResult?.view === "foryou" && t.relevanceScore != null && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">
                    Relevance: {t.relevanceScore}%
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
        {d.trendingResult && d.trendingResult.total > 0 && (
          <p className="text-xs text-muted-foreground italic">
            {d.trendingResult.disclaimer}
          </p>
        )}
      </section>

      {/* SHORTLIST */}
      <section className="space-y-4">
        <SectionHeading
          icon={Bookmark}
          eyebrow="Your list"
          title="Shortlist"
          subtitle="Careers and universities you've saved."
          action={
            <Link href="/saved" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
              Manage <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {d.savedItems.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            description="Tap the save icon on any career or university to keep it here."
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {d.savedItems.slice(0, 6).map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  {s.itemType === "CAREER" ? <Sparkles className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {s.itemType === "CAREER" ? "Saved career" : s.itemType === "UNIVERSITY" ? "Saved university" : "Saved item"}
                  </p>
                  {s.note && <p className="truncate text-xs text-muted-foreground">{s.note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* COUNSELOR HANDOFF */}
      <section>
        <Card className="border-accent/15 bg-accent/5 shadow-sm">
          <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <MessagesSquare className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-semibold text-foreground">Talk it through with your counselor</p>
                <p className="text-xs text-muted-foreground">Get a second opinion on your matches and pathways.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/appointments" className="text-sm font-medium text-accent hover:underline">
                Book appointment
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link href="/messages" className="text-sm font-medium text-accent hover:underline">
                Message
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
