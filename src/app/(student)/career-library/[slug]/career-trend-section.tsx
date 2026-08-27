"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Sparkles,
  TrendingUp,
  Rocket,
  Info,
} from "lucide-react";
import { TrendBadges } from "../trending-careers-section";

type TrendDetail = {
  career: { id: string; name: string; title: string } | null;
  trends: {
    id: string;
    period: string;
    region: string;
    trendScore: number;
    demandIndicator: string | null;
    growthIndicator: string | null;
    trending: boolean;
    emerging: boolean;
    fastGrowing: boolean;
    futureFacing: boolean;
    source: string;
    methodology: string | null;
  }[];
  classifications: string[];
  sourceType: string | null;
  methodology: string | null;
  limitations: string[];
};

function buildClassifications(t: {
  trending: boolean;
  emerging: boolean;
  fastGrowing: boolean;
  futureFacing: boolean;
}): string[] {
  const list: string[] = [];
  if (t.emerging) list.push("EMERGING");
  if (t.fastGrowing) list.push("FAST_GROWING");
  if (t.futureFacing) list.push("FUTURE");
  if (t.trending) list.push("TRENDING");
  return list;
}

export default function CareerTrendSection({
  careerId,
}: {
  careerId: string;
}) {
  const [data, setData] = useState<TrendDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/careers/${careerId}/trends`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [careerId]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        Loading career trend outlook…
      </div>
    );
  }

  if (!data || !data.career || data.trends.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        Trend outlook is not available for this career yet.
      </div>
    );
  }

  const top = data.trends[0];
  const classifications = buildClassifications(top);

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <TrendBadges classifications={classifications} />
        <span className="text-xs text-muted-foreground">
          Period {top.period} · {top.region}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border bg-background p-3">
          <p className="text-xs text-muted-foreground">Demand</p>
          <p className="font-medium">
            {top.demandIndicator ?? "Unknown"}
          </p>
        </div>
        <div className="rounded-lg border bg-background p-3">
          <p className="text-xs text-muted-foreground">Growth</p>
          <p className="font-medium">{top.growthIndicator ?? "—"}</p>
        </div>
        <div className="rounded-lg border bg-background p-3">
          <p className="text-xs text-muted-foreground">Momentum score</p>
          <p className="font-medium">{top.trendScore}/100</p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">How to read this</p>
          <p>
            This is a system-derived signal from existing career metadata, not
            verified live market data. It is directional and does not guarantee
            employment or salary outcomes.
          </p>
        </div>
      </div>
    </div>
  );
}
