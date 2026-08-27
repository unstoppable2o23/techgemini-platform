import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ArrowRight } from "lucide-react";
import type { StudentJourney } from "@/lib/student/journey.ts";

export default function StudentJourney({
  journey,
}: {
  journey: StudentJourney;
}) {
  const { steps, next, completedCount, total } = journey;

  return (
    <section className="space-y-4" aria-label="Your career journey">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-accent">Guided path</p>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Your Career Journey
          </h2>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          <span className="font-semibold text-foreground">{completedCount}</span> of{" "}
          {total} steps complete
        </p>
      </div>

      <Card className="border-accent/15 shadow-sm">
        <CardContent className="p-5">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => {
              const isCurrent = step.status === "current";
              const isDone = step.status === "done";
              return (
                <li key={step.id}>
                  <Link
                    href={step.href}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "group flex h-full items-start gap-3 rounded-xl border p-3 transition-all",
                      isCurrent
                        ? "border-accent bg-accent/5 ring-1 ring-inset ring-accent/20"
                        : "border-border bg-card hover:border-accent/40 hover:bg-accent/5"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        isDone
                          ? "bg-accent text-white"
                          : isCurrent
                          ? "bg-accent/15 text-accent"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isDone ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">
                        {step.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {step.description}
                      </span>
                      {step.optional && !isDone && (
                        <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Optional
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>

          {next && (
            <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl bg-accent/5 p-4 ring-1 ring-inset ring-accent/15 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <ArrowRight className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-accent">
                    Next step
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {next.title}
                  </p>
                </div>
              </div>
              <Link
                href={next.href}
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "shrink-0"
                )}
              >
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
