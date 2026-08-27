import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SaveButton from "@/components/student/save-button";
import {
  ClipboardCheck,
  TrendingUp,
  GraduationCap,
  Building2,
  Flame,
  ListChecks,
  MessagesSquare,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { StudentDashboard } from "@/lib/student/dashboard.ts";

function MappingBadge({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, string> = {
    curated: "bg-green-100 text-green-700 border-green-200",
    "institutionType-category": "bg-amber-100 text-amber-700 border-amber-200",
    none: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <Badge variant="outline" className={map[status] ?? ""}>
      {status === "curated"
        ? "Verified mapping"
        : status === "institutionType-category"
        ? "Category-based"
        : "Unverified"}
    </Badge>
  );
}

export default function StudentIntelligenceHub({
  dashboard,
}: {
  dashboard: StudentDashboard;
}) {
  const d = dashboard;

  return (
    <div className="space-y-6">
      {/* Profile + assessment completeness */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Career Profile Completeness</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">{Math.round(d.profileCompleteness)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Based on your profile and {d.hasAssessments ? "assessment" : "profile"} information.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assessment Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">
              {d.assessmentCompletedCount}/5
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {d.hasAssessments
                ? "Assessments enrich your recommendations."
                : "Optional — profile-based recommendations are still available."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saved Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">{d.savedCount}</p>
            <Link href="/saved" className="text-xs text-accent hover:underline mt-1 inline-block">
              View shortlist →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Assessment progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" /> Assessment Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {d.assessmentProgress.map((a) => (
              <div key={a.kind} className="rounded-lg border p-3 text-center">
                <p className="text-xs font-medium">{a.label}</p>
                <Badge
                  variant="outline"
                  className={
                    a.completed
                      ? "mt-2 bg-green-50 text-green-700 border-green-200"
                      : a.assigned
                      ? "mt-2 text-amber-600"
                      : "mt-2 text-gray-500"
                  }
                >
                  {a.completed ? "Completed" : a.assigned ? "Pending" : "Not started"}
                </Badge>
              </div>
            ))}
          </div>
          {!d.hasAssessments && (
            <p className="text-xs text-muted-foreground mt-3">
              Recommendations are currently based on your profile information. Completing
              assessments can provide additional personalization.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top career matches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Your Top Career Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {d.topCareerMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No career matches yet. Add more career information to improve recommendations.
            </p>
          ) : (
            <div className="space-y-3">
              {d.topCareerMatches.map((m: any) => (
                <div key={m.careerId} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/career-library/${m.career.slug}`}
                        className="font-semibold hover:text-accent"
                      >
                        {m.career.title || m.career.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{m.career.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-accent">{m.matchScore}%</p>
                      <p className="text-xs text-muted-foreground">Conf {m.confidenceScore}%</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(m.strengths || []).slice(0, 3).map((s: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-green-700 bg-green-50">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    <SaveButton itemType="CAREER" itemId={m.careerId} />
                  </div>
                  {d.careerMatchDisclaimer && (
                    <p className="text-xs text-amber-700 mt-2">{d.careerMatchDisclaimer}</p>
                  )}
                </div>
              ))}
              <Link
                href="/career-matches"
                className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
              >
                View all matches <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Education pathways */}
      {d.educationPathways && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Recommended Education Pathways
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {d.educationPathways.primary.slice(0, 3).map((p: any) => (
                <div key={p.id} className="rounded-lg border p-3">
                  <p className="font-medium">
                    {p.degree?.name || "Degree"}
                    {p.specialization?.name ? ` → ${p.specialization.name}` : ""}
                  </p>
                  {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                </div>
              ))}
              {d.educationPathways.primary.length === 0 && (
                <p className="text-muted-foreground">No primary pathways mapped yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* University matches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Personalized University Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!d.universityMatches || d.universityMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No suitable institution candidates are currently available for this pathway.
            </p>
          ) : (
            <div className="space-y-3">
              {d.universityMatches.slice(0, 3).map((m: any) => (
                <div key={m.institution?.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{m.institution?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[m.institution?.institutionType, m.institution?.state, m.institution?.country]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-accent">{m.matchScore}%</p>
                      <p className="text-xs text-muted-foreground">Conf {m.confidence}%</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                    <MappingBadge status={m.mappingStatus} />
                    {m.institution?.website && (
                      <a
                        href={m.institution.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline"
                      >
                        View Institution
                      </a>
                    )}
                    <SaveButton itemType="UNIVERSITY" itemId={m.institution?.id} />
                  </div>
                </div>
              ))}
              {d.universityMatchDisclaimer && (
                <p className="text-xs text-amber-700">{d.universityMatchDisclaimer}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trending careers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5" /> Trending Careers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {d.trendingCareers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Trend data is not available yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {d.trendingCareers.map((t: any) => (
                <Link
                  key={t.career.id}
                  href={`/career-library/${t.career.slug}`}
                  className="rounded-lg border p-3 hover:shadow-sm transition"
                >
                  <p className="font-medium">{t.career.title || t.career.name}</p>
                  <p className="text-xs text-muted-foreground">{t.career.category}</p>
                  <Badge variant="outline" className="mt-2 bg-orange-50 text-orange-700 border-orange-200">
                    Trending
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" /> Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {d.nextSteps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Counselor handoff */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <MessagesSquare className="h-5 w-5 text-accent" />
            <p className="text-sm font-medium">Want to talk through your options?</p>
          </div>
          <div className="flex gap-2">
            <Link href="/appointments" className="text-sm text-accent hover:underline">
              Book an appointment
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/messages" className="text-sm text-accent hover:underline">
              Message your counselor
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
