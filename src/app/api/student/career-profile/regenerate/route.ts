import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateStudentCareerProfile } from "@/lib/career-profile/generate";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;
  if (user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await generateStudentCareerProfile(user.id);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Profile regeneration failed:", error);
    return NextResponse.json(
      { error: "Failed to regenerate profile" },
      { status: 500 }
    );
  }
}