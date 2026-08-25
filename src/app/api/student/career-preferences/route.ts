import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const data: any = {
      targetColleges: body.targetColleges || [],
      targetCountries: body.targetCountries || [],
      preferredCareer: body.preferredCareer || null,
      prospectiveSessions: body.prospectiveSessions || [],
      studyLevel: body.studyLevel || null,
      exams: body.exams || [],
      nationality: body.nationality || null,
      state: body.state || null,
      hasEnglishResult: body.hasEnglishResult ?? false,
      englishTestType: body.englishTestType || null,
      englishTestScore: body.englishTestScore || null,
      englishProficiency: body.englishProficiency || null,
      tuitionBudget: body.tuitionBudget || null,
      fundingSource: body.fundingSource || null,
      preferredIntake: body.preferredIntake || null,
      preferredYear: body.preferredYear || null,
      highestEducation: body.highestEducation || null,
      averageGrade: body.averageGrade || null,
      careerPlanNotes: body.careerPlanNotes || null,
      careerPrefsFilled: true,
    };

    await prisma.studentProfile.update({
      where: { userId: session.user.id },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Career preferences error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}