import { NextRequest, NextResponse } from "next/server";
import { getTrends } from "@/lib/career-trends/service.ts";
import { isTrendType } from "@/lib/career-trends/types.ts";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const typeParam = searchParams.get("type") || undefined;
  const category = searchParams.get("category") || null;
  const region = searchParams.get("region") || null;
  const period = searchParams.get("period") || null;
  const limit = parseInt(searchParams.get("limit") || "12", 10);
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (typeParam && !isTrendType(typeParam)) {
    return NextResponse.json(
      { error: "Invalid type. Use trending, emerging, fast-growing, or future." },
      { status: 400 }
    );
  }

  try {
    const result = await getTrends({
      type: typeParam as "trending" | "emerging" | "fast-growing" | "future" | undefined,
      category,
      region,
      period,
      limit: isNaN(limit) ? 12 : limit,
      page: isNaN(page) ? 1 : page,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Career trends listing failed:", error);
    return NextResponse.json(
      { error: "Failed to load career trends" },
      { status: 500 }
    );
  }
}
