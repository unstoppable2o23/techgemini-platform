"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Compass } from "lucide-react";

/**
 * Phase 26 — confirms a career as the student's pathway. Records the event
 * server-side (`pathway_started`), regenerates the roadmap around the career,
 * then routes the student to their roadmap.
 */
export function BuildPathwayButton({
  careerId,
  careerName,
  alreadyPreferred = false,
  size = "sm",
  variant = "default",
  className,
  disabled,
}: {
  careerId: string;
  careerName?: string;
  alreadyPreferred?: boolean;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "secondary";
  className?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (alreadyPreferred) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ${className ?? ""}`}
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        This is your pathway
      </span>
    );
  }

  const confirmPathway = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/student/journey/career-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerId }),
      });
      const j = await r.json();
      if (r.ok && j?.ok) {
        router.push("/roadmap");
        router.refresh();
        return;
      }
      setError(j?.error || "We couldn't set this pathway right now.");
    } catch {
      setError("We couldn't set this pathway right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        size={size}
        variant={variant}
        disabled={busy || disabled}
        onClick={confirmPathway}
        className={className}
      >
        {busy ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Compass className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        )}
        {busy ? "Building your roadmap…" : "Build my pathway"}
        {careerName ? ` · ${careerName}` : ""}
      </Button>
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </span>
  );
}