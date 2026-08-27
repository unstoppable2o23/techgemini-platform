import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCareerMatches } from "@/lib/career-matching/engine.ts";
import {
  buildPersonalizedTrending,
  getTrendsForCareers,
} from "@/lib/career-trends/service.ts";
import { SYSTEM_DERIVED_LIMITATIONS } from "@/lib/career-trends/config.ts";

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
  const viewParam = searchParams.get("view") || "foryou";
  const view: "foryou" | "trending" =
    viewParam === "trending" ? "trending" : "foryou";
  const category = searchParams.get("category") || null;
  const limit = parseInt(searchParams.get("limit") || "12", 10);

  try {
    const matchesResult = await getCareerMatches(session.user.id, {
      limit: isNaN(limit) ? 12 : Math.min(Math.max(limit, 1), 200),
    });

    const careerIds = matchesResult.matches.map((m) => m.careerId);
    const trendsMap = await getTrendsForCareers(careerIds);

    const built = buildPersonalizedTrending(
      matchesResult.matches,
      trendsMap,
      view
    );

    let items = built.items;
    if (category) {
      const cat = category.toLowerCase();
      items = items.filter(
        (i) => (i.career.category ?? "").toLowerCase() === cat
      );
    }

    return NextResponse.json({
      view,
      items,
      total: items.length,
      sourceType: items.some((i) => i.source) ? "SYSTEM_DERIVED" : null,
      limitations: [...SYSTEM_DERIVED_LIMITATIONS],
      disclaimer: matchesResult.disclaimer,
    });
  } catch (error) {
    console.error("Personalized trending failed:", error);
    return NextResponse.json(
      { error: "Failed to load personalized trends" },
      { status: 500 }
    );
  }
}
