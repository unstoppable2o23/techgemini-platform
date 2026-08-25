"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Search, GraduationCap, Download, Building2, School, Landmark } from "lucide-react";

type Institution = {
  id: string;
  aisheCode: string;
  name: string;
  type: string;
  state: string;
  district: string;
  website?: string;
  yearOfEstablishment?: string;
  location?: string;
  institutionType?: string;
  management?: string;
  universityName?: string;
};

type Stats = {
  total: number;
  universities: number;
  colleges: number;
  standalone: number;
  rnd: number;
  states: string[];
};

const TYPES = ["All", "University", "College", "Standalone", "R&D Institute"];
const PAGE_SIZES = [20, 50, 100];
const EXPORT_ROLES = ["SUPER_ADMIN", "UNIVERSITY_ADMIN"];

export default function IndianCollegesClient({ role }: { role?: string }) {
  const canExport = EXPORT_ROLES.includes(role || "");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [stateFilter, setStateFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/institutions/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {});
  }, []);

  const fetchInstitutions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (stateFilter !== "All") params.set("state", stateFilter);
    if (typeFilter !== "All") params.set("type", typeFilter);
    const res = await fetch(`/api/institutions?${params}`);
    const data = await res.json();
    setInstitutions(data.institutions || []);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [page, pageSize, debouncedSearch, stateFilter, typeFilter]);

  useEffect(() => { fetchInstitutions(); }, [fetchInstitutions]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stateFilter, typeFilter, pageSize]);

  function resetPage() {
    setPage(1);
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format: "csv" });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (stateFilter !== "All") params.set("state", stateFilter);
      if (typeFilter !== "All") params.set("type", typeFilter);
      const res = await fetch(`/api/institutions?${params}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "indian-institutions.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6 p-6 pt-20 max-w-6xl mx-auto">
      <PageHeader
        icon={GraduationCap}
        title="Indian Colleges & Universities"
        description={`${(stats?.total ?? totalPages * pageSize).toLocaleString()} institutions across India — searchable AISHE + Wikidata directory`}
        actions={
          canExport && (
            <Button variant="gradient" onClick={exportCsv} disabled={exporting} className="bg-white/15">
              <Download className="h-4 w-4 mr-1" />
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Institutions" value={stats?.total?.toLocaleString() ?? "—"} icon={Building2} />
        <StatCard title="Universities" value={stats?.universities?.toLocaleString() ?? "—"} icon={Landmark} />
        <StatCard title="Colleges" value={stats?.colleges?.toLocaleString() ?? "—"} icon={School} />
        <StatCard title="Standalone" value={stats?.standalone?.toLocaleString() ?? "—"} icon={GraduationCap} />
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, AISHE code or district..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            className="pl-9"
          />
        </div>
        <select
          value={stateFilter}
          onChange={(e) => { setStateFilter(e.target.value); resetPage(); }}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="All">All States</option>
          {(stats?.states || []).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); resetPage(); }}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          {TYPES.map((t) => <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">AISHE Code</th>
                  <th className="px-4 py-3 font-medium">Institution Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">State</th>
                  <th className="px-4 py-3 font-medium">District</th>
                  <th className="px-4 py-3 font-medium">Affiliation</th>
                  <th className="px-4 py-3 font-medium">Est.</th>
                </tr>
              </thead>
              <tbody>
                {institutions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="h-32 text-center text-muted-foreground">No institutions found.</td>
                  </tr>
                ) : institutions.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-accent/5">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{r.aisheCode}</td>
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.type}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.state}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.district || "—"}</td>
                    <td className="px-4 py-3">{r.universityName || r.institutionType || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.yearOfEstablishment || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); resetPage(); }}
            className="border rounded-md px-2 py-1 text-sm bg-background"
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}