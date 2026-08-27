import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Breadcrumbs from "@/components/student/breadcrumbs";
import { ClipboardCheck, ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

const ASSESSMENTS: Array<{
  kind: string;
  label: string;
  description: string;
}> = [
  {
    kind: "stream",
    label: "Stream Selector",
    description: "Identify the subject stream that fits you best.",
  },
  {
    kind: "ideal",
    label: "Ideal Career Test",
    description: "Discover careers aligned with your interests.",
  },
  {
    kind: "personality",
    label: "Personality Profile",
    description: "Understand your work style and preferences.",
  },
  {
    kind: "intelligences",
    label: "Multiple Intelligences",
    description: "See where your natural strengths lie.",
  },
  {
    kind: "learning",
    label: "Learning & Productivity",
    description: "Learn how you learn and work best.",
  },
];

export default async function AssessmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const assignments = await prisma.testAssignment.findMany({
    where: { studentId: session.user.id },
    select: { kind: true, status: true, completedAt: true, token: true },
  });
  const byKind = new Map(assignments.map((a) => [a.kind, a]));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 pt-20">
      <Breadcrumbs
        items={[
          { label: "Assess", href: "/assessments" },
          { label: "Career Assessments" },
        ]}
      />

      <div className="space-y-1">
        <p className="text-sm font-medium text-accent">Assess</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Career Assessments
        </h1>
        <p className="text-sm text-muted-foreground">
          Optional assessments that enrich your recommendations. They are not
          required to see career matches.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {ASSESSMENTS.map((a) => {
          const assignment = byKind.get(a.kind);
          const completed = assignment?.status === "COMPLETED" || Boolean(assignment?.completedAt);
          return (
            <Card key={a.kind} className="border-accent/10 shadow-sm">
              <CardContent className="flex items-start gap-3 p-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <ClipboardCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{a.label}</p>
                    {completed ? (
                      <Badge variant="success">Completed</Badge>
                    ) : assignment ? (
                      <Badge variant="warning">Pending</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.description}
                  </p>
                </div>
                <div className="shrink-0">
                  {assignment ? (
                    <Link
                      href={`/exam/starttest/${assignment.token}`}
                      className={buttonVariants({
                        size: "sm",
                        variant: completed ? "outline" : "default",
                      })}
                    >
                      {completed ? "View report" : "Start"}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Ask counselor
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Want academic practice instead?
        </p>
        <Link
          href="/mock-tests"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Go to Mock Tests <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
