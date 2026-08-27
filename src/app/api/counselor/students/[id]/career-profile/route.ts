import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const auth = await loadAuthorizedStudent(id, session);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 404 ? "Student not found" : "Forbidden" },
      { status: auth.status }
    );
  }

  const profile = await prisma.studentCareerProfile.findUnique({
    where: { studentId: id },
    include: { signals: true },
  });

  if (!profile) {
    return NextResponse.json({ careerProfile: null, signals: [] });
  }

  return NextResponse.json({
    careerProfile: {
      id: profile.id,
      profileVersion: profile.profileVersion,
      completeness: profile.completeness,
      assessmentCompleteness: profile.assessmentCompleteness,
      level: profile.level,
      primaryInterests: profile.primaryInterests,
      strengths: profile.strengths,
      metadata: profile.metadata,
      lastCalculatedAt: profile.lastCalculatedAt,
    },
    signals: profile.signals,
  });
}
