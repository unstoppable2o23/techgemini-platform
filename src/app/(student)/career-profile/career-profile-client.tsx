"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ClipboardCheck, Sparkles, Users, Cpu, Briefcase, GraduationCap } from "lucide-react";

type Signal = { dimension: string; value: string; score: number; confidence: number };

type Profile = {
  completeness: number;
  level: string;
  primaryInterests: string[];
  strengths: string[];
  lastCalculatedAt: string;
  signals: Signal[];
} | null;

const KIND_LABELS: Record<string, string> = {
  stream: "Stream Selector",
  ideal: "Ideal Career",
  personality: "Personality Type Profile",
  intelligences: "Multiple Intelligences",
  learning: "Learning & Productivity",
};

const DIMENSION_LABELS: Record<string, { label: string; icon: any }> = {
  INTEREST: { label: "Your Interests", icon: Sparkles },
  PERSONALITY: { label: "Personality Signals", icon: Users },
  APTITUDE: { label: "Aptitude Signals", icon: Cpu },
  SKILL: { label: "Skills & Learning", icon: ClipboardCheck },
  WORK_ENVIRONMENT: { label: "Work Preferences", icon: Briefcase },
  SUBJECT: { label: "Subject Orientation", icon: GraduationCap },
  EDUCATION: { label: "Education Signals", icon: GraduationCap },
};

export function CareerProfileClient({
  profile,
  completedKinds,
}: {
  profile: Profile;
  completedKinds: string[];
}) {
  const allKinds = ["stream", "ideal", "personality", "intelligences", "learning"];
  const grouped = profile
    ? Object.keys(DIMENSION_LABELS)
        .map((dim) => ({
          dimension: dim,
          signals: profile.signals.filter((s) => s.dimension === dim),
        }))
        .filter((g) => g.signals.length > 0)
    : [];

  return (
    <div className="space-y-6 p-6 pt-20 max-w-3xl mx-auto">
      <PageHeader
        icon={ClipboardCheck}
        title="Career Profile"
        description="Your assessments, normalised into career signals."
        eyebrow="Career Intelligence"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Profile Completeness</CardTitle>
          <Badge
            variant="secondary"
          >{profile ? profile.level.toLowerCase() : "empty"}</Badge>
        </CardHeader>
        <CardContent>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-3 rounded-full bg-primary transition-all"
              style={{ width: `${profile?.completeness ?? 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {profile?.completeness ?? 0}% complete · updated{" "}
            {profile?.lastCalculatedAt
              ? new Date(profile.lastCalculatedAt).toLocaleDateString()
              : "never"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assessment Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {allKinds.map((kind) => {
              const done = completedKinds.includes(kind);
              return (
                <li key={kind} className="flex items-center justify-between text-sm">
                  <span>{KIND_LABELS[kind]}</span>
                  {done ? (
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not taken</Badge>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Ask your counselor to assign any assessments you are missing.
          </p>
        </CardContent>
      </Card>

      {profile && profile.signals.length > 0 ? (
        <>
          {profile.primaryInterests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Primary Interests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.primaryInterests.map((p) => (
                    <span key={p} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {p}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {grouped.map((group) => {
            const meta = DIMENSION_LABELS[group.dimension];
            const Icon = meta?.icon || Sparkles;
            return (
              <Card key={group.dimension}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-primary" />
                    {meta?.label || group.dimension}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    {group.signals.map((s) => (
                      <div key={`${s.dimension}-${s.value}`}>
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/80">
                            {s.value.replace(/_/g, " ")}
                          </span>
                          <span>{Math.round(s.score)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-primary/70"
                            style={{ width: `${Math.round(s.score)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">
                These signals describe how you think, learn and work. They will
                be matched against careers in a future update — no career
                recommendations are shown yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() =>
                  fetch("/api/student/career-profile/regenerate", { method: "POST" }).then(() =>
                    window.location.reload()
                  )
                }
              >
                Recalculate profile
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No career signals yet. Complete an assessment to start building your
            Career Profile.
            <div className="mt-4">
              <Link href="/dashboard">
                <Button size="sm">Go to My Tests</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
