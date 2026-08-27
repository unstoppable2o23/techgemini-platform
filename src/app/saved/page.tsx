"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/student/display";
import { Bookmark, Trash2, ArrowRight, Sparkles, GraduationCap, Building2, Eye } from "lucide-react";

type SavedItem = {
  id: string;
  itemType: string;
  itemId: string;
  title: string;
  href: string;
  note: string | null;
  createdAt: string;
};

const TYPE_META: Record<string, { label: string; icon: typeof Bookmark }> = {
  CAREER: { label: "Careers", icon: Sparkles },
  EDUCATION: { label: "Education", icon: GraduationCap },
  UNIVERSITY: { label: "Universities", icon: Building2 },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

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
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Your list</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">My Shortlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Careers, education pathways, and universities you saved for later.
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border bg-muted/30" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</div>
      )}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Tap the save icon on any career or university to keep it here and compare later."
          action={
            <Link href="/career-library" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
              Explore careers <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      )}

      {!loading &&
        Object.entries(grouped).map(([type, list]) => {
          const meta = TYPE_META[type] ?? { label: type, icon: Bookmark };
          const Icon = meta.icon;
          return (
            <section key={type} className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon className="h-4 w-4 text-accent" />
                {meta.label}
                <span className="text-xs font-normal text-muted-foreground">({list.length})</span>
              </h2>
              <div className="space-y-2">
                {list.map((item) => (
                  <Card key={item.id} className="border-accent/10 shadow-sm">
                    <CardContent className="flex items-center gap-3 p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link href={item.href} className="block truncate text-sm font-medium text-foreground hover:text-accent">
                          {item.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Saved {formatDate(item.createdAt)}
                          {item.note ? ` · ${item.note}` : ""}
                        </p>
                      </div>
                      <Link
                        href={item.href}
                        className="hidden items-center gap-1 text-sm font-medium text-accent hover:underline sm:inline-flex"
                      >
                        <Eye className="h-4 w-4" /> View
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => remove(item)} title="Remove" aria-label={`Remove ${item.title}`}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}
