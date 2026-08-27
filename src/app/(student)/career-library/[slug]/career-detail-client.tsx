"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SaveButton from "@/components/student/save-button";
import { MatchPill, ConfidencePill } from "@/components/student/display";
import CareerTrendSection from "./career-trend-section";
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
  BookOpen,
  Award,
  Star,
} from "lucide-react";

interface EducationPathway {
  id: string;
  priority: string;
  notes: string;
  degree: {
    id: string;
    name: string;
    slug: string;
    educationLevel: string;
    duration: string | null;
    eligibility: string | null;
    category: string;
  } | null;
  specialization: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface SubjectLink {
  id: string;
  name: string;
  slug: string;
  category: string;
}

interface InstitutionItem {
  id: string;
  name: string;
  dataset: "indian" | "global";
  type: string | null;
  state: string | null;
  district: string | null;
  website: string | null;
  institutionType: string | null;
  universityName: string | null;
  country: string | null;
  qsRank: number | null;
}

interface UniMatch {
  institution: {
    id: string;
    name: string;
    dataset: "indian" | "global";
    state: string | null;
    country: string | null;
    website: string | null;
    institutionType: string | null;
  };
  matchScore: number;
  confidence: number;
  mappingStatus: "curated" | "institutionType-category" | "none";
  reasons: string[];
  limitations: string[];
  evidence: string[];
}

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
  items,
}: {
  icon: React.ReactNode;
  title: string;
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
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
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

function SectionHeader({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent shadow-sm">
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

  // Education pathways state
  const [educationPathways, setEducationPathways] = useState<{
    primary: EducationPathway[];
    alternative: EducationPathway[];
    optional: EducationPathway[];
    subjects: SubjectLink[];
  }>({
    primary: [],
    alternative: [],
    optional: [],
    subjects: [],
  });
  const [pathwaysLoading, setPathwaysLoading] = useState(true);

  const [institutions, setInstitutions] = useState<{
    list: InstitutionItem[];
    total: number;
    page: number;
    totalPages: number;
    verified: boolean;
    mappingBasis: string;
    source: string;
    disclaimer: string | null;
  }>({
    list: [],
    total: 0,
    page: 1,
    totalPages: 0,
    verified: false,
    mappingBasis: "",
    source: "",
    disclaimer: null,
  });
  const [institutionsLoading, setInstitutionsLoading] = useState(false);
  const [institutionsVisible, setInstitutionsVisible] = useState(false);

  const [uniMatches, setUniMatches] = useState<UniMatch[]>([]);
  const [uniLoading, setUniLoading] = useState(false);
  const [uniVisible, setUniVisible] = useState(false);
  const [uniError, setUniError] = useState<string | null>(null);
  const [uniExpanded, setUniExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPathways() {
      try {
        const res = await fetch(`/api/careers/${career.id}/education-pathways`);
        if (res.ok) {
          const data = await res.json();
          setEducationPathways({
            primary: data.educationPathways?.primary || [],
            alternative: data.educationPathways?.alternative || [],
            optional: data.educationPathways?.optional || [],
            subjects: data.recommendedSubjects || [],
          });
        }
      } catch (e) {
        console.error("Failed to fetch education pathways:", e);
      } finally {
        setPathwaysLoading(false);
      }
    }
    fetchPathways();
  }, [career.id]);

  async function loadInstitutions(pageToLoad: number) {
    setInstitutionsLoading(true);
    try {
      const res = await fetch(`/api/careers/${career.id}/institutions?page=${pageToLoad}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setInstitutions({
          list: data.institutions || [],
          total: data.total || 0,
          page: data.page || 1,
          totalPages: data.totalPages || 0,
          verified: !!data.verified,
          mappingBasis: data.mappingBasis || "",
          source: data.source || "",
          disclaimer: data.disclaimer || null,
        });
      }
    } catch (e) {
      console.error("Failed to fetch institutions:", e);
    } finally {
      setInstitutionsLoading(false);
    }
  }

  useEffect(() => {
    if (institutionsVisible) {
      loadInstitutions(1);
    }
  }, [institutionsVisible, career.id]);

  async function loadUniversityMatches() {
    setUniLoading(true);
    setUniError(null);
    try {
      const res = await fetch(`/api/student/university-matches?careerId=${career.id}&limit=10`);
      if (res.status === 401 || res.status === 403) {
        setUniError("Sign in as a student to see your personalized university matches.");
        setUniMatches([]);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUniMatches(data.matches || []);
      } else {
        setUniError("Unable to load university matches.");
      }
    } catch (e) {
      console.error("Failed to fetch university matches:", e);
      setUniError("Unable to load university matches.");
    } finally {
      setUniLoading(false);
    }
  }

  useEffect(() => {
    if (uniVisible) {
      loadUniversityMatches();
    }
  }, [uniVisible, career.id]);

  return (
    <div className="space-y-6 p-6 pt-20 max-w-4xl mx-auto">
      <Link href="/career-library">
        <Button variant="ghost" size="sm" className="mb-3 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Career Library
        </Button>
      </Link>

      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-accent p-8 md:p-10 text-white shadow-xl">
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
          <div className="mt-5">
            <SaveButton itemType="CAREER" itemId={career.id} />
          </div>
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
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent shadow-sm">
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
        <SectionHeader icon={GraduationCap}>Eligibility &amp; Requirements</SectionHeader>
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
        <SectionHeader icon={Users}>Who Should Pursue This?</SectionHeader>
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
        <SectionHeader icon={Clock}>Work Nature &amp; Reality</SectionHeader>
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
          <SectionHeader icon={Target}>Career Pathways</SectionHeader>
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
        <SectionHeader icon={Briefcase}>Career Options</SectionHeader>
        <div className="space-y-2.5">
          {career.conventionalOptions?.length > 0 && (
            <Accordion icon={<Briefcase className="h-4 w-4" />} title="Conventional Options" items={career.conventionalOptions} />
          )}
          {career.newAgeOptions?.length > 0 && (
            <Accordion icon={<Sparkles className="h-4 w-4" />} title="New-Age Options" items={career.newAgeOptions} />
          )}
          {career.aiRelatedOptions?.length > 0 && (
            <Accordion icon={<Cpu className="h-4 w-4" />} title="AI-Related Options" items={career.aiRelatedOptions} />
          )}
        </div>
      </div>

      {faqs.length > 0 && (
        <div>
          <SectionHeader icon={Sparkles}>FAQs</SectionHeader>
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
          <SectionHeader icon={Cpu}>Skills</SectionHeader>
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


      {(educationPathways.primary.length > 0 || educationPathways.alternative.length > 0 || educationPathways.optional.length > 0 || educationPathways.subjects.length > 0) && (
        <div>
          <SectionHeader icon={GraduationCap}>Education Pathways</SectionHeader>
          <div className="space-y-4">
            {pathwaysLoading && <div className="text-sm text-muted-foreground">Loading education pathways...</div>}
            {!pathwaysLoading && (
              <>
                {educationPathways.primary.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" /> Primary Pathways
                    </h3>
                    <div className="space-y-2">
                      {educationPathways.primary.map((p, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm p-3 rounded-lg border bg-card">
                          <GraduationCap className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{p.degree?.name}</p>
                            {p.specialization && (
                              <p className="text-xs text-muted-foreground">Specialization: {p.specialization.name}</p>
                            )}
                            {p.degree?.educationLevel && (
                              <p className="text-xs text-muted-foreground">{p.degree.educationLevel}</p>
                            )}
                            {p.degree?.duration && (
                              <p className="text-xs text-muted-foreground">Duration: {p.degree.duration}</p>
                            )}
                            {p.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">Primary</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {educationPathways.alternative.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Award className="h-4 w-4 text-blue-500" /> Alternative Pathways
                    </h3>
                    <div className="space-y-2">
                      {educationPathways.alternative.map((p, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm p-3 rounded-lg border bg-card">
                          <GraduationCap className="h-5 w-5 mt-0.5 text-blue-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{p.degree?.name}</p>
                            {p.specialization && (
                              <p className="text-xs text-muted-foreground">Specialization: {p.specialization.name}</p>
                            )}
                            {p.degree?.educationLevel && (
                              <p className="text-xs text-muted-foreground">{p.degree.educationLevel}</p>
                            )}
                            {p.degree?.duration && (
                              <p className="text-xs text-muted-foreground">Duration: {p.degree.duration}</p>
                            )}
                            {p.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">Alternative</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {educationPathways.optional.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-purple-500" /> Optional Pathways
                    </h3>
                    <div className="space-y-2">
                      {educationPathways.optional.map((p, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm p-3 rounded-lg border bg-card">
                          <GraduationCap className="h-5 w-5 mt-0.5 text-purple-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{p.degree?.name}</p>
                            {p.specialization && (
                              <p className="text-xs text-muted-foreground">Specialization: {p.specialization.name}</p>
                            )}
                            {p.degree?.educationLevel && (
                              <p className="text-xs text-muted-foreground">{p.degree.educationLevel}</p>
                            )}
                            {p.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {educationPathways.subjects.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-orange-500" /> Recommended Subjects
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {educationPathways.subjects.map((s, i) => (
                        <span key={i} className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">{s.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {(educationPathways.primary.length > 0 || educationPathways.alternative.length > 0 || educationPathways.optional.length > 0) && (
        <div>
          <SectionHeader icon={Landmark}>Institutions Offering Related Programs</SectionHeader>
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            {!institutionsVisible && (
              <Button variant="outline" size="sm" onClick={() => setInstitutionsVisible(true)}>
                View Related Institutions
              </Button>
            )}
            {institutionsVisible && institutionsLoading && (
              <div className="text-sm text-muted-foreground">Loading institutions...</div>
            )}
            {institutionsVisible && !institutionsLoading && institutions.list.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {institutions.disclaimer || "No verified institution mappings are available for this education pathway yet."}
              </p>
            )}
            {institutionsVisible && !institutionsLoading && institutions.list.length > 0 && (
              <>
                {!institutions.verified && institutions.disclaimer && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {institutions.disclaimer}
                  </p>
                )}
                <div className="space-y-2">
                  {institutions.list.map((inst) => (
                    <div key={inst.id} className="flex items-start gap-3 text-sm p-3 rounded-lg border bg-background">
                      <Landmark className="h-5 w-5 mt-0.5 text-accent shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{inst.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[inst.institutionType || inst.type, inst.state, inst.country].filter(Boolean).join(" · ")}
                        </p>
                        {inst.website && (
                          <a
                            href={inst.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline break-all"
                          >
                            {inst.website}
                          </a>
                        )}
                      </div>
                      {inst.dataset === "global" && (
                        <Badge variant="secondary" className="text-xs">Global</Badge>
                      )}
                      {inst.dataset === "indian" && (
                        <Badge variant="outline" className="text-xs">India</Badge>
                      )}
                    </div>
                  ))}
                </div>
                {institutions.totalPages > 1 && (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={institutions.page <= 1 || institutionsLoading}
                      onClick={() => loadInstitutions(institutions.page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Page {institutions.page} of {institutions.totalPages} ({institutions.total} institutions)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={institutions.page >= institutions.totalPages || institutionsLoading}
                      onClick={() => loadInstitutions(institutions.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div>
        <SectionHeader icon={TrendingUp}>Career Trend &amp; Outlook</SectionHeader>
        <CareerTrendSection careerId={career.id} />
      </div>

      {(educationPathways.primary.length > 0 || educationPathways.alternative.length > 0 || educationPathways.optional.length > 0) && (
        <div>
          <SectionHeader icon={GraduationCap}>Recommended Universities For You</SectionHeader>
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            {!uniVisible && (
              <Button variant="outline" size="sm" onClick={() => setUniVisible(true)}>
                View Your University Matches
              </Button>
            )}
            {uniVisible && uniLoading && (
              <div className="text-sm text-muted-foreground">Calculating your personalized matches...</div>
            )}
            {uniVisible && uniError && (
              <p className="text-sm text-muted-foreground">{uniError}</p>
            )}
            {uniVisible && !uniLoading && !uniError && uniMatches.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No institution candidates are connected to this career&apos;s education pathways yet.
              </p>
            )}
            {uniVisible && !uniLoading && uniMatches.length > 0 && (
              <div className="space-y-3">
                {uniMatches.map((m) => (
                  <div key={m.institution.id} className="rounded-lg border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{m.institution.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[m.institution.institutionType, m.institution.state, m.institution.country].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <MatchPill score={m.matchScore} />
                        <ConfidencePill confidence={m.confidence} />
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      {m.mappingStatus === "curated" && (
                        <Badge variant="secondary" className="text-xs">Verified mapping</Badge>
                      )}
                      {m.mappingStatus === "institutionType-category" && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Category-based</Badge>
                      )}
                      {m.mappingStatus === "none" && (
                        <Badge variant="outline" className="text-xs">Unverified</Badge>
                      )}
                      {m.institution.website && (
                        <a href={m.institution.website} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline break-all">
                          Visit
                        </a>
                      )}
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setUniExpanded(uniExpanded === m.institution.id ? null : m.institution.id)}>
                        {uniExpanded === m.institution.id ? "Hide" : "Why?"}
                      </Button>
                    </div>
                    {uniExpanded === m.institution.id && (
                      <div className="mt-3 space-y-2 text-xs">
                        {m.reasons.length > 0 && (
                          <div>
                            <p className="font-medium mb-1">Why recommended</p>
                            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                              {m.reasons.slice(0, 4).map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        )}
                        {m.limitations.length > 0 && (
                          <div>
                            <p className="font-medium mb-1 text-amber-700">Limitations</p>
                            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                              {m.limitations.slice(0, 4).map((l, i) => <li key={i}>{l}</li>)}
                            </ul>
                          </div>
                        )}
                        {m.evidence.length > 0 && (
                          <div>
                            <p className="font-medium mb-1">Evidence</p>
                            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                              {m.evidence.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {(career.interests?.length > 0 || career.personalityTraits?.length > 0) && (
        <div>
          <SectionHeader icon={Users}>Interests & Personality Fit</SectionHeader>
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
          <SectionHeader icon={Briefcase}>Work Environment</SectionHeader>
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
          <SectionHeader icon={Target}>Related Careers</SectionHeader>
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