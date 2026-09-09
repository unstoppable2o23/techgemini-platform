"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Bookmark, Trash2, GitCompare, MapPin, GraduationCap } from "lucide-react";
import Link from "next/link";

type SavedItem = {
  id: string;
  itemType: string;
  itemId: string;
  title: string;
  href: string;
  note: string | null;
  createdAt: string;
  profile: {
    identity: { name: string; country: string | null; state: string | null; dataset: string };
    programs: { total: number; verifiedCount: number };
    freshness: { overall: string };
    hasVerifiedPrograms: boolean;
    isEmpty: boolean;
  } | null;
};

export default function ShortlistPage() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"universities" | "programs">("universities");

  async function fetchShortlist() {
    setLoading(true);
    const res = await fetch("/api/student/shortlist");
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => { fetchShortlist(); }, []);

  const unis = items.filter(
    (it) => it.itemType === "UNIVERSITY" || it.itemType === "INDIAN_INSTITUTION"
  );
  const programs = items.filter((it) => it.itemType === "PROGRAM");
  const compareIds = unis.slice(0, 4).map((i) => i.itemId).join(",");

  async function remove(item: SavedItem) {
    await fetch(
      `/api/student/shortlist/${item.itemType}/${encodeURIComponent(item.itemId)}`,
      { method: "DELETE" }
    );
    fetchShortlist();
  }

  if (loading) return <div className="p-6 pt-20 max-w-4xl mx-auto text-center text-muted-foreground">Loading shortlist...</div>;

  return (
    <div className="space-y-6 p-6 pt-20 max-w-4xl mx-auto">
      <PageHeader icon={Bookmark} title="My Shortlist" description={`${items.length} saved items — universities, institutions, and programs with verification retained`} />

      <div className="flex gap-2">
        <Button variant={tab === "universities" ? "default" : "outline"} size="sm" onClick={() => setTab("universities")}>
          Universities ({unis.length}/20)
        </Button>
        <Button variant={tab === "programs" ? "default" : "outline"} size="sm" onClick={() => setTab("programs")}>
          Programs ({programs.length}/20)
        </Button>
      </div>

      {tab === "programs" && (
        programs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No saved programs</p>
              <p className="text-sm mt-1">Save programs from the Program Explorer to track the exact qualification and admission route.</p>
              <Link href="/student/programs" className="text-sm text-accent hover:underline mt-3 inline-block">Open Program Explorer</Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {programs.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-accent" data-testid="program-icon" />
                      {item.title || item.itemId}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => remove(item)}><Trash2 className="h-4 w-4" /></Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge variant="secondary">Catalog program</Badge>
                  {item.href && item.href !== "/career-library" && (
                    <div className="flex items-center gap-3 pt-1">
                      <Link href={item.href} className="text-xs text-accent hover:underline">View in Explorer</Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === "universities" && (unis.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bookmark className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Your university shortlist is empty</p>
            <p className="text-sm mt-1">Save universities from match results or profiles to compare them side-by-side.</p>
            <Link href="/universities" className="text-sm text-accent hover:underline mt-3 inline-block">Browse universities</Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{unis.length} / 20 saved · careers live in <Link href="/saved" className="text-accent hover:underline">Saved</Link></p>
            {unis.length >= 2 && (
              <Link href={`/compare?ids=${compareIds}`}>
                <Button variant="outline" size="sm"><GitCompare className="h-4 w-4 mr-1" /> Compare selected</Button>
              </Link>
            )}
          </div>
          <div className="grid gap-4">
            {unis.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{item.profile?.identity.name || item.title || item.itemId}</span>
                    <Button variant="ghost" size="sm" onClick={() => remove(item)}><Trash2 className="h-4 w-4" /></Button>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {item.profile?.identity.country || "Not available"} {item.profile?.identity.state ? ` · ${item.profile.identity.state}` : ""}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {item.profile?.hasVerifiedPrograms ? (
                      <Badge className="bg-green-600">✓ Verified program</Badge>
                    ) : (
                      <Badge variant="secondary">Relevant institution</Badge>
                    )}
                    {item.profile?.freshness.overall && <Badge variant="outline">{item.profile.freshness.overall}</Badge>}
                  </div>
                  <p className="text-xs">
                    {item.profile?.programs.total ? `${item.profile.programs.total} programs (${item.profile.programs.verifiedCount} verified)` : "Not available"}
                  </p>
                  <p className="text-xs text-muted-foreground">Fit describes how well this matches your profile — not your chance of admission.</p>
                  <div className="flex items-center gap-3">
                    <Link href={`/universities/${item.itemId}?dataset=${item.itemType === "UNIVERSITY" ? "global" : "indian"}`} className="text-xs text-accent hover:underline">View profile</Link>
                    <Link href={`/compare?ids=${compareIds}`} className="text-xs text-accent hover:underline">Compare</Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ))}
    </div>
  );
}