"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Search, Globe, MapPin, Trophy, GraduationCap, Users, BookOpen } from "lucide-react";

export default function CollegeFinderPage() {
  const [universities, setUniversities] = useState<any[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [countryFilter, setCountryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("qsRank");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function fetchUniversities() {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      sortBy,
      sortOrder: sortBy === "name" ? "asc" : "asc",
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (countryFilter) params.set("country", countryFilter);
    const res = await fetch(`/api/universities?${params}`);
    const data = await res.json();
    setUniversities(data.universities || []);
    setTotal(data.total);
    setTotalPages(data.totalPages || 1);
    if (data.countries) setCountries(data.countries);
    setLoading(false);
  }

  useEffect(() => { fetchUniversities() }, [page, countryFilter, sortBy, debouncedSearch]);
  useEffect(() => { setPage(1); }, [debouncedSearch, countryFilter, sortBy]);

  return (
    <div className="space-y-6 p-6 pt-20 max-w-6xl mx-auto">
      <PageHeader
        icon={GraduationCap}
        title="College Finder"
        description={`Browse ${total.toLocaleString()} universities from around the world — QS rankings shown where available`}
      />

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search universities..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select
          value={countryFilter}
          onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">All Countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="qsRank">Sort by Rank</option>
          <option value="name">Sort by Name</option>
          <option value="overallScore">Sort by Score</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {universities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">No universities found matching your criteria.</CardContent>
            </Card>
          ) : universities.map((u) => (
            <Card key={u.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {u.qsRank && (
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-accent/10 text-accent font-bold text-sm">
                          {u.qsRank}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{u.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {u.country}
                          {u.region && <span className="text-xs">({u.region})</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  {u.overallScore && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-accent">{u.overallScore.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">QS Overall Score</div>
                    </div>
                  )}
                </div>

                {expanded === u.id && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                    {u.academicRepScore && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="h-3 w-3" /> Academic</p>
                        <p className="text-sm font-medium">{u.academicRepScore.toFixed(1)}</p>
                      </div>
                    )}
                    {u.employerRepScore && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Employer</p>
                        <p className="text-sm font-medium">{u.employerRepScore.toFixed(1)}</p>
                      </div>
                    )}
                    {u.facultyStudentScore && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Faculty/Student</p>
                        <p className="text-sm font-medium">{u.facultyStudentScore.toFixed(1)}</p>
                      </div>
                    )}
                    {u.citationsScore && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="h-3 w-3" /> Citations</p>
                        <p className="text-sm font-medium">{u.citationsScore.toFixed(1)}</p>
                      </div>
                    )}
                    {u.intlFacultyScore && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Intl Faculty</p>
                        <p className="text-sm font-medium">{u.intlFacultyScore.toFixed(1)}</p>
                      </div>
                    )}
                    {u.intlStudentScore && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Intl Students</p>
                        <p className="text-sm font-medium">{u.intlStudentScore.toFixed(1)}</p>
                      </div>
                    )}
                    {u.employmentScore && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Trophy className="h-3 w-3" /> Employment</p>
                        <p className="text-sm font-medium">{u.employmentScore.toFixed(1)}</p>
                      </div>
                    )}
                    {u.sustainabilityScore && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Sustainability</p>
                        <p className="text-sm font-medium">{u.sustainabilityScore.toFixed(1)}</p>
                      </div>
                    )}
                    {u.status && (
                      <div className="col-span-full">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.status === "Public" ? "bg-green-100 text-green-700" : u.status === "Private not for Profit" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                          {u.status === "Private not for Profit" ? "Private" : u.status}
                        </span>
                      </div>
                    )}
                    {u.domains?.length > 0 && (
                      <div className="col-span-full">
                        <p className="text-xs text-muted-foreground mb-1">Domains</p>
                        <div className="flex flex-wrap gap-1">
                          {u.domains.map((d: string) => (
                            <span key={d} className="text-xs bg-muted px-1.5 py-0.5 rounded">{d}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {u.webPages?.length > 0 && (
                      <div className="col-span-full">
                        <p className="text-xs text-muted-foreground mb-1">Website</p>
                        <a href={u.webPages[0]} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-accent hover:underline">
                          {u.webPages[0].replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="flex items-center text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
