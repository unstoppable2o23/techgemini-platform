import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  const user = session.user;
  if (user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students have a career profile" }, { status: 403 });
  }

  const profile = await prisma.studentCareerProfile.findUnique({
    where: { studentId: user.id },
    include: {
      signals: {
        orderBy: [{ dimension: "asc" }, { score: "desc" }],
      },
    },
  });

  const assignments = await prisma.testAssignment.findMany({
    where: { studentId: user.id, kind: { in: ["stream", "ideal", "personality", "intelligences", "learning"] } },
    select: { kind: true, status: true, completedAt: true },
    orderBy: { createdAt: "desc" },
  });

  const completed = [
    ...new Set(assignments.filter((a) => a.status === "COMPLETED").map((a) => a.kind)),
  ];

  return NextResponse.json({
    profile: profile
      ? {
          completeness: profile.completeness,
          level: profile.level,
          profileVersion: profile.profileVersion,
          primaryInterests: profile.primaryInterests,
          strengths: profile.strengths,
          lastCalculatedAt: profile.lastCalculatedAt,
          metadata: profile.metadata,
        }
      : null,
    signals: profile?.signals ?? [],
    assessmentCoverage: completed,
    assignments: assignments.map((a) => ({
      kind: a.kind,
      status: a.status,
      completedAt: a.completedAt,
    })),
    lastUpdated: profile?.updatedAt ?? null,
  });
}
