import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInstitutionsForCareer } from "@/lib/education-institutions/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ careerId: string }> }
) {
  try {
    const { careerId } = await params;
    const career = await prisma.career.findUnique({
      where: { id: careerId },
      select: { id: true, name: true, slug: true },
    });
    if (!career) {
      return NextResponse.json({ error: "Career not found" }, { status: 404 });
    }

    const { searchParams } = request.nextUrl;
    const state = (searchParams.get("state") || "").trim();
    const search = (searchParams.get("search") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20), 100);

    const result = await getInstitutionsForCareer(career.id, { state, search, page, limit });
    return NextResponse.json({ career: { id: career.id, name: career.name, slug: career.slug }, ...result });
  } catch (error) {
    console.error("Error fetching institutions for career:", error);
    return NextResponse.json({ error: "Failed to fetch institutions" }, { status: 500 });
  }
}
