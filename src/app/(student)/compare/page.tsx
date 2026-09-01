"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { GitCompare } from "lucide-react";

export default function ComparePage({ searchParams }: { searchParams: { ids?: string; dataset?: string; careerId?: string } }) {
  const idsParam = searchParams?.ids || "";
  const ids = idsParam.split(",").filter(Boolean).slice(0, 4);
  const dataset = (searchParams?.dataset as "indian" | "global") || "indian";
  const careerId = searchParams?.careerId || undefined;

  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompare() {
      if (ids.length === 0) { setLoading(false); return; }
      setLoading(true);
      const res = await fetch("/api/student/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionIds: ids, dataset, careerId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load comparison");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setComparison(data);
      setLoading(false);
    }
    fetchCompare();
  }, [idsParam, dataset, careerId]);

  if (loading) return <div className="p-6 pt-20 max-w-6xl mx-auto text-center text-muted-foreground">Loading comparison...</div>;
  if (error) return <div className="p-6 pt-20 max-w-6xl mx-auto text-center text-destructive">{error}</div>;
  if (ids.length === 0) {
    return (
      <div className="p-6 pt-20 max-w-6xl mx-auto text-center text-muted-foreground">
        <p>No institutions selected for comparison.</p>
        <p className="text-sm mt-1">Select up to 4 from your shortlist or match results.</p>
      </div>
    );
  }
  if (!comparison || comparison.institutions.length === 0) {
    return <div className="p-6 pt-20 max-w-6xl mx-auto text-center text-muted-foreground">No comparison data available.</div>;
  }

  return (
    <div className="space-y-6 p-6 pt-20 max-w-6xl mx-auto">
      <PageHeader icon={GitCompare} title="Compare Universities" description={`${comparison.institutions.length} institutions — side-by-side, no ranking, no winner`} />
      <p className="text-xs text-muted-foreground text-center italic">{comparison.clarifier}</p>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Field</TableHead>
                {comparison.institutions.map((inst: any) => (
                  <TableHead key={inst.id} className="min-w-48">{inst.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.rows.map((row: any) => {
                if (row.allUnavailable) {
                  return (
                    <TableRow key={row.key} className="bg-muted/30">
                      <TableCell className="font-medium text-muted-foreground">{row.label}</TableCell>
                      <TableCell colSpan={comparison.institutions.length} className="text-center text-xs text-muted-foreground">Not available for all — hidden</TableCell>
                    </TableRow>
                  );
                }
                return (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    {row.values.map((val: any, idx: number) => (
                      <TableCell key={idx} className="text-sm">
                        {row.key === "verification" && val.includes("Verified") ? (
                          <Badge className="bg-green-600">✓ Verified program</Badge>
                        ) : row.key === "verification" && val.includes("Relevant") ? (
                          <Badge variant="secondary">Relevant institution</Badge>
                        ) : (
                          <span className={val === "Not available" ? "text-muted-foreground" : ""}>{String(val).slice(0, 80)}</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">Row order is fixed and documented — not sorted to favor any institution. No aggregate winner score.</p>
    </div>
  );
}
