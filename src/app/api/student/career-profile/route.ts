import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALL_KINDS = ["stream", "ideal", "personality", "intelligences", "learning"];

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;
  if (user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Only students have a career profile" },
      { status: 403 }
    );
  }

  const profile = await prisma.studentCareerProfile.findUnique({
    where: { studentId: session.user.id },
    include: {
      signals: {
        orderBy: [{ dimension: "asc" }, { score: "desc" }],
      },
    },
  });

  const assignments = await prisma.testAssignment.findMany({
    where: { studentId: session.user.id },
    select: { kind: true, status: true, completedAt: true },
    orderBy: { createdAt: "desc" },
  });

  const completedKinds = [
    ...new Set(
      assignments.filter((a) => a.status === "COMPLETED").map((a) => a.kind)
    ),
  ];

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      preferredCareer: true,
      studyLevel: true,
      gradeLevel: true,
      highestEducation: true,
      averageGrade: true,
      targetCountry: true,
      state: true,
      careerPlanNotes: true,
      tuitionBudget: true,
      exams: true,
    },
  });

  return NextResponse.json({
    profile: profile
      ? {
          completeness: profile.completeness,
          assessmentCompleteness: profile.assessmentCompleteness,
          level: profile.level,
          profileVersion: profile.profileVersion,
          primaryInterests: profile.primaryInterests,
          strengths: profile.strengths,
          lastCalculatedAt: profile.lastCalculatedAt,
          metadata: profile.metadata,
        }
      : null,
    signals: (profile?.signals ?? []).map((s) => ({
      dimension: s.dimension,
      value: s.value,
      score: s.score,
      sourceType: s.sourceType,
      sourceAssessment: s.sourceAssessment,
      sourceVersion: s.sourceVersion,
      confidence: s.confidence,
    })),
    assessmentCoverage: completedKinds,
    assessmentCompleteness: profile?.assessmentCompleteness ?? 0,
    studentCareerInputs: studentProfile,
    assignments: assignments.map((a) => ({
      kind: a.kind,
      status: a.status,
      completedAt: a.completedAt,
    })),
    lastUpdated: profile?.updatedAt ?? null,
  });
}