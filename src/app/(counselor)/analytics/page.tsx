import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  CalendarCheck,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";
import { formatUsageMinutes } from "@/lib/format-utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/auth/login");
  if (session.user.role !== "COUNSELOR" && session.user.role !== "SUPER_ADMIN") {
    redirect("/auth/login");
  }

  const user = session.user;
  const tenantId = user.tenantId;

  const totalStudents = await prisma.studentProfile.count({
    where: { user: { tenantId } },
  });

  const activeStudents = await prisma.studentProfile.count({
    where: {
      user: { tenantId, isActive: true },
      status: { not: "OFFLINE" as any },
    },
  });

  const totalTests = await prisma.test.count({
    where: { tenantId },
  });

  const completedResults = await prisma.testResult.count({
    where: { test: { tenantId } },
  });

  const averageScore = await prisma.testResult.aggregate({
    _avg: { percentage: true },
    where: { test: { tenantId } },
  });

  const totalAppointments = await prisma.appointment.count({
    where: { counselorId: user.id },
  });

  const pendingAppointments = await prisma.appointment.count({
    where: { counselorId: user.id, status: "PENDING" },
  });

  const completedAppointments = await prisma.appointment.count({
    where: { counselorId: user.id, status: "COMPLETED" },
  });

  // Total usage minutes across all tenant users
  const usageAgg = await prisma.user.aggregate({
    _sum: { totalUsageMinutes: true },
    where: { tenantId },
  });
  const totalUsageMinutes = usageAgg._sum.totalUsageMinutes ?? 0;

  const avgUsagePerStudent = totalStudents > 0
    ? Math.round(totalUsageMinutes / totalStudents)
    : 0;

  // Daily usage for last 7 days, grouped by role
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const dailyUsageRaw = await prisma.dailyUsage.findMany({
    where: {
      user: { tenantId },
      date: { gte: sevenDaysAgo },
    },
    include: {
      user: { select: { role: true } },
    },
    orderBy: { date: "asc" },
  });

  // Aggregate daily usage by date and role
  const dailyMap = new Map<string, { student: number; counselor: number }>();
  for (const entry of dailyUsageRaw) {
    const key = entry.date.toISOString().slice(0, 10);
    if (!dailyMap.has(key)) {
      dailyMap.set(key, { student: 0, counselor: 0 });
    }
    const row = dailyMap.get(key)!;
    if (entry.user.role === "STUDENT") {
      row.student += entry.totalMinutes;
    } else {
      row.counselor += entry.totalMinutes;
    }
  }

  const dailyData = Array.from(dailyMap.entries())
    .map(([date, val]) => ({ date, ...val }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const featureAccesses = await prisma.studentFeatureAccess.findMany({
    where: { studentProfile: { user: { tenantId } } },
  });

  const featureCounts = {
    aiOddsCalculator: featureAccesses.filter((f) => f.aiOddsCalculator).length,
    collegeFinder: featureAccesses.filter((f) => f.collegeFinder).length,
    mockTests: featureAccesses.filter((f) => f.mockTests).length,
    scholarshipHub: featureAccesses.filter((f) => f.scholarshipHub).length,
    appointments: featureAccesses.filter((f) => f.appointments).length,
  };

  const recentResults = await prisma.testResult.findMany({
    where: { test: { tenantId } },
    orderBy: { submittedAt: "desc" },
    take: 10,
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
      test: { select: { title: true } },
    },
  });

  const maxDaily = Math.max(
    ...dailyData.map((d) => d.student + d.counselor),
    1
  );

  const stats = [
    { label: "Total Students", value: totalStudents, icon: Users },
    { label: "Active Now", value: activeStudents, icon: Activity },
    { label: "Tests Created", value: totalTests, icon: ClipboardCheck },
    { label: "Tests Completed", value: completedResults, icon: TrendingUp },
    { label: "Avg Score", value: averageScore._avg.percentage ? `${averageScore._avg.percentage.toFixed(1)}%` : "—", icon: GraduationCap },
    { label: "Appointments", value: totalAppointments, icon: CalendarCheck },
  ];

  const usageStats = [
    { label: "Total Platform Usage", value: formatUsageMinutes(totalUsageMinutes), icon: Clock, hint: "Across all users" },
    { label: "Avg Usage / Student", value: formatUsageMinutes(avgUsagePerStudent), icon: BarChart3, hint: "Per student" },
  ];

  return (
    <div className="space-y-6 p-6 pt-20 max-w-6xl mx-auto">
      <PageHeader
        icon={TrendingUp}
        title="Analytics"
        description="Performance metrics and platform insights"
        eyebrow="Counselor"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} title={s.label} value={s.value} icon={s.icon} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {usageStats.map((s) => (
          <StatCard key={s.label} title={s.label} value={s.value} icon={s.icon} hint={s.hint} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
              <BarChart3 className="h-4 w-4" />
            </span>
            Daily Platform Usage (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No usage data yet. Usage tracking starts after students log in.</p>
          ) : (
            <div className="space-y-3">
              {dailyData.map((d) => {
                const total = d.student + d.counselor;
                const studentPct = maxDaily > 0 ? (d.student / maxDaily) * 100 : 0;
                const counselorPct = maxDaily > 0 ? (d.counselor / maxDaily) * 100 : 0;
                return (
                  <div key={d.date}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatUsageMinutes(total)}
                      </span>
                    </div>
                    <div className="h-6 bg-muted rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-blue-500 rounded-l-full transition-all"
                        style={{ width: `${studentPct}%` }}
                        title={`Students: ${formatUsageMinutes(d.student)}`}
                      />
                      <div
                        className="h-full bg-orange-400 rounded-r-full transition-all"
                        style={{ width: `${counselorPct}%` }}
                        title={`Counselors: ${formatUsageMinutes(d.counselor)}`}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-xs text-blue-600">Students: {formatUsageMinutes(d.student)}</span>
                      <span className="text-xs text-orange-600">Counselors: {formatUsageMinutes(d.counselor)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
              <Users className="h-4 w-4" />
            </span>
            Feature Usage
          </CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "AI Odds Calculator", key: "aiOddsCalculator" as const },
                { label: "College Finder", key: "collegeFinder" as const },
                { label: "Mock Tests", key: "mockTests" as const },
                { label: "Scholarship Hub", key: "scholarshipHub" as const },
                { label: "Appointments", key: "appointments" as const },
              ].map((f) => {
                const count = featureCounts[f.key];
                const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
                return (
                  <div key={f.key} className="flex items-center justify-between">
                    <span className="text-sm">{f.label}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium w-10 text-right">{count}/{totalStudents}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
              <CalendarCheck className="h-4 w-4" />
            </span>
            Appointment Status
          </CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <span className="text-sm font-bold text-amber-600">{pendingAppointments}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
                <span className="text-sm font-bold text-green-600">{completedAppointments}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Total</span>
                </div>
                <span className="text-sm font-bold text-gray-600">{totalAppointments}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
            <ClipboardCheck className="h-4 w-4" />
          </span>
          Recent Test Results
        </CardTitle></CardHeader>
        <CardContent>
          {recentResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No test results yet.</p>
          ) : (
            <div className="space-y-2">
              {recentResults.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <span className="text-sm font-medium">
                      {r.student.user.firstName} {r.student.user.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">{r.test.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${r.percentage >= 80 ? "bg-green-500" : r.percentage >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${r.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold w-10 text-right">{r.percentage.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
