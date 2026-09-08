"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, ListChecks, UserRound } from "lucide-react";
import { trackRecommendationEvent } from "@/lib/analytics/client";

const READING_KIND_LABELS: Record<string, string> = {
  EDUCATION: "your current qualification & grade",
  SUBJECT: "the subjects you study",
  APTITUDE: "an aptitude assessment",
  PERSONALITY: "a personality assessment",
  INTEREST: "your interests & activities",
  WORK_ENVIRONMENT: "your work-environment preferences",
  PREFERENCE: "your career preference",
};

export function LowInformationState({
  completedKinds,
  missingKinds,
}: {
  completedKinds: string[];
  missingKinds: string[];
}) {
  const shown = missingKinds.length > 0 ? missingKinds : [];

  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-sky-50">
          <Info className="h-5 w-5 text-sky-600" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold">Your recommendations are early directional suggestions</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          You haven't completed your profile yet, so matches are currently based on limited
          information. Adding your details and completing assessments will make your
          recommendations more personal and reliable.
        </p>

        {shown.length > 0 && (
          <div className="mx-auto mt-4 max-w-lg text-left">
            <p className="text-xs font-semibold text-muted-foreground">We'd love to know more about:</p>
            <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
              {shown.map((k) => (
                <li
                  key={k}
                  className="rounded-full bg-muted px-3 py-1 text-xs text-foreground/80"
                >
                  {READING_KIND_LABELS[k] ?? "more about your profile"}
                </li>
              ))}
            </ul>
            {completedKinds.length > 0 && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Completed:{" "}
                {completedKinds
                  .map((k) => READING_KIND_LABELS[k] ?? "profile details")
                  .join(", ")}
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link href="/career-preferences">
            <Button
              onClick={() => trackRecommendationEvent({ event: "profile_completion_cta_clicked" })}
            >
              <UserRound className="mr-2 h-4 w-4" aria-hidden="true" />
              Complete your profile
            </Button>
          </Link>
          <Link href="/assessments">
            <Button
              variant="outline"
              onClick={() => trackRecommendationEvent({ event: "assessment_cta_clicked" })}
            >
              <ListChecks className="mr-2 h-4 w-4" aria-hidden="true" />
              Take recommended assessment
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}