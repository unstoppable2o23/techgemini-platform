"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-6 p-6 pt-20 max-w-3xl mx-auto">
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load your career matches right now.
        </p>
        <Button size="sm" className="mt-4" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
