import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveCareerPreferences, PrefsValidationError } from "@/lib/student/profile";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      dateOfBirth: true,
      mobile: true,
      gender: true,
      gradeLevel: true,
      studyLevel: true,
      exams: true,
      subjectsStudied: true,
      subjectsEnjoyed: true,
      activityInterests: true,
      nationality: true,
      state: true,
      hasEnglishResult: true,
      englishTestType: true,
      englishTestScore: true,
      englishProficiency: true,
      tuitionBudget: true,
      fundingSource: true,
      targetColleges: true,
      targetCountries: true,
      preferredCareer: true,
      prospectiveSessions: true,
      preferredIntake: true,
      preferredYear: true,
      highestEducation: true,
      averageGrade: true,
      careerPlanNotes: true,
      careerPrefsFilled: true,
    },
  });

  return NextResponse.json({ profile });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await saveCareerPreferences(session.user.id, body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PrefsValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Career preferences error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
