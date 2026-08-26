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
      select: { id: true, name: true, slug: true },
    });

    if (!degree) {
      return NextResponse.json(
        { error: "Degree not found" },
        { status: 404 }
      );
    }

    const pathways = await prisma.careerEducationPathway.findMany({
      where: { degreeId, type: "DEGREE_PATHWAY" },
      include: {
        career: {
          select: { 
            id: true, 
            name: true, 
            slug: true, 
            shortDescription: true,
            category: true,
            demandLevel: true,
            salaryEntry: true,
            salarySenior: true,
          },
        },
        specialization: true,
      },
      orderBy: [
        { priority: "asc" },
        { career: { name: "asc" } },
      ],
    });

    const careersByPriority = {
      primary: pathways
        .filter(p => p.priority === "PRIMARY")
        .map(p => ({
          id: p.career.id,
          name: p.career.name,
          slug: p.career.slug,
          shortDescription: p.career.shortDescription,
          category: p.career.category,
          demandLevel: p.career.demandLevel,
          salaryEntry: p.career.salaryEntry,
          salarySenior: p.career.salarySenior,
          specialization: p.specialization ? {
            id: p.specialization.id,
            name: p.specialization.name,
            slug: p.specialization.slug,
          } : null,
        })),
      alternative: pathways
        .filter(p => p.priority === "ALTERNATIVE")
        .map(p => ({
          id: p.career.id,
          name: p.career.name,
          slug: p.career.slug,
          shortDescription: p.career.shortDescription,
          category: p.career.category,
          demandLevel: p.career.demandLevel,
          salaryEntry: p.career.salaryEntry,
          salarySenior: p.career.salarySenior,
          specialization: p.specialization ? {
            id: p.specialization.id,
            name: p.specialization.name,
            slug: p.specialization.slug,
          } : null,
        })),
      optional: pathways
        .filter(p => p.priority === "OPTIONAL")
        .map(p => ({
          id: p.career.id,
          name: p.career.name,
          slug: p.career.slug,
          shortDescription: p.career.shortDescription,
          category: p.career.category,
          demandLevel: p.career.demandLevel,
          salaryEntry: p.career.salaryEntry,
          salarySenior: p.career.salarySenior,
          specialization: p.specialization ? {
            id: p.specialization.id,
            name: p.specialization.name,
            slug: p.specialization.slug,
          } : null,
        })),
    };

    return NextResponse.json({
      degree: {
        id: degree.id,
        name: degree.name,
        slug: degree.slug,
      },
      careers: careersByPriority,
    });
  } catch (error) {
    console.error("Error fetching degree careers:", error);
    return NextResponse.json(
      { error: "Failed to fetch degree careers" },
      { status: 500 }
    );
  }
}