"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Sparkles,
  TrendingUp,
  Rocket,
  ArrowRight,
} from "lucide-react";

export type TrendType = "trending" | "emerging" | "fast-growing" | "future";

export const TREND_TABS: {
  key: TrendType;
  label: string;
  icon: typeof Flame;
}[] = [
  { key: "trending", label: "Trending", icon: Flame },
  { key: "emerging", label: "Emerging", icon: Sparkles },
  { key: "fast-growing", label: "Fast-growing", icon: TrendingUp },
  { key: "future", label: "Future-focused", icon: Rocket },
];

export function TrendBadges({
  classifications,
  size = "sm",
}: {
  classifications: string[];
  size?: "sm" | "xs";
}) {
  const styles: Record<string, string> = {
    TRENDING: "bg-orange-100 text-orange-700 border-orange-200",
    EMERGING: "bg-purple-100 text-purple-700 border-purple-200",
    FAST_GROWING: "bg-green-100 text-green-700 border-green-200",
    FUTURE: "bg-blue-100 text-blue-700 border-blue-200",
  };
  const labels: Record<string, string> = {
    TRENDING: "Trending",
    EMERGING: "Emerging",
    FAST_GROWING: "Fast-growing",
    FUTURE: "Future-focused",
  };
  if (classifications.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {classifications.map((c) => (
        <Badge
          key={c}
          variant="outline"
          className={`${styles[c] ?? ""} ${size === "xs" ? "text-[10px] px-1.5 py-0" : ""}`}
        >
          {labels[c] ?? c}
        </Badge>
      ))}
    </div>
  );
}

type TrendItem = {
  career: {
    id: string;
    name: string;
    slug: string;
    title: string;
    category: string | null;
    shortDescription: string | null;
    demandLevel: string;
    jobGrowth: string;
    isEmerging: boolean;
  };
  trendScore: number;
  demandIndicator: string | null;
  growthIndicator: string | null;
  trending: boolean;
  emerging: boolean;
  fastGrowing: boolean;
  futureFacing: boolean;
  source: string;
};

function buildClassifications(item: TrendItem): string[] {
  const list: string[] = [];
  if (item.emerging) list.push("EMERGING");
  if (item.fastGrowing) list.push("FAST_GROWING");
  if (item.futureFacing) list.push("FUTURE");
  if (item.trending) list.push("TRENDING");
  return list;
}

export default function TrendingCareersSection({
  initialType = "trending",
  limit = 8,
}: {
  initialType?: TrendType;
  limit?: number;
}) {
  const [active, setActive] = useState<TrendType>(initialType);
  const [items, setItems] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (type: TrendType) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/careers/trends?type=${type}&limit=${limit}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setItems(data.trends ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    load(active);
  }, [active, load]);

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-5 w-5 text-orange-500" />
        <h2 className="text-xl font-semibold text-gray-800">
          Discover Careers by Momentum
        </h2>
      </div>
      <p className="text-sm text-gray-500 mb-4 max-w-2xl">
        Explore careers grouped by how they are trending. Signals are derived
        from existing career metadata and are directional, not guarantees.
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {TREND_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium border transition ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading careers…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-400">
          No careers found for this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const classifications = buildClassifications(item);
            return (
              <Link
                key={item.career.id}
                href={`/career-library/${item.career.slug}`}
                className="group block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-800 group-hover:text-blue-700">
                    {item.career.title || item.career.name}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {item.career.category}
                </p>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {item.career.shortDescription}
                </p>
                <TrendBadges classifications={classifications} />
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Demand: {item.demandIndicator ?? (item.career.demandLevel || "—")}
                  </span>
                  <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                    Explore <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
