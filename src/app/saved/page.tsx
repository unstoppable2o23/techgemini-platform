"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, Trash2, ArrowRight } from "lucide-react";

type SavedItem = {
  id: string;
  itemType: string;
  itemId: string;
  title: string;
  href: string;
  note: string | null;
  createdAt: string;
};

const TYPE_LABEL: Record<string, string> = {
  CAREER: "Careers",
  EDUCATION: "Education",
  UNIVERSITY: "Universities",
};

export default function SavedPage() {
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/student/shortlist", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/auth/login");
          return null;
        }
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
      .then((data) => {
        if (active && data) setItems(data.items);
      })
      .catch(() => {
        if (active) setError("Could not load your shortlist. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function remove(item: SavedItem) {
    await fetch(
      `/api/student/shortlist/${item.itemType}/${encodeURIComponent(item.itemId)}`,
      { method: "DELETE" }
    );
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  const grouped: Record<string, SavedItem[]> = {};
  for (const item of items) {
    grouped[item.itemType] = grouped[item.itemType] || [];
    grouped[item.itemType].push(item);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your Shortlist</h1>
        <p className="text-sm text-muted-foreground">
          Careers, education pathways, and universities you saved for later.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {!loading && items.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No saved items yet.</p>
            <p className="text-xs mt-1">
              Save careers or universities to build your shortlist.
            </p>
            <Link
              href="/career-library"
              className="inline-flex items-center gap-1 mt-3 text-accent hover:underline text-sm"
            >
              Explore careers <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([type, list]) => (
        <div key={type}>
          <h2 className="font-semibold mb-2">{TYPE_LABEL[type] ?? type}</h2>
          <div className="space-y-2">
            {list.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <Link href={item.href} className="min-w-0">
                    <p className="font-medium truncate hover:text-accent">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{TYPE_LABEL[type]}</p>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(item)}
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
