import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
import {
  Users,
  FileText,
  Calendar,
  Activity,
  ArrowUpRight,
  GraduationCap,
  Calculator,
  Trophy,
  Clock,
  Timer,
  ClipboardCheck,
  Briefcase,
} from "lucide-react";
import { formatUsageMinutes } from "@/lib/format-utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getStudentDashboard } from "@/lib/student/dashboard.ts";
import { buildStudentJourney } from "@/lib/student/journey.ts";
import StudentIntelligenceHub from "./student-intelligence-hub";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/auth/login");
  const user = session.user;
  const isCounselor = user.role === "COUNSELOR" || user.role === "SUPER_ADMIN";
  const isUniversityAdmin = user.role === "UNIVERSITY_ADMIN";
  const isOrgAdmin = user.role === "ORGANIZATION_ADMIN";
  const isStudent = user.role === "STUDENT";

  if (isOrgAdmin) {
    redirect("/org-admin");
  }

  if (isStudent) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: {
        careerPrefsFilled: true,
        gradeLevel: true,
        studyLevel: true,
        preferredCareer: true,
        nationality: true,
        exams: true,
      },
    });
    // Only block brand-new students with essentially no profile data.
    // Students who already have profile information (even without the
    // "prefs filled" flag or any assessments) must still see recommendations.
    const hasMinimalProfile =
      profile &&
      (profile.gradeLevel ||
        profile.studyLevel ||
        profile.preferredCareer ||
        profile.nationality ||
        (profile.exams && profile.exams.length > 0));
    if (!profile || (!profile.careerPrefsFilled && !hasMinimalProfile)) {
      redirect("/career-preferences");
    }
  }

  if (isUniversityAdmin) {
    return (
      <div className="space-y-6 p-6 pt-20">
        <PageHeader
          icon={Briefcase}
          title="University Admin Dashboard"
          description={`Welcome back, ${user.firstName} — read-only view`}
          eyebrow="Overview"
        />
        <AllUsersTable tenantId={user.tenantId} />
      </div>
    );
  }

  if (isCounselor) {
    const studentCount = await prisma.user.count({
      where: {
        role: "STUDENT",
        tenantId: user.tenantId,
        ...(user.role === "COUNSELOR"
          ? { studentProfile: { counselor: { userId: user.id } } }
          : {}),
      },
    });

    const testCount = await prisma.testResult.count({
      where: { student: { userId: user.id } },
    });

    const upcomingAppointments = await prisma.appointment.count({
      where: {
        counselorId: user.id,
        status: "CONFIRMED",
        startTime: { gte: new Date() },
      },
    });

    const stats = [
      { title: "Total Students", value: studentCount, icon: Users, hint: "Registered students" },
      { title: "Tests Completed", value: testCount, icon: FileText, hint: "All time" },
      { title: "Upcoming Appointments", value: upcomingAppointments, icon: Calendar, hint: "Confirmed" },
      { title: "Active Students", value: studentCount, icon: Activity, hint: "Currently active" },
    ];

    return (
      <div className="space-y-6 p-6 pt-20">
        <PageHeader
          icon={Activity}
          title="Counselor Dashboard"
          description={`Welcome back, ${user.firstName}`}
          eyebrow="Overview"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} hint={stat.hint} />
          ))}
        </div>
        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <a href="/students" className="group flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-md shadow-primary/30 transition-transform duration-200 group-hover:scale-110">
                <Users className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Manage Students</p>
                <p className="text-xs text-muted-foreground">View and configure student access</p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
            </a>
            <a href="/calendar" className="group flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-md shadow-primary/30 transition-transform duration-200 group-hover:scale-110">
                <Calendar className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Calendar</p>
                <p className="text-xs text-muted-foreground">Manage appointments</p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
            </a>
          </CardContent>
        </Card>

        {user.role === "COUNSELOR" && (
          <MyStudentsTable tenantId={user.tenantId} counselorUserId={user.id} />
        )}

        {user.role === "SUPER_ADMIN" && (
          <AllUsersTable tenantId={user.tenantId} />
        )}
      </div>
    );
  }

  // Student view
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { featureAccess: true },
  });
  const featureAccess = studentProfile?.featureAccess;
  const dashboard = await getStudentDashboard(user.id);

  const appointmentCount = await prisma.appointment
    .count({
      where: {
        studentId: studentProfile?.id,
        status: { in: ["CONFIRMED", "COMPLETED", "PENDING"] },
      },
    })
    .catch(() => 0);
  const journey = buildStudentJourney(dashboard, {
    appointmentBooked: appointmentCount > 0,
  });

  const recentResults = await prisma.testResult.findMany({
    where: { studentId: studentProfile?.id },
    orderBy: { submittedAt: "desc" },
    take: 5,
    include: { test: true },
  });

  const myTests = await prisma.testAssignment.findMany({
    where: { studentId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const featureCards = [
    { label: "College Finder", icon: GraduationCap, enabled: featureAccess?.collegeFinder, href: "/college-finder" },
    { label: "AI Odds Calculator", icon: Calculator, enabled: featureAccess?.aiOddsCalculator, href: "/odds-calculator" },
    { label: "Mock Tests", icon: FileText, enabled: featureAccess?.mockTests, href: "/mock-tests" },
    { label: "Scholarships", icon: Trophy, enabled: featureAccess?.scholarshipHub, href: "/scholarships" },
    { label: "Career Library", icon: Briefcase, enabled: featureAccess?.careerLibrary, href: "/career-library" },
  ];

  return (
    <div className="space-y-6 p-6 pt-20">
      <StudentIntelligenceHub
        dashboard={dashboard}
        studentName={user.firstName}
        journey={journey}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {featureCards.map((f) => (
          <Card key={f.label} className={!f.enabled ? "opacity-50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{f.label}</CardTitle>
              <f.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {f.enabled ? `Access your ${f.label.toLowerCase()}` : "Contact your counselor to enable"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {myTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-md shadow-primary/25">
                <ClipboardCheck className="h-5 w-5" />
              </span>
              My Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myTests.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {t.kind === "stream"
                        ? "Stream Selector Test"
                        : t.kind === "ideal"
                          ? "Ideal Career Test"
                          : t.kind === "personality"
                            ? "Personality Type Test"
                            : t.kind === "intelligences"
                              ? "Multiple Intelligences Test"
                              : "Learning & Productivity Test"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Assigned {new Date(t.createdAt).toLocaleDateString()}
                      {t.status === "COMPLETED" && t.completedAt &&
                        ` · Completed ${new Date(t.completedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {t.status === "COMPLETED" ? (
                      <Badge variant="success">Completed</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                    <a
                      href={`/exam/starttest/${t.token}`}
                      className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                      {t.status === "COMPLETED" ? "View report" : "Start test"}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {recentResults.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Test Results</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{result.test.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(result.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{result.score}/{result.totalMarks}</p>
                    <p className="text-xs text-muted-foreground">{result.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "secondary"; dot: string }> = {
  ONLINE: { label: "Online", variant: "success", dot: "bg-green-500" },
  IN_TEST: { label: "In Test", variant: "warning", dot: "bg-orange-500" },
  OFFLINE: { label: "Offline", variant: "secondary", dot: "bg-gray-400" },
};

function formatLastSeen(date: string | Date | null): string {
  if (!date) return "Never";
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

async function MyStudentsTable({ tenantId, counselorUserId }: { tenantId: string; counselorUserId: string }) {
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      tenantId,
      studentProfile: { counselor: { userId: counselorUserId } },
    },
    orderBy: { lastSeen: { sort: "desc", nulls: "last" } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      lastSeen: true,
      totalUsageMinutes: true,
      studentProfile: { select: { status: true, _count: { select: { testResults: true } } } },
    },
  });

  if (students.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-md shadow-primary/25">
            <Users className="h-5 w-5" />
          </span>
          My Students
          <Badge variant="secondary" className="ml-1 rounded-full px-2">
            {students.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tests</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead>Usage Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => {
              const status = s.studentProfile?.status || "OFFLINE";
              const sc = STATUS_CONFIG[status] || STATUS_CONFIG.OFFLINE;
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sc.variant} className="gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ClipboardCheck className="h-3 w-3" />
                      {s.studentProfile?._count?.testResults || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatLastSeen(s.lastSeen)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Timer className="h-3 w-3" />
                      {formatUsageMinutes(s.totalUsageMinutes ?? 0)}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

async function AllUsersTable({ tenantId }: { tenantId: string }) {
  const users = await prisma.user.findMany({
    where: { tenantId },
    orderBy: { lastSeen: { sort: "desc", nulls: "last" } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      lastSeen: true,
      totalUsageMinutes: true,
    },
  });

  const roleBadge: Record<string, "default" | "destructive" | "secondary"> = {
    SUPER_ADMIN: "destructive",
    COUNSELOR: "default",
    STUDENT: "secondary",
    UNIVERSITY_ADMIN: "default",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          All Users — Last Seen
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead>Usage Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleBadge[u.role] || "secondary"}>
                    {u.role.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? "success" : "secondary"}>
                    {u.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatLastSeen(u.lastSeen)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Timer className="h-3 w-3" />
                    {formatUsageMinutes(u.totalUsageMinutes ?? 0)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
