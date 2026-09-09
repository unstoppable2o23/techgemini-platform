import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StudentManagementClient } from "./student-management-client";
import { redirect } from "next/navigation";
import { getCounselorCommandCenter } from "@/lib/counselor/command-center";

export default async function StudentManagementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/auth/login");
  const user = session.user;
  if (user.role !== "COUNSELOR" && user.role !== "SUPER_ADMIN") redirect("/auth/login");

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;

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

  const safeStudents: any[] = students.map((s) => {
    const { passwordHash: _ph, studentProfile, careerProfile, ...rest } = s;
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
      assessmentCompleted: 0,
      assessmentTotal: 0,
      profileCompleteness: careerProfile?.completeness ?? null,
      preferredCareer: studentProfile?.preferredCareer ?? null,
      targetCountry: studentProfile?.targetCountry ?? null,
    };
  });

  // Phase 27 — attention + roadmap filter fields (persisted rows, no engine).
  const commandCenter = await getCounselorCommandCenter({
    tenantId: user.tenantId,
    counselorUserId: user.role === "COUNSELOR" ? user.id : undefined,
  });
  const byUserId = new Map(commandCenter.students.map((r) => [r.userId, r]));
  for (const s of safeStudents) {
    const row = byUserId.get(s.id);
    if (!row) continue;
    s.attentionPrimary = row.primary;
    s.attentionStates = row.states;
    s.assessmentCompleted = row.assessmentCompleted;
    s.assessmentTotal = row.assessmentTotal;
    s.roadmapProgress = row.roadmapExists ? Math.round(row.roadmapProgress) : null;
    s.educationStage = row.educationStage;
    if (s.targetCountry == null) s.targetCountry = row.targetCountry;
  }

  const filterOpts = {
    attention: Array.from(
      new Set(safeStudents.map((s) => s.attentionPrimary).filter((x): x is string => Boolean(x)))
    ).sort(),
    countries: Array.from(
      new Set(safeStudents.map((s) => s.targetCountry).filter((x): x is string => Boolean(x)))
    ).sort(),
    stages: Array.from(
      new Set(safeStudents.map((s) => s.educationStage).filter((x): x is string => Boolean(x)))
    ).sort(),
  };

  const attentionF = one(sp.attention);
  const countryF = one(sp.country);
  const stageF = one(sp.stage);
  const roadmapF = one(sp.roadmap);

  const filteredStudents = safeStudents.filter((s) => {
    if (attentionF && s.attentionPrimary !== attentionF) return false;
    if (countryF && s.targetCountry !== countryF) return false;
    if (stageF && s.educationStage !== stageF) return false;
    if (roadmapF) {
      if (roadmapF === "none" && s.roadmapProgress !== null) return false;
      if (roadmapF === "in-progress" && !(s.roadmapProgress !== null && s.roadmapProgress > 0 && s.roadmapProgress < 100)) return false;
      if (roadmapF === "complete" && s.roadmapProgress !== 100) return false;
      if (roadmapF === "started" && !(s.roadmapProgress !== null && s.roadmapProgress > 0)) return false;
    }
    return true;
  });

  const total = safeStudents.length;
  const assessmentComplete = safeStudents.filter(
    (s) =>
      (s.assessmentTotal ?? 0) === 0 ||
      (s.assessmentCompleted ?? 0) >= (s.assessmentTotal ?? 0)
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
      <StudentManagementClient
        students={filteredStudents}
        filterOptions={filterOpts}
        filters={{
          attention: attentionF,
          country: countryF,
          stage: stageF,
          roadmap: roadmapF,
        }}
      />
    </div>
  );
}
