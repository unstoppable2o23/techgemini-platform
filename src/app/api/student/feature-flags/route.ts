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

  const flags = studentProfile?.featureAccess || {
    collegeSearch: false,
    collegeFinder: false,
    aiOddsCalculator: false,
    mockTests: false,
    scholarshipHub: false,
    appointments: false,
    webinars: false,
    analytics: false,
    careerLibrary: false,
  };

  return NextResponse.json({ flags });
}
