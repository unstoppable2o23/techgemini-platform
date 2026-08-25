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
    const { passwordHash: _ph, studentProfile, ...rest } = s;
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
    return { ...rest, studentProfile: safeProfile };
  });

  return <StudentManagementClient students={safeStudents} />;
}
