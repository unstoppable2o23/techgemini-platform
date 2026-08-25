import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AssignClient } from "./assign-client";

export default async function AssignTestsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  const user = session.user;
  if (user.role !== "COUNSELOR" && user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      tenantId: user.tenantId,
      isActive: true,
      ...(user.role === "COUNSELOR"
        ? { studentProfile: { counselor: { userId: user.id } } }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  const assignments = await prisma.testAssignment.findMany({
    where: {
      tenantId: user.tenantId,
      ...(user.role === "COUNSELOR"
        ? { student: { studentProfile: { counselor: { userId: user.id } } } }
        : {}),
    },
    include: {
      student: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const safeAssignments = assignments.map((a) => ({
    id: a.id,
    kind: a.kind as "stream" | "ideal",
    token: a.token,
    status: a.status as "ASSIGNED" | "COMPLETED",
    createdAt: a.createdAt.toISOString(),
    completedAt: a.completedAt ? a.completedAt.toISOString() : null,
    hasResult: Boolean(a.result),
    studentName: `${a.student.firstName} ${a.student.lastName}`,
    studentEmail: a.student.email,
  }));

  return <AssignClient students={students} initialAssignments={safeAssignments} />;
}
