import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CareerProfileClient } from "./career-profile-client";

export default async function CareerProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: { featureAccess: true },
  });

  const profile = await prisma.studentCareerProfile.findUnique({
    where: { studentId: session.user.id },
    include: { signals: { orderBy: [{ dimension: "asc" }, { score: "desc" }] } },
  });

  const assignments = await prisma.testAssignment.findMany({
    where: { studentId: session.user.id },
    select: { kind: true, status: true, completedAt: true },
    orderBy: { createdAt: "desc" },
  });

  const completedKinds = [
    ...new Set(assignments.filter((a) => a.status === "COMPLETED").map((a) => a.kind)),
  ];

  return (
    <CareerProfileClient
      profile={
        profile
          ? {
              completeness: profile.completeness,
              level: profile.level,
              primaryInterests: profile.primaryInterests,
              strengths: profile.strengths,
              lastCalculatedAt: profile.lastCalculatedAt.toISOString(),
              signals: profile.signals.map((s) => ({
                dimension: s.dimension,
                value: s.value,
                score: s.score,
                confidence: s.confidence,
              })),
            }
          : null
      }
      completedKinds={completedKinds}
    />
  );
}
