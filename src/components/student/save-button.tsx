"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ShortlistItemType } from "@/lib/student/shortlist.ts";

export default function SaveButton({
  itemType,
  itemId,
  initialSaved = false,
  size = "sm",
  className = "",
}: {
  itemType: ShortlistItemType;
  itemId: string;
  initialSaved?: boolean;
  size?: "sm" | "default";
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      if (saved) {
        await fetch(
          `/api/student/shortlist/${itemType}/${encodeURIComponent(itemId)}`,
          { method: "DELETE" }
        );
        setSaved(false);
      } else {
        const res = await fetch(`/api/student/shortlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemType, itemId }),
        });
        if (res.ok) setSaved(true);
      }
    } catch {
      // ignore network errors; UI state remains unchanged
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={saved ? "default" : "outline"}
      size={size}
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      className={className}
      title={saved ? "Remove from shortlist" : "Save to shortlist"}
    >
      <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
