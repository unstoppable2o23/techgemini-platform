"use client";

import { useEffect, useState } from "react";
import { DecisionPackView } from "@/components/decision-pack/decision-pack-view";
import type { DecisionPack } from "@/lib/decision-pack/types";

export default function DecisionPackPage() {
  const [pack, setPack] = useState<DecisionPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/student/decision-pack");
        const data = await res.json();
        if (!res.ok || !data?.pack) {
          setError(true);
        } else if (active) {
          setPack(data.pack);
        }
      } catch {
        setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-center text-muted-foreground">
        Loading your decision pack...
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="mx-auto max-w-4xl space-y-2 p-6 text-center text-muted-foreground">
        <p className="font-medium text-foreground">Your decision pack is not ready yet.</p>
        <p>
          Complete your career profile and explore the decision center first, then come back here.
        </p>
      </div>
    );
  }

  return <DecisionPackView pack={pack} mode="student" />;
}