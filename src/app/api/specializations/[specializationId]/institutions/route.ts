import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInstitutionsForSpecialization } from "@/lib/education-institutions/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ specializationId: string }> }
) {
  try {
    const { specializationId } = await params;
    const spec = await prisma.specialization.findUnique({
      where: { id: specializationId },
      select: { id: true, name: true, slug: true, degreeId: true },
    });
    if (!spec) {
      return NextResponse.json({ error: "Specialization not found" }, { status: 404 });
    }

    const { searchParams } = request.nextUrl;
    const state = (searchParams.get("state") || "").trim();
    const search = (searchParams.get("search") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20), 100);

    const result = await getInstitutionsForSpecialization(spec.id, { state, search, page, limit });
    return NextResponse.json({
      specialization: { id: spec.id, name: spec.name, slug: spec.slug, degreeId: spec.degreeId },
      ...result,
    });
  } catch (error) {
    console.error("Error fetching institutions for specialization:", error);
    return NextResponse.json({ error: "Failed to fetch institutions" }, { status: 500 });
  }
}
