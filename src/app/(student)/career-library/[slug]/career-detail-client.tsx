"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  GraduationCap,
  IndianRupee,
  Target,
  TrendingUp,
  Users,
  ChevronDown,
  Sparkles,
  Cpu,
  Laptop,
  Landmark,
  Wallet,
} from "lucide-react";

const DEMAND_STYLES: Record<string, string> = {
  High: "bg-white/20 text-white border border-white/30",
  Medium: "bg-white/20 text-white border border-white/30",
  Low: "bg-white/20 text-white border border-white/30",
};

const STAT_STYLES = [
  { icon: IndianRupee, label: "Entry Salary", grad: "from-blue-500 to-blue-500" },
  { icon: Wallet, label: "Senior Salary", grad: "from-blue-500 to-blue-500" },
  { icon: TrendingUp, label: "Job Growth", grad: "from-blue-500 to-blue-500" },
  { icon: Landmark, label: "Top Industries", grad: "from-blue-500 to-blue-500" },
];

type OptionItem = { title?: string; description?: string };
type Pathway = { name?: string; steps?: { title?: string; description?: string }[] };

function Accordion({
  icon,
  title,
  tint,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  tint: string;
  items: OptionItem[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-accent/5 transition-colors"
      >
        <span className="flex items-center gap-2.5 font-medium">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${tint} text-white`}>
            {icon}
          </span>
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {items.map((item, i) => (
            <div key={i}>
              <p className="font-medium text-sm">{item.title}</p>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, tint, children }: { icon: any; tint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tint} text-white shadow-sm`}>
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="text-lg font-semibold">{children}</h2>
    </div>
  );
}

export default function CareerDetailClient({ career }: { career: any }) {
  const [showAllPathways, setShowAllPathways] = useState(false);

  const faqs: { question?: string; answer?: string }[] = career.faqs || [];
  const pathways: Pathway[] = career.pathways || [];
  const visiblePathways = showAllPathways ? pathways : pathways.slice(0, 1);
  const clean = (v?: string) => (typeof v === "string" ? v.replace(/^\?+/, "") : v || "");
  const industries = career.topIndustries || [];

  return (
    <div className="space-y-6 p-6 pt-20 max-w-4xl mx-auto">
      <Link href="/career-library">
        <Button variant="ghost" size="sm" className="mb-3 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Career Library
        </Button>
      </Link>

      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-accent to-primary p-8 md:p-10 text-white shadow-xl">
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Laptop className="h-3.5 w-3.5" /> Career Profile
            </span>
            {career.demandLevel && (
              <Badge className={DEMAND_STYLES[career.demandLevel] || "bg-white/20 text-white"}>
                {career.demandLevel} Demand
              </Badge>
            )}
            {industries.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                {industries.slice(0, 2).join(" · ")}
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            {career.title}
          </h1>
          <p className="text-white/85 mt-4 max-w-2xl text-base md:text-lg">{career.introduction}</p>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STAT_STYLES.map((s) => {
          const Icon = s.icon;
          const value =
            s.label === "Entry Salary"
              ? clean(career.salaryEntry)
              : s.label === "Senior Salary"
              ? clean(career.salarySenior)
              : s.label === "Job Growth"
              ? career.jobGrowth || "—"
              : industries.length > 0
              ? `${industries.length} sectors`
              : "—";
          return (
            <div key={s.label} className="rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md">
              <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.grad} text-white shadow-sm`}>
                <Icon className="h-5 w-5" />
              </span>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-semibold mt-0.5 leading-snug">{value || "—"}</p>
            </div>
          );
        })}
      </div>

      {career.futureOutlook && (
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-accent/10 to-transparent p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-accent mb-1">
            <TrendingUp className="h-4 w-4" /> Market Outlook
          </div>
          <p className="text-sm text-muted-foreground">{career.futureOutlook}</p>
        </div>
      )}

      <div>
        <SectionHeader icon={GraduationCap} tint="from-blue-500 to-blue-500">Eligibility &amp; Requirements</SectionHeader>
        <div className="space-y-2.5 rounded-2xl border bg-card p-5">
          {career.eligibility.map((e: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm list-none">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-accent shrink-0" />
              <span>{e}</span>
            </li>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader icon={Users} tint="from-blue-500 to-blue-500">Who Should Pursue This?</SectionHeader>
        <div className="space-y-2.5 rounded-2xl border bg-card p-5">
          {career.whoShouldPursue.map((w: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm list-none">
              <Users className="h-4 w-4 mt-0.5 text-accent shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader icon={Clock} tint="from-blue-500 to-blue-500">Work Nature &amp; Reality</SectionHeader>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground mb-3">{career.workNatureDesc}</p>
          <div className="space-y-2.5">
            {career.workNatureExamples.map((w: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm list-none">
                <Briefcase className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                <span>{w}</span>
              </li>
            ))}
          </div>
        </div>
      </div>

      {pathways.length > 0 && (
        <div>
          <SectionHeader icon={Target} tint="from-blue-500 to-blue-500">Career Pathways</SectionHeader>
          <div className="space-y-3">
            {visiblePathways.map((p: Pathway, i: number) => (
              <div key={i} className="overflow-hidden rounded-2xl border bg-card">
                <div className="px-4 py-3 bg-accent/5 font-medium text-sm">{p.name}</div>
                <div className="px-4 py-3 space-y-3">
                  {p.steps?.map((s, j) => (
                    <div key={j} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                        {j + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{s.title}</p>
                        {s.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {pathways.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setShowAllPathways(!showAllPathways)}
            >
              {showAllPathways ? "Show less" : `Show ${pathways.length - 1} more route${pathways.length - 1 > 1 ? "s" : ""}`}
            </Button>
          )}
        </div>
      )}

      <div>
        <SectionHeader icon={Briefcase} tint="from-blue-500 to-blue-500">Career Options</SectionHeader>
        <div className="space-y-2.5">
          {career.conventionalOptions?.length > 0 && (
            <Accordion icon={<Briefcase className="h-4 w-4" />} title="Conventional Options" tint="from-slate-500 to-slate-600" items={career.conventionalOptions} />
          )}
          {career.newAgeOptions?.length > 0 && (
            <Accordion icon={<Sparkles className="h-4 w-4" />} title="New-Age Options" tint="from-blue-500 to-blue-500" items={career.newAgeOptions} />
          )}
          {career.aiRelatedOptions?.length > 0 && (
            <Accordion icon={<Cpu className="h-4 w-4" />} title="AI-Related Options" tint="from-blue-500 to-blue-500" items={career.aiRelatedOptions} />
          )}
        </div>
      </div>

      {faqs.length > 0 && (
        <div>
          <SectionHeader icon={Sparkles} tint="from-blue-500 to-blue-500">FAQs</SectionHeader>
          <div className="space-y-2.5">
            {faqs.map((f, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
                <p className="font-medium text-sm">{f.question}</p>
                <p className="text-sm text-muted-foreground mt-1">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(career.technicalSkills?.length > 0 || career.softSkills?.length > 0) && (
        <div>
          <SectionHeader icon={Cpu} tint="from-blue-500 to-blue-500">Skills</SectionHeader>
          <div className="space-y-4">
            {career.technicalSkills?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Technical Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {career.technicalSkills.map((s: string, i: number) => (
                    <span key={i} className="rounded-full border bg-card px-3 py-1 text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {career.softSkills?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Soft Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {career.softSkills.map((s: string, i: number) => (
                    <span key={i} className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs text-accent">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(career.recommendedDegrees?.length > 0 || career.recommendedSubjects?.length > 0) && (
        <div>
          <SectionHeader icon={GraduationCap} tint="from-blue-500 to-blue-500">Education & Degrees</SectionHeader>
          <div className="space-y-3">
            {career.recommendedDegrees?.length > 0 && (
              <div className="space-y-2">
                {career.recommendedDegrees.map((d: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <GraduationCap className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            )}
            {career.recommendedSubjects?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {career.recommendedSubjects.map((s: string, i: number) => (
                  <span key={i} className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">{s}</span>
                ))}
              </div>
            )}
            {career.minStudyLevel && (
              <p className="text-xs text-muted-foreground">Minimum education: <span className="font-medium">{career.minStudyLevel}</span></p>
            )}
          </div>
        </div>
      )}

      {(career.interests?.length > 0 || career.personalityTraits?.length > 0) && (
        <div>
          <SectionHeader icon={Users} tint="from-blue-500 to-blue-500">Interests & Personality Fit</SectionHeader>
          <div className="space-y-4">
            {career.interests?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">You'll enjoy this career if you like</h3>
                <ul className="space-y-1.5">
                  {career.interests.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {career.personalityTraits?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Traits that fit well</h3>
                <div className="flex flex-wrap gap-2">
                  {career.personalityTraits.map((s: string, i: number) => (
                    <span key={i} className="rounded-full border bg-card px-3 py-1 text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(career.workEnvironment || career.workActivities?.length > 0) && (
        <div>
          <SectionHeader icon={Briefcase} tint="from-blue-500 to-blue-500">Work Environment</SectionHeader>
          <div className="space-y-2.5">
            {career.workEnvironment && (
              <p className="text-sm text-muted-foreground">{career.workEnvironment}</p>
            )}
            {career.workActivities?.length > 0 && (
              <div className="space-y-2">
                {career.workActivities.map((w: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {(career.relatedCareers?.length > 0 || career.alternativeCareers?.length > 0) && (
        <div>
          <SectionHeader icon={Target} tint="from-blue-500 to-blue-500">Related Careers</SectionHeader>
          <div className="flex flex-wrap gap-2">
            {[...(career.relatedCareers || []), ...(career.alternativeCareers || [])].map((name: string, i: number) => {
              const slug = typeof name === "string" ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "";
              return (
                <Link
                  key={i}
                  href={`/career-library/${slug}`}
                  className="rounded-full border bg-card px-3.5 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-accent"
                >
                  {name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {(career.automationRisk || career.remotePotential || career.indiaRelevance) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            ["Automation Risk", career.automationRisk],
            ["Remote Potential", career.remotePotential],
            ["India Relevance", career.indiaRelevance],
          ].map(([label, value]) =>
            value ? (
              <div key={label as string} className="rounded-xl border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold mt-0.5">{value as string}</p>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}