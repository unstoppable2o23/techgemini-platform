"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ClipboardCheck, Sparkles, Users, Cpu, Briefcase, GraduationCap, BookOpen, MapPin, Star, FileText } from "lucide-react";

type Signal = { dimension: string; value: string; score: number; sourceType: string; confidence: number };

type Profile = {
  completeness: number;
  assessmentCompleteness: number;
  level: string;
  primaryInterests: string[];
  strengths: string[];
  lastCalculatedAt: string;
  signals: Signal[];
} | null;

type StudentCareerInputs = {
  preferredCareer: string | null;
  studyLevel: string | null;
  gradeLevel: string | null;
  highestEducation: string | null;
  averageGrade: string | null;
  targetCountry: string | null;
  state: string | null;
  careerPlanNotes: string | null;
  tuitionBudget: string | null;
  exams: string[];
} | null;

const ALL_KINDS = ["stream", "ideal", "personality", "intelligences", "learning"];

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
  allKinds,
  studentCareerInputs,
}: {
  profile: Profile;
  completedKinds: string[];
  allKinds: string[];
  studentCareerInputs: StudentCareerInputs;
}) {
  const grouped = profile
    ? Object.keys(DIMENSION_LABELS)
        .map((dim) => ({
          dimension: dim,
          signals: profile.signals.filter(
            (s) => s.dimension === dim && s.sourceType === "ASSESSMENT"
          ),
        }))
        .filter((g) => g.signals.length > 0)
    : [];

  const hasAssessmentData = profile
    ? profile.signals.some((s) => s.sourceType === "ASSESSMENT")
    : false;

  const careerInfoRows = studentCareerInputs
    ? [
        ["Preferred career", studentCareerInputs.preferredCareer],
        ["Study level", studentCareerInputs.studyLevel],
        ["Grade level", studentCareerInputs.gradeLevel],
        ["Highest education", studentCareerInputs.highestEducation],
        ["Academic performance", studentCareerInputs.averageGrade],
        ["Target country", studentCareerInputs.targetCountry],
        ["State", studentCareerInputs.state],
        ["Tuition budget", studentCareerInputs.tuitionBudget],
        ["Exams preparing for", studentCareerInputs.exams?.join(", ") || null],
      ].filter(([, v]) => Boolean(v)) as [string, string | null][]
    : ([] as [string, string | null][]);

  return (
    <div className="space-y-6 p-6 pt-20 max-w-3xl mx-auto">
      <PageHeader
        icon={ClipboardCheck}
        title="Career Profile"
        description="Your assessments and career information, normalised for career matching."
        eyebrow="Career Intelligence"
      />

      {/* ---- Completeness bars ---- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Career Profile Completeness</CardTitle>
          <Badge variant="secondary">{profile?.level.toLowerCase() || "empty"}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Overall</span>
              <span>{profile?.completeness ?? 0}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-3 rounded-full bg-primary transition-all"
                style={{ width: `${profile?.completeness ?? 0}%` }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Assessment coverage</span>
              <span>{profile?.assessmentCompleteness ?? 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-2 rounded-full bg-accent/60 transition-all"
                style={{ width: `${profile?.assessmentCompleteness ?? 0}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Updated {profile?.lastCalculatedAt ? new Date(profile.lastCalculatedAt).toLocaleDateString() : "never"}
          </p>
        </CardContent>
      </Card>

      {/* ---- Career Information (non-psychometric) ---- */}
      {careerInfoRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Your Career Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {careerInfoRows.map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-right">{value}</dd>
                </div>
              ))}
            </dl>
            {studentCareerInputs?.careerPlanNotes && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Career notes</p>
                <p className="text-sm">{studentCareerInputs.careerPlanNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---- Assessment Progress ---- */}
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
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Completed</Badge>
                  ) : (
                    <Badge variant="outline">Not taken</Badge>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Ask your counselor to assign assessments you are missing. Assessments improve your
            profile but are optional.
          </p>
        </CardContent>
      </Card>

      {/* ---- Assessment Insights ---- */}
      {hasAssessmentData ? (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-2">
            Your Assessment Insights
          </h3>
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

          {profile && profile.strengths.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.strengths.map((s) => (
                    <span key={s} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {s}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        careerInfoRows.length > 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Assessment insights will appear here once you complete at least one assessment.
                Your career information above is already contributing to your profile.
              </p>
            </CardContent>
          </Card>
        )
      )}

      {/* ---- Empty state ---- */}
      {(!profile || (profile.signals.length === 0 && careerInfoRows.length === 0)) && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your Career Profile is empty. Complete your career preferences or ask your
            counselor to assign assessments to start building it.
            <div className="mt-4">
              <Link href="/career-preferences">
                <Button size="sm">Fill Career Preferences</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">
            Career recommendations based on this profile are coming in a future update.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
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
    </div>
  );
}
