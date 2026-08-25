import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "name";
  const sortOrder = (searchParams.get("sortOrder") || "asc") === "desc" ? "desc" : "asc";

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { title: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const careers = await prisma.career.findMany({
    where,
    orderBy: sortBy === "demand" ? { demandLevel: sortOrder } : { name: sortOrder },
    select: {
      id: true,
      name: true,
      slug: true,
      title: true,
      demandLevel: true,
      jobGrowth: true,
      salaryEntry: true,
      salarySenior: true,
      topIndustries: true,
    },
  });

  return NextResponse.json({ careers, total: careers.length });
}
