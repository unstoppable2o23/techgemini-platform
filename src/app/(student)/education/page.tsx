import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStudentDashboard } from "@/lib/student/dashboard.ts";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeading, EmptyState, PathwayBadge } from "@/components/student/display";
import Breadcrumbs from "@/components/student/breadcrumbs";
import { GraduationCap, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function EducationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const dashboard = await getStudentDashboard(session.user.id);
  const p = dashboard.educationPathways;
  const topCareer = dashboard.topCareerMatches?.[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 pt-20">
      <Breadcrumbs
        items={[
          { label: "Plan", href: "/education" },
          { label: "Education Pathways" },
        ]}
      />

      <SectionHeading
        icon={GraduationCap}
        eyebrow="Plan"
        title="Education Pathways"
        subtitle={
          topCareer
            ? `Recommended study paths for ${
                (topCareer.career?.title || topCareer.career?.name) ?? "your top match"
              }.`
            : "Complete your profile and review matches to see personalized pathways."
        }
      />

      {!p ? (
        <EmptyState
          icon={GraduationCap}
          title="Education pathways will appear soon"
          description="Review your career matches to unlock personalized education pathways."
          action={
            <Link
              href="/career-matches"
              className={buttonVariants({ size: "sm" })}
            >
              View career matches
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {(
            [
              { key: "primary", label: "Recommended pathway" },
              { key: "alternative", label: "Alternative pathways" },
              { key: "optional", label: "Optional steps" },
            ] as const
          ).map((group) => {
            const items = (p?.[group.key] || []).slice(0, 3);
            if (items.length === 0) return null;
            return (
              <div key={group.key} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((path: any) => (
                    <Card key={path.id} className="border-accent/10 shadow-sm">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-foreground">
                            {path.degree?.name || "Degree"}
                            {path.specialization?.name
                              ? ` → ${path.specialization.name}`
                              : ""}
                          </p>
                          <PathwayBadge priority={path.priority} />
                        </div>
                        {path.notes && (
                          <p className="text-xs text-muted-foreground">{path.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}

          {p.recommendedSubjects?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Helpful subjects
              </p>
              <div className="flex flex-wrap gap-1.5">
                {p.recommendedSubjects.map((s: any, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                  >
                    {s?.name || s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/indian-colleges"
              className={buttonVariants({ variant: "default", size: "sm" })}
            >
              Find universities <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/career-matches"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Back to matches
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
