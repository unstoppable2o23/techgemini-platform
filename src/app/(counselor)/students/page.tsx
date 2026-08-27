import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StudentManagementClient } from "./student-management-client";
import { redirect } from "next/navigation";

export default async function StudentManagementPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/auth/login");
  const user = session.user;
  if (user.role !== "COUNSELOR" && user.role !== "SUPER_ADMIN") redirect("/auth/login");

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      tenantId: user.tenantId,
      ...(user.role === "COUNSELOR"
        ? {
            studentProfile: {
              counselor: { userId: user.id },
            },
          }
        : {}),
    },
    include: {
      careerProfile: { select: { completeness: true } },
      _count: {
        select: { testAssignments: { where: { status: "COMPLETED" } } },
      },
      studentProfile: {
        include: {
          featureAccess: true,
          counselor: { include: { user: true } },
          _count: { select: { testResults: true, appointments: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const safeStudents = students.map((s) => {
    const { passwordHash: _ph, studentProfile, careerProfile, _count, ...rest } = s;
    const safeProfile = studentProfile
      ? {
          ...studentProfile,
          counselor: studentProfile.counselor
            ? {
                ...studentProfile.counselor,
                user: studentProfile.counselor.user
                  ? (() => {
                      const { passwordHash: _phu, ...userSafe } = studentProfile.counselor.user!;
                      return userSafe;
                    })()
                  : null,
              }
            : null,
        }
      : null;
    return {
      ...rest,
      studentProfile: safeProfile,
      assessmentCompleted: _count?.testAssignments ?? 0,
      assessmentTotal: 5,
      profileCompleteness: careerProfile?.completeness ?? null,
      preferredCareer: studentProfile?.preferredCareer ?? null,
    };
  });

  const total = safeStudents.length;
  const assessmentComplete = safeStudents.filter(
    (s) => (s.assessmentCompleted ?? 0) >= 5
  ).length;
  const profileWithData = safeStudents.filter(
    (s) => (s.profileCompleteness ?? 0) > 0
  ).length;
  const avgProfile = total
    ? Math.round(
        safeStudents.reduce((a, s) => a + (s.profileCompleteness ?? 0), 0) / total
      )
    : 0;
  const withCareer = safeStudents.filter((s) => s.preferredCareer).length;

  const stats = [
    { label: "Assigned students", value: total },
    { label: "Assessments complete", value: `${assessmentComplete}/${total}` },
    { label: "Profile started", value: `${profileWithData}/${total}` },
    { label: "Avg profile completeness", value: `${avgProfile}%` },
    { label: "With career interest", value: `${withCareer}/${total}` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>
      <StudentManagementClient students={safeStudents} />
    </div>
  );
}
