import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ degreeId: string }> }
) {
  try {
    const resolvedParams = await params;
    const degreeId = resolvedParams.degreeId;

    const degree = await prisma.degree.findUnique({
      where: { id: degreeId },
      include: {
        specializations: {
          where: { isPrimary: true },
          orderBy: { name: "asc" },
        },
        careerEducationPathways: {
          where: { type: "DEGREE_PATHWAY" },
          include: {
            career: {
              select: { id: true, name: true, slug: true, shortDescription: true },
            },
          },
        },
      },
    });

    if (!degree) {
      return NextResponse.json(
        { error: "Degree not found" },
        { status: 404 }
      );
    }

    const careers = degree.careerEducationPathways.map(p => ({
      id: p.career.id,
      name: p.career.name,
      slug: p.career.slug,
      shortDescription: p.career.shortDescription,
      priority: p.priority,
      notes: p.notes,
    }));

    return NextResponse.json({
      degree: {
        id: degree.id,
        name: degree.name,
        slug: degree.slug,
        educationLevel: degree.educationLevel,
        duration: degree.duration,
        eligibility: degree.eligibility,
        category: degree.category,
        description: degree.description,
        specializations: degree.specializations.map(s => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
        })),
        careers,
      },
    });
  } catch (error) {
    console.error("Error fetching degree:", error);
    return NextResponse.json(
      { error: "Failed to fetch degree" },
      { status: 500 }
    );
  }
}