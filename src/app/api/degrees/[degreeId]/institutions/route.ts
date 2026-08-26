import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInstitutionsForDegrees } from "@/lib/education-institutions/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ degreeId: string }> }
) {
  try {
    const { degreeId } = await params;
    const degree = await prisma.degree.findUnique({
      where: { id: degreeId },
      select: { id: true, name: true, slug: true },
    });
    if (!degree) {
      return NextResponse.json({ error: "Degree not found" }, { status: 404 });
    }

    const { searchParams } = request.nextUrl;
    const state = (searchParams.get("state") || "").trim();
    const search = (searchParams.get("search") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20), 100);

    const result = await getInstitutionsForDegrees([degree.id], { state, search, page, limit });
    return NextResponse.json({ degree: { id: degree.id, name: degree.name, slug: degree.slug }, ...result });
  } catch (error) {
    console.error("Error fetching institutions for degree:", error);
    return NextResponse.json({ error: "Failed to fetch institutions" }, { status: 500 });
  }
}
