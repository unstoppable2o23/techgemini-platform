"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Bookmark, Trash2, GitCompare, MapPin } from "lucide-react";
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

  async function fetchShortlist() {
    setLoading(true);
    const res = await fetch("/api/student/shortlist");
    const data = await res.json();
    const unis = (data.items || []).filter(
      (it: SavedItem) => it.itemType === "UNIVERSITY" || it.itemType === "INDIAN_INSTITUTION"
    );
    setItems(unis);
    setLoading(false);
  }

  useEffect(() => { fetchShortlist(); }, []);

  const compareIds = items.slice(0, 4).map((i) => i.itemId).join(",");

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
      <PageHeader icon={Bookmark} title="My University Shortlist" description={`${items.length} of 20 saved — verification, fit tiers, and explanations retained`} />

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bookmark className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Your shortlist is empty</p>
            <p className="text-sm mt-1">Save universities from match results or profiles to compare them side-by-side.</p>
            <Link href="/universities" className="text-sm text-accent hover:underline mt-3 inline-block">Browse universities</Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{items.length} / 20 saved · careers live in <Link href="/saved" className="text-accent hover:underline">Saved</Link></p>
            {items.length >= 2 && (
              <Link href={`/compare?ids=${compareIds}`}>
                <Button variant="outline" size="sm"><GitCompare className="h-4 w-4 mr-1" /> Compare selected</Button>
              </Link>
            )}
          </div>
          <div className="grid gap-4">
            {items.map((item) => (
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
      )}
    </div>
  );
}