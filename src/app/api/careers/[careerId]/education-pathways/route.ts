import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ careerId: string }> }
) {
  try {
    const resolvedParams = await params;
    const careerId = resolvedParams.careerId;

    const career = await prisma.career.findUnique({
      where: { id: careerId },
      select: { id: true, name: true, slug: true },
    });

    if (!career) {
      return NextResponse.json(
        { error: "Career not found" },
        { status: 404 }
      );
    }

    const pathways = await prisma.careerEducationPathway.findMany({
      where: { careerId, type: "DEGREE_PATHWAY" },
      include: {
        degree: true,
        specialization: true,
      },
      orderBy: [
        { priority: "asc" },
        { degree: { name: "asc" } },
      ],
    });

    const subjectLinks = await prisma.careerEducationPathway.findMany({
      where: { careerId, type: "SUBJECT_LINK" },
      include: {
        subject: true,
      },
      orderBy: { subject: { name: "asc" } },
    });

    const primaryPathways = pathways.filter(p => p.priority === "PRIMARY");
    const alternativePathways = pathways.filter(p => p.priority === "ALTERNATIVE");
    const optionalPathways = pathways.filter(p => p.priority === "OPTIONAL");

    return NextResponse.json({
      career: {
        id: career.id,
        name: career.name,
        slug: career.slug,
      },
      educationPathways: {
        primary: primaryPathways.map(p => ({
          id: p.id,
          priority: p.priority,
          notes: p.notes,
          degree: p.degree ? {
            id: p.degree.id,
            name: p.degree.name,
            slug: p.degree.slug,
            educationLevel: p.degree.educationLevel,
            duration: p.degree.duration,
            eligibility: p.degree.eligibility,
            category: p.degree.category,
          } : null,
          specialization: p.specialization ? {
            id: p.specialization.id,
            name: p.specialization.name,
            slug: p.specialization.slug,
          } : null,
        })),
        alternative: alternativePathways.map(p => ({
          id: p.id,
          priority: p.priority,
          notes: p.notes,
          degree: p.degree ? {
            id: p.degree.id,
            name: p.degree.name,
            slug: p.degree.slug,
            educationLevel: p.degree.educationLevel,
            duration: p.degree.duration,
            eligibility: p.degree.eligibility,
            category: p.degree.category,
          } : null,
          specialization: p.specialization ? {
            id: p.specialization.id,
            name: p.specialization.name,
            slug: p.specialization.slug,
          } : null,
        })),
        optional: optionalPathways.map(p => ({
          id: p.id,
          priority: p.priority,
          notes: p.notes,
          degree: p.degree ? {
            id: p.degree.id,
            name: p.degree.name,
            slug: p.degree.slug,
            educationLevel: p.degree.educationLevel,
            duration: p.degree.duration,
            eligibility: p.degree.eligibility,
            category: p.degree.category,
          } : null,
          specialization: p.specialization ? {
            id: p.specialization.id,
            name: p.specialization.name,
            slug: p.specialization.slug,
          } : null,
        })),
      },
      recommendedSubjects: subjectLinks.map(sl => ({
        id: sl.subject?.id,
        name: sl.subject?.name,
        slug: sl.subject?.slug,
        category: sl.subject?.category,
      })).filter(s => s.id),
    });
  } catch (error) {
    console.error("Error fetching education pathways:", error);
    return NextResponse.json(
      { error: "Failed to fetch education pathways" },
      { status: 500 }
    );
  }
}