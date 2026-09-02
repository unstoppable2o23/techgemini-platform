import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCareerPrograms } from "@/lib/career-program";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ careerId: string }> }
) {
  try {
    const resolvedParams = await params;
    const careerId = resolvedParams.careerId;

    const career = await prisma.career.findUnique({
      where: { id: careerId },
      select: { id: true, name: true, slug: true, category: true },
    });

    if (!career) {
      return NextResponse.json(
        { error: "Career not found" },
        { status: 404 }
      );
    }

    const programs = await getCareerPrograms(careerId);

    return NextResponse.json({
      career: {
        id: career.id,
        name: career.name,
        slug: career.slug,
        category: career.category,
      },
      programs: programs ?? [],
      mapped: (programs ?? []).length > 0,
    });
  } catch (error) {
    console.error("Error fetching career programs:", error);
    return NextResponse.json(
      { error: "Failed to fetch career programs" },
      { status: 500 }
    );
  }
}