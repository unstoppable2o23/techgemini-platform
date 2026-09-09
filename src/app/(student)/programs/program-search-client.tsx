"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SaveButton from "@/components/student/save-button";
import { PageHeader } from "@/components/ui/page-header";
import { GraduationCap, Search, GitCompare, X, Check, ShieldCheck, Info } from "lucide-react";

type SearchItem = {
  programId: string;
  programName: string;
  slug: string;
  level: string;
  category: string;
  qualification: { name: string } | null;
  discipline: { name: string; id: string };
  relationshipType: string;
  educationStageFit: string[];
  nextStep: string;
  admission: {
    entranceExam: string | null;
    admissionType: string | null;
    source: { label: string; lastReviewed: string } | null;
    note: string;
  } | null;
  careers: { id: string; name: string }[];
  saved: boolean;
};

type Facets = {
  qualification: { value: string; count: number }[];
  disciplines: { value: string; count: number }[];
  countries: { value: string; count: number }[];
  states: { value: string; count: number }[];
  institutionTypes: { value: string; count: number }[];
};

type Offer = {
  programId: string;
  programName: string;
  level: string | null;
  qualification: { name: string } | null;
  institution: { id: string; name: string; kind: string; location: string | null; institutionType: string | null };
  provenance: { verificationStatus: string; source: string };
  freshness: string;
};

function ProgramExplorer() {
  const router = useRouter();

  const [initialParams] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams()
  );

  const [q, setQ] = useState(initialParams.get("q") ?? "");
  const [qualification, setQualification] = useState<string | null>(initialParams.get("qualification"));
  const [discipline, setDiscipline] = useState<string | null>(initialParams.get("discipline"));
  const [country, setCountry] = useState<string | null>(initialParams.get("country"));
  const [state, setState] = useState<string | null>(initialParams.get("state"));
  const [institutionType, setInstitutionType] = useState<string | null>(initialParams.get("institutionType"));

  const [items, setItems] = useState<SearchItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offerTotal, setOfferTotal] = useState(0);
  const [facets, setFacets] = useState<Facets>({ qualification: [], disciplines: [], countries: [], states: [], institutionTypes: [] });
  const [loading, setLoading] = useState(true);
  const [clarifier, setClarifier] = useState("");

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<{ programs: { id: string; name: string }[]; rows: { key: string; label: string; values: string[] }[] } | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const [goalMsg, setGoalMsg] = useState<string | null>(null);

  const focusedSlug = initialParams.get("p");

  const updateUrl = useCallback((next: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const all = { q, qualification, discipline, country, state, institutionType, ...next };
    for (const [k, v] of Object.entries(all)) if (v) params.set(k, v);
    const qs = params.toString();
    router.push(qs ? `/student/programs?${qs}` : "/student/programs");
  }, [q, qualification, discipline, country, state, institutionType, router]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (qualification) params.set("qualification", qualification);
    if (discipline) params.set("discipline", discipline);
    if (country) params.set("country", country);
    if (state) params.set("state", state);
    if (institutionType) params.set("institutionType", institutionType);
    params.set("limit", "25");

    fetch(`/api/programs/search?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setItems(data.items ?? []);
        setOffers(data.institutionOffers ?? []);
        setOfferTotal(data.institutionOfferTotal ?? 0);
        setFacets(data.facets ?? { qualification: [], disciplines: [], countries: [], states: [], institutionTypes: [] });
        setClarifier(data.clarifier ?? "");
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [q, qualification, discipline, country, state, institutionType]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]);
    setComparison(null);
  }, []);

  async function runCompare() {
    if (compareIds.length < 2) return;
    setCompareLoading(true);
    setCompareError(null);
    try {
      const res = await fetch("/api/student/program-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programIds: compareIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCompareError(data.error || "Failed to compare");
      } else {
        setComparison(data);
      }
    } catch {
      setCompareError("Failed to compare");
    } finally {
      setCompareLoading(false);
    }
  }

  async function setAsGoal(programId: string, programName: string) {
    const res = await fetch("/api/student/roadmap/program", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId, programName }),
    });
    setGoalMsg(res.ok ? `Set on roadmap: ${programName}` : res.status === 401 || res.status === 403 ? "Sign in as a student to set a goal program." : "Could not set goal program.");
    window.setTimeout(() => setGoalMsg(null), 4000);
  }

  const facetBtn = (active: boolean) =>
    active
      ? "rounded-full bg-accent text-white px-3 py-1 text-xs"
      : "rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground hover:border-accent hover:text-accent";

  return (
    <div className="space-y-5 p-6 pt-20 max-w-5xl mx-auto">
      <PageHeader
        icon={GraduationCap}
        title="Program Explorer"
        description="Search the curated program catalog by qualification and discipline. Institution offers are shown separately and only when verified — no invented fees, cutoffs, or deadlines."
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search programs — e.g. Computer Science, MBBS, Mechanical, Data Science"
              className="w-full rounded-xl border bg-card pl-9 pr-4 py-2.5 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => { setQ(""); setQualification(null); setDiscipline(null); setCountry(null); setState(null); setInstitutionType(null); }}>
            Reset
          </Button>
        </div>

        {facets.qualification.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Qualification:</span>
            <button className={facetBtn(!qualification)} onClick={() => { setQualification(null); updateUrl({ qualification: null }); }}>All</button>
            {facets.qualification.map((f) => (
              <button key={f.value} className={facetBtn(qualification === f.value)} onClick={() => { setQualification(qualification === f.value ? null : f.value); updateUrl({ qualification: qualification === f.value ? null : f.value }); }}>
                {f.value} ({f.count})
              </button>
            ))}
          </div>
        )}
        {facets.disciplines.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Discipline:</span>
            {facets.disciplines.slice(0, 12).map((f) => (
              <button key={f.value} className={facetBtn(discipline === f.value)} onClick={() => { setDiscipline(discipline === f.value ? null : f.value); updateUrl({ discipline: discipline === f.value ? null : f.value }); }}>
                {f.value} ({f.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {compareIds.length > 0 && (
        <Card className="border-accent/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium flex items-center gap-1"><GitCompare className="h-4 w-4 text-accent" /> Compare ({compareIds.length}/3):</span>
              {compareIds.map((id) => {
                const p = items.find((i) => i.programId === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-xs">
                    {p?.programName ?? id}
                    <button onClick={() => toggleCompare(id)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                  </span>
                );
              })}
              <div className="flex-1" />
              <Button size="sm" disabled={compareIds.length < 2 || compareLoading} onClick={runCompare}>
                {compareLoading ? "Comparing…" : "Compare"}
              </Button>
            </div>
            {compareError && <p className="text-xs text-destructive">{compareError}</p>}
            {comparison && (
              <div className="overflow-auto border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground w-40">Field</th>
                      {comparison.programs.map((p) => (
                        <th key={p.id} className="text-left p-2 text-xs">{p.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.rows.map((row) => (
                      <tr key={row.key} className="border-b last:border-0">
                        <td className="p-2 text-xs font-medium">{row.label}</td>
                        {row.values.map((v, i) => (
                          <td key={i} className={`p-2 text-xs ${v === "Not available" ? "text-muted-foreground" : ""}`}>{v.slice(0, 90)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {goalMsg && <p className="text-xs text-accent">{goalMsg}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {loading && <div className="col-span-full text-center text-muted-foreground text-sm py-8">Searching the curated program catalog…</div>}
        {!loading && items.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground text-sm py-8">
            No catalog programs match. Try fewer filters or search the Program Explorer name directly.
          </div>
        )}
        {items.map((p) => (
          <div
            key={p.programId}
            id={`program-${focusedSlug === p.slug ? "focused" : p.programId}`}
            className={`rounded-2xl border bg-card p-4 flex flex-col gap-3 transition-shadow hover:shadow-md ${focusedSlug === p.slug ? "ring-2 ring-accent" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm">{p.programName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.qualification?.name ?? p.level} · {p.discipline?.name ?? p.category}
                  {p.careers.length > 0 ? ` · ${p.careers.length} career path${p.careers.length === 1 ? "" : "s"}` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <SaveButton itemType="PROGRAM" itemId={p.programId} initialSaved={p.saved} size="sm" />
                <button
                  onClick={() => toggleCompare(p.programId)}
                  className={`text-[11px] flex items-center gap-1 ${compareIds.includes(p.programId) ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {compareIds.includes(p.programId) ? <><Check className="h-3 w-3" /> In compare</> : "Compare"}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              {p.educationStageFit.length > 0 && (
                <p className="text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 inline mr-1 text-accent" /><span className="font-medium text-foreground">Education stage:</span> {p.educationStageFit.join(" · ")}</p>
              )}
              <p className="text-muted-foreground"><span className="font-medium text-foreground">Next step:</span> {p.nextStep}</p>
              {p.admission && (
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Admission:</span>{" "}
                  {[p.admission.entranceExam, p.admission.admissionType].filter(Boolean).join(" · ") || "Verify with official sources"}
                  {p.admission.source && <span className="text-[11px]"> — {p.admission.source.label} · reviewed {p.admission.source.lastReviewed}</span>}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 mt-auto pt-1">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setAsGoal(p.programId, p.programName)}>
                Set as my program
              </Button>
              <div className="flex-1" />
              <Badge variant="secondary" className="text-[11px]">{p.relationshipType}</Badge>
            </div>
          </div>
        ))}
      </div>

      {(offers.length > 0 || offerTotal > 0) && (
        <div>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-accent" /> Institution offers {offerTotal > offers.length ? `· ${offerTotal} total` : ""}
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Source-verified institution-offered programs from the separate institution catalog — shown only when data exists.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {offers.map((o) => (
              <div key={o.programId} className="rounded-xl border bg-card p-3 text-sm">
                <p className="font-medium">{o.programName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {o.institution.name} · {o.institution.location || "—"} {o.institution.institutionType ? ` · ${o.institution.institutionType}` : ""}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-[11px]">{o.qualification?.name ?? o.level ?? "Program"}</Badge>
                  {o.provenance.verificationStatus === "VERIFIED" ? (
                    <Badge className="bg-green-600 text-[11px]">Verified</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px]">Unverified</Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground">{o.freshness}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {clarifier && <p className="text-[11px] text-muted-foreground text-center italic">{clarifier}</p>}
    </div>
  );
}

export default function ProgramSearchClient() {
  return (
    <Suspense fallback={<div className="p-6 pt-20 max-w-5xl mx-auto text-center text-muted-foreground text-sm">Loading program explorer…</div>}>
      <ProgramExplorer />
    </Suspense>
  );
}