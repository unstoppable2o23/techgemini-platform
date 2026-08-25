"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Search, Globe, Loader2, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default function AdminUniversitiesPage() {
  const [universities, setUniversities] = useState<any[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported?: number; skipped?: number; updated?: number; errors?: string[]; message?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUniversities() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50", sortBy: "qsRank", sortOrder: "asc" });
    if (search) params.set("search", search);
    if (countryFilter) params.set("country", countryFilter);
    const res = await fetch(`/api/universities?${params}`);
    const data = await res.json();
    setUniversities(data.universities || []);
    setTotal(data.total);
    setTotalPages(data.totalPages || 1);
    if (data.countries) setCountries(data.countries);
    setLoading(false);
  }

  useEffect(() => { fetchUniversities() }, [page, countryFilter]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/admin/universities/upload", { method: "POST", body: formData });
      const data = await res.json();
      setResult(data);
      if (res.ok) fetchUniversities();
    } catch {
      setResult({ errors: ["Network error"] });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function importFromAPI() {
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/universities/import-hipolabs", { method: "POST" });
      const data = await res.json();
      setResult(data);
      if (res.ok) fetchUniversities();
    } catch {
      setResult({ errors: ["Import failed"] });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6 p-6 pt-20 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader
          icon={Globe}
          title="Universities"
          description={`Manage university database (${total} total)`}
        />
        <div className="flex gap-2">
          <Button variant="outline" disabled={importing} onClick={importFromAPI}>
            {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Database className="h-4 w-4 mr-1" />}
            Import from API
          </Button>
          <Button variant="outline" disabled={uploading} onClick={() => document.getElementById("excel-upload")?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Upload Excel
          </Button>
          <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" id="excel-upload" />
        </div>
      </div>

      {result && (
        <Card className={result.errors?.length ? "border-destructive" : "border-green-500"}>
          <CardContent className="pt-6 flex items-center gap-3">
            {result.errors?.length ? (
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">
                {result.message || `Imported: ${result.imported || 0}, Updated: ${result.updated || 0}, Skipped: ${result.skipped || 0}`}
              </p>
              {result.errors && (
                <p className="text-xs text-destructive mt-1">{result.errors.length} errors</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <div className="relative flex-1">
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
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Overall Score</TableHead>
                  <TableHead>Academic</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Citations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {universities.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">No universities found. Import from the API or upload an Excel file.</TableCell></TableRow>
                ) : universities.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.qsRank || "—"}</TableCell>
                    <TableCell><span className="text-sm font-medium">{u.name}</span></TableCell>
                    <TableCell><span className="text-sm">{u.country}</span></TableCell>
                    <TableCell>{u.overallScore?.toFixed(1) || "—"}</TableCell>
                    <TableCell>{u.academicRepScore?.toFixed(1) || "—"}</TableCell>
                    <TableCell>{u.employerRepScore?.toFixed(1) || "—"}</TableCell>
                    <TableCell>{u.facultyStudentScore?.toFixed(1) || "—"}</TableCell>
                    <TableCell>{u.citationsScore?.toFixed(1) || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
