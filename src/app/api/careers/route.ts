import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "name";
  const sortOrder = (searchParams.get("sortOrder") || "asc") === "desc" ? "desc" : "asc";
  const category = searchParams.get("category") || "";
  const subcategory = searchParams.get("subcategory") || "";
  const industry = searchParams.get("industry") || "";
  const skill = searchParams.get("skill") || "";
  const emerging = searchParams.get("emerging");

  const where: Record<string, unknown> = { isActive: true };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" as const } },
      { title: { contains: search, mode: "insensitive" as const } },
      { shortDescription: { contains: search, mode: "insensitive" as const } },
      { technicalSkills: { has: search } },
    ];
  }
  if (category) where.category = category;
  if (subcategory) where.subcategory = subcategory;
  if (industry) where.topIndustries = { has: industry };
  if (skill) {
    where.OR = [
      ...(Array.isArray(where.OR) ? where.OR : []),
      { technicalSkills: { has: skill } },
      { softSkills: { has: skill } },
    ];
  }
  if (emerging === "true") where.isEmerging = true;

  const orderBy =
    sortBy === "demand"
      ? { demandLevel: sortOrder as "asc" | "desc" }
      : sortBy === "category"
        ? [{ category: sortOrder as "asc" | "desc" }, { name: "asc" as const }]
        : { name: sortOrder as "asc" | "desc" };

  const careers = await prisma.career.findMany({
    where,
    orderBy,
    select: {
      id: true,
      name: true,
      slug: true,
      title: true,
      category: true,
      subcategory: true,
      shortDescription: true,
      demandLevel: true,
      jobGrowth: true,
      salaryEntry: true,
      salarySenior: true,
      topIndustries: true,
      isEmerging: true,
      minStudyLevel: true,
    },
  });

  const categories = await prisma.career.findMany({
    where: { isActive: true, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return NextResponse.json({
    careers,
    total: careers.length,
    categories: categories.map((c) => c.category).filter(Boolean),
  });
}
