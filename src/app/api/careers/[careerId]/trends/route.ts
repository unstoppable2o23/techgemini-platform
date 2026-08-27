import { NextRequest, NextResponse } from "next/server";
import { getCareerTrends } from "@/lib/career-trends/service.ts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ careerId: string }> }
) {
  const { careerId } = await params;

  if (!careerId) {
    return NextResponse.json({ error: "careerId is required" }, { status: 400 });
  }

  try {
    const result = await getCareerTrends(careerId);
    if (!result.career) {
      return NextResponse.json({ error: "Career not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Career trend detail failed:", error);
    return NextResponse.json(
      { error: "Failed to load career trend detail" },
      { status: 500 }
    );
  }
}
