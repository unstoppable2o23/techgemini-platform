"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Search, GraduationCap, Target, TrendingUp, Sparkles, Loader2 } from "lucide-react";

function deriveSelectivity(qsRank: number | null): number {
  if (!qsRank) return 0.50;
  return Math.max(0.03, Math.min(0.85, 0.8 * Math.exp(-qsRank / 200) + 0.05));
}

function calculateOdds(gpa: number, sat: number, ecs: number, selectivity: number): number {
  const gpaScore = Math.min(gpa / 4.0, 1) * 40;
  const satScore = Math.min(sat / 1600, 1) * 30;
  const ecScore = Math.min(ecs / 10, 1) * 15;
  const base = gpaScore + satScore + ecScore;
  const adjusted = base * (1 - selectivity * 1.5);
  return Math.max(0, Math.min(100, Math.round(adjusted)));
}

function getCategory(odds: number): { label: string; color: string } {
  if (odds >= 80) return { label: "Stronger Fit", color: "text-green-600" };
  if (odds >= 50) return { label: "Moderate Fit", color: "text-amber-600" };
  if (odds >= 25) return { label: "Reach", color: "text-orange-600" };
  return { label: "High Reach", color: "text-red-600" };
}

export default function OddsCalculatorPage() {
  const [gpa, setGpa] = useState("3.5");
  const [sat, setSat] = useState("1200");
  const [ecs, setEcs] = useState("5");
  const [results, setResults] = useState<any[] | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const [search, setSearch] = useState("");

  async function calculate() {
    const g = parseFloat(gpa) || 0;
    const s = parseInt(sat) || 0;
    const e = parseInt(ecs) || 0;

    setCalculating(true);
    setResults(null);

    const res = await fetch("/api/universities?sortBy=qsRank&sortOrder=asc&limit=500");
    const data = await res.json();
    const universities = data.universities || [];

    const calculated = universities
      .filter((u: any) => u.qsRank)
      .map((u: any) => ({
        id: u.id,
        name: u.name,
        country: u.country,
        qsRank: u.qsRank,
        odds: calculateOdds(g, s, e, deriveSelectivity(u.qsRank)),
        category: getCategory(calculateOdds(g, s, e, deriveSelectivity(u.qsRank))),
      }))
      .sort((a: any, b: any) => b.odds - a.odds);

    setResults(calculated);
    setResultCount(calculated.length);
    setCalculating(false);
  }

  const filtered = useMemo(() => {
    if (!results) return [];
    if (!search.trim()) return results;
    const q = search.toLowerCase();
    return results.filter((r) => r.name.toLowerCase().includes(q) || (r.country || "").toLowerCase().includes(q));
  }, [results, search]);

  return (
    <div className="space-y-6 p-6 pt-20 max-w-4xl mx-auto">
      <PageHeader
        icon={Target}
        title="Chance Estimator"
        description="A quick estimate based on a few scores — for orientation, not a guarantee of admission"
        eyebrow="Student Tools"
      />

      <Card>
        <CardHeader><CardTitle>Your Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">GPA (0-4.0)</label>
              <Input type="number" min="0" max="4" step="0.1" value={gpa} onChange={(e) => setGpa(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">SAT Score (400-1600)</label>
              <Input type="number" min="400" max="1600" step="10" value={sat} onChange={(e) => setSat(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Extracurriculars (0-10)</label>
              <Input type="number" min="0" max="10" value={ecs} onChange={(e) => setEcs(e.target.value)} />
            </div>
          </div>
          <Button onClick={calculate} disabled={calculating} className="w-full">
            {calculating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {calculating ? "Crunching the numbers..." : "Estimate My Chances"}
          </Button>
          <p className="text-xs text-muted-foreground">
            This is a simplified, non-scientific estimate based on GPA, SAT and
            extracurriculars. It is not a prediction and does not reflect any university&apos;s
            official admissions criteria.
          </p>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Your Estimated Chances
              <span className="text-sm font-normal text-muted-foreground">({resultCount} universities)</span>
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by university name or country..."
                className="pl-9" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No universities match your search.</p>
              ) : filtered.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2.5 border-b last:border-0 hover:bg-muted/30 px-2 rounded-sm">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="truncate">
                      <span className="text-sm font-medium">{r.name}</span>
                      {r.qsRank && <span className="text-xs text-muted-foreground ml-1.5">#{r.qsRank}</span>}
                      {r.country && <span className="text-xs text-muted-foreground ml-2">{r.country}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="w-28 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${r.odds >= 80 ? "bg-green-500" : r.odds >= 50 ? "bg-amber-500" : r.odds >= 25 ? "bg-orange-500" : "bg-red-500"}`}
                        style={{ width: `${r.odds}%` }} />
                    </div>
                    <span className={`text-sm font-bold w-10 text-right ${r.category.color}`}>{r.odds}%</span>
                    <span className={`text-xs w-22 text-right ${r.category.color}`}>{r.category.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
