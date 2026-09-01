import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCareerMatchDetail, sanitizeCareerMatch } from "@/lib/career-matching/engine";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ careerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;
  if (user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Only students can view career matches" },
      { status: 403 }
    );
  }

  const { careerId } = await params;

  try {
    const match = await getCareerMatchDetail(user.id, careerId);
    if (!match) {
      return NextResponse.json(
        { error: "Career match not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ match: sanitizeCareerMatch(match) });
  } catch (error) {
    console.error("Career match detail failed:", error);
    return NextResponse.json(
      { error: "Failed to get career match detail" },
      { status: 500 }
    );
  }
}
