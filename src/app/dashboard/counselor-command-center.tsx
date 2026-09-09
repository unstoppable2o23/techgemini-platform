import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  Users,
  BellRing,
  ClipboardCheck,
  FileText,
  Sparkles,
  Compass,
  Map,
  Siren,
  Activity,
  CalendarClock,
} from "lucide-react";
import type { CounselorCommandCenter } from "@/lib/counselor/command-center";
import type { AttentionState } from "@/lib/counselor/attention";

const PRIMARY_VARIANT: Record<AttentionState, "destructive" | "warning" | "secondary" | "default"> = {
  PROFILE_INCOMPLETE: "warning",
  ASSESSMENT_INCOMPLETE: "warning",
  NO_CLEAR_PATHWAY: "warning",
  ROADMAP_NOT_STARTED: "secondary",
  ROADMAP_STALLED: "destructive",
  UNIVERSITY_SHORTLIST_MISSING: "secondary",
  FOLLOW_UP_DUE: "destructive",
  READY_FOR_COUNSELOR_REVIEW: "default",
};

function fmtActivity(d: Date | null): string {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

function fmtDiffDays(v: number | null): string {
  if (v === null) return "—";
  return `${Math.round(v)}%`;
}

export function CounselorCommandCenter({
  commandCenter,
  firstName,
}: {
  commandCenter: CounselorCommandCenter;
  firstName: string;
}) {
  const { counts, followUps, attention } = commandCenter;

  const cards = [
    { label: "Assigned students", value: counts.totalStudents, icon: Users, hint: "Registered students" },
    { label: "Require counselor action", value: counts.requireCounselorAction, icon: Siren, hint: "Attention states vs ready-for-review" },
    { label: "Follow-up due", value: counts.needsFollowUp, icon: BellRing, hint: "Open action due within 7 days" },
    { label: "Assessments incomplete", value: counts.assessmentsIncomplete, icon: ClipboardCheck, hint: "Fewer than 5 completed" },
    { label: "Profiles incomplete", value: counts.profilesIncomplete, icon: FileText, hint: "Completeness below 60%" },
    { label: "With career recommendations", value: counts.withCareerRecommendations, icon: Sparkles, hint: "Career profile processed" },
    { label: "No clear pathway yet", value: counts.noSelectedPathway, icon: Compass, hint: "No career direction selected" },
    { label: "Roadmap in progress", value: counts.roadmapInProgress, icon: Map, hint: "Started but not finished" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Activity}
        title="Counselor Command Center"
        description={`Welcome back, ${firstName}`}
        eyebrow="Overview"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-semibold">{c.value}</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow">
                  <c.icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4" />
              Follow-up bucket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Overdue</span><span className="font-semibold text-destructive">{followUps.overdue}</span></div>
            <div className="flex justify-between"><span>Due today</span><span className="font-semibold text-amber-600">{followUps.dueToday}</span></div>
            <div className="flex justify-between"><span>Due this week</span><span className="font-semibold">{followUps.dueThisWeek}</span></div>
            <div className="flex justify-between"><span>Completed</span><span className="font-semibold text-muted-foreground">{followUps.completed}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertIcon />
              Attention states
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {attention.length === 0 && (
              <span className="text-sm text-muted-foreground">All students are on track.</span>
            )}
            {attention.map((a) => (
              <Badge key={a.state} variant={PRIMARY_VARIANT[a.state]} className="gap-1">
                {a.label}
                <span className="font-semibold">{a.count}</span>
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-sm">
            <Users className="h-4 w-4" />
            Students by priority
            <Badge variant="secondary" className="ml-1 rounded-full px-2">
              {counts.totalStudents}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Attention</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Assessments</TableHead>
                <TableHead>Roadmap</TableHead>
                <TableHead>Shortlist</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commandCenter.students.map((s) => (
                <TableRow key={s.userId}>
                  <TableCell>
                    <a className="text-sm font-medium text-blue-600 hover:underline" href={`/students/${s.userId}`}>
                      {s.name}
                    </a>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </TableCell>
                  <TableCell>
                    {s.primary ? (
                      <Badge variant={PRIMARY_VARIANT[s.primary]}>{s.primary.replace(/_/g, " ").toLowerCase()}</Badge>
                    ) : (
                      <Badge variant="secondary">On track</Badge>
                    )}
                    {s.states.length > 1 && (
                      <p className="mt-1 text-[10px] text-muted-foreground">{s.states.length - 1} more</p>
                    )}
                  </TableCell>
                  <TableCell><span className="text-sm">{fmtDiffDays(s.profileCompleteness)}</span></TableCell>
                  <TableCell><span className="text-sm">{s.assessmentCompleted}/{s.assessmentTotal}</span></TableCell>
                  <TableCell>
                    {s.roadmapExists ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Map className="h-3 w-3 text-muted-foreground" />
                        {Math.round(s.roadmapProgress)}%
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell><span className="text-sm">{s.shortlistedUniversities}</span></TableCell>
                  <TableCell><span className="text-sm text-muted-foreground whitespace-nowrap">{fmtActivity(s.lastActivityAt)}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertIcon() {
  return (
    <span className="flex h-4 w-4 items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
    </span>
  );
}