import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStudentTrendingCareers } from "@/lib/career-trends/personalization.ts";

/**
 * Phase 21 — Personalized "Trending for You" API.
 *
 * Returns careers with a separate TrendRelevanceScore. Does NOT modify
 * core career match scores or confidence. Uses education-stage, subjects,
 * interests, career family, and destination alignment.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Only students can view personalized trends" },
      { status: 403 }
    );
  }

  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get("limit") || "12", 10);
  const region = searchParams.get("region") || null;

  try {
    const result = await getStudentTrendingCareers(session.user.id, {
      limit: isNaN(limit) ? 12 : Math.min(Math.max(limit, 1), 20),
      region,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Personalized trending failed:", error);
    return NextResponse.json(
      { error: "Failed to load personalized trends" },
      { status: 500 }
    );
  }
}
