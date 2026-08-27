"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchPill, ConfidencePill, EmptyState } from "@/components/student/display";
import {
  Search,
  Briefcase,
  ArrowRight,
  Compass,
  Sparkles,
  Flame,
  TrendingUp,
  GraduationCap,
} from "lucide-react";
import TrendingCareersSection from "./trending-careers-section";

type CareerItem = {
  id: string;
  name: string;
  slug: string;
  title: string;
  category: string | null;
  subcategory: string | null;
  shortDescription: string | null;
  demandLevel: string | null;
  jobGrowth: string | null;
  salaryEntry: number | null;
  salarySenior: number | null;
  topIndustries: string[];
  isEmerging: boolean;
  minStudyLevel: string | null;
};

type MatchItem = {
  career: CareerItem;
  matchScore?: number | null;
  matchLevel?: string | null;
  confidence?: number | null;
};

const DEMAND: Record<string, { label: string; cls: string }> = {
  HIGH: { label: "High demand", cls: "bg-green-100 text-green-700 border-green-200" },
  MEDIUM: { label: "Steady demand", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  LOW: { label: "Selective", cls: "bg-gray-100 text-gray-600 border-gray-200" },
};

function formatSalary(c: CareerItem): string {
  const lpa = (n?: number | null) => (n ? `₹${(n / 100000).toFixed(0)}L` : null);
  const lo = lpa(c.salaryEntry);
  const hi = lpa(c.salarySenior);
  if (lo && hi) return `${lo}–${hi}`;
  return lo || hi || "Salary not listed";
}

function CareerCard({ career }: { career: CareerItem }) {
  const demand = career.demandLevel ? DEMAND[career.demandLevel] : null;
  return (
    <Link
      href={`/career-library/${career.slug}`}
      className="group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-accent/40 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Briefcase className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
      <h3 className="font-semibold text-gray-900 group-hover:text-accent">
        {career.title || career.name}
      </h3>
      {career.category && <p className="text-xs text-gray-500">{career.category}</p>}
      {career.shortDescription && (
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{career.shortDescription}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {career.isEmerging && (
          <Badge className="border-purple-200 bg-purple-100 text-purple-700">
            Emerging
          </Badge>
        )}
        {demand && (
          <Badge className={`border ${demand.cls}`}>{demand.label}</Badge>
        )}
        <span className="text-xs text-gray-500">{formatSalary(career)}</span>
      </div>
    </Link>
  );
}

function CategoryChips({
  categories,
  active,
  onChange,
}: {
  categories: string[];
  active: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const isActive = c === active;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              isActive
                ? "border-accent bg-accent text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

function ForYouTab() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [hasAssessment, setHasAssessment] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/student/career-matches?limit=24", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!active) return;
        setMatches(data.matches ?? []);
        setHasAssessment(data.hasAssessmentData ?? false);
      } catch {
        if (active) setMatches([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!hasAssessment) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Tell us about yourself first"
        description="Complete your assessment and onboarding so we can suggest careers that fit your interests and subjects. You can still browse the full library below."
        action={<Link href="/dashboard" className="text-sm font-medium text-accent hover:underline">Go to my dashboard</Link>}
      />
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="No matches yet"
        description="We could not generate personalised matches yet. Explore the full library to get started."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((m) => {
        const career = m.career;
        return (
          <Link
            key={career.id}
            href={`/career-library/${career.slug}`}
            className="group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-accent/40 hover:shadow-md"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Briefcase className="h-5 w-5" />
              </div>
              <MatchPill score={m.matchScore ?? null} />
            </div>
            <h3 className="font-semibold text-gray-900 group-hover:text-accent">
              {career.title || career.name}
            </h3>
            {career.category && <p className="text-xs text-gray-500">{career.category}</p>}
            {career.shortDescription && (
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">{career.shortDescription}</p>
            )}
            <div className="mt-3 flex items-center justify-between">
              <ConfidencePill confidence={m.confidence ?? null} />
              <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">
                Explore <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function CareerLibraryClient() {
  const { data: session } = useSession();
  const isStudent = session?.user?.role === "STUDENT";

  const [careers, setCareers] = useState<CareerItem[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [tab, setTab] = useState<"foryou" | "trending" | "all">("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/careers?sortBy=name", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        setCareers(data.careers ?? []);
        setCategories(["All", ...(data.categories ?? []).filter(Boolean)]);
      } catch {
        if (active) setCareers([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return careers.filter((c) => {
      const matchCat = activeCategory === "All" || c.category === activeCategory;
      const matchSearch =
        !q ||
        (c.title || c.name).toLowerCase().includes(q) ||
        (c.shortDescription?.toLowerCase().includes(q) ?? false);
      return matchCat && matchSearch;
    });
  }, [careers, activeCategory, search]);

  const showLibrary = !isStudent || tab === "all";

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-accent/20 bg-accent/[0.06] p-6 sm:p-8">
        <div className="mb-2 flex items-center gap-2">
          <Compass className="h-5 w-5 text-accent" />
          <span className="text-sm font-medium text-accent">Career Library</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Explore careers that fit you
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Browse real careers, see how each connects to your interests and studies,
          and discover paths that are growing. Match signals are directional, not guarantees.
        </p>
        <div className="relative mt-4 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search careers, skills or subjects"
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </section>

      {isStudent && (
        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === "foryou"} onClick={() => setTab("foryou")} icon={Sparkles}>
            For You
          </TabButton>
          <TabButton active={tab === "trending"} onClick={() => setTab("trending")} icon={Flame}>
            Trending
          </TabButton>
          <TabButton active={tab === "all"} onClick={() => setTab("all")} icon={Compass}>
            All Careers
          </TabButton>
        </div>
      )}

      {showLibrary && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {isStudent ? "Browse all careers" : "Career Library"}
            </h2>
            <span className="text-sm text-gray-500">
              {loading ? "Loading…" : `${filtered.length} careers`}
            </span>
          </div>

          <CategoryChips
            categories={categories}
            active={activeCategory}
            onChange={setActiveCategory}
          />

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No careers found"
              description="Try a different category or search term."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((career) => (
                <CareerCard key={career.id} career={career} />
              ))}
            </div>
          )}
        </section>
      )}

      {isStudent && tab === "trending" && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-gray-800">Careers by momentum</h2>
          </div>
          <TrendingCareersSection />
        </section>
      )}

      {isStudent && tab === "foryou" && <ForYouTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Flame;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "border-accent bg-accent text-white"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
