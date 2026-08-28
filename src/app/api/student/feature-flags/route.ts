import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: { featureAccess: true },
  });

  // Features are enabled by default for students; an explicit `false` in
  // featureAccess means the counselor/admin has locked that specific feature.
  const access = studentProfile?.featureAccess;
  const flags = {
    collegeSearch: access?.collegeSearch ?? true,
    collegeFinder: access?.collegeFinder ?? true,
    aiOddsCalculator: access?.aiOddsCalculator ?? true,
    mockTests: access?.mockTests ?? true,
    scholarshipHub: access?.scholarshipHub ?? true,
    appointments: access?.appointments ?? true,
    webinars: access?.webinars ?? true,
    analytics: access?.analytics ?? true,
    careerLibrary: access?.careerLibrary ?? true,
  };

  return NextResponse.json({ flags });
}
