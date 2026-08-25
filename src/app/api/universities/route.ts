import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const country = searchParams.get("country") || "";
  const sortBy = searchParams.get("sortBy") || "qsRank";
  const sortOrder = searchParams.get("sortOrder") || "asc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500);

  const where: any = { tenantId: session.user.tenantId };
  if (search) where.name = { contains: search, mode: "insensitive" };
  if (country) where.country = country;

  const orderBy: any = {};
  if (["qsRank", "overallScore", "name", "country"].includes(sortBy)) {
    orderBy[sortBy] = sortOrder === "desc" ? "desc" : "asc";
  } else {
    orderBy.qsRank = "asc";
  }

  const [universities, total, countries] = await Promise.all([
    prisma.university.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.university.count({ where }),
    prisma.university.findMany({
      where: { tenantId: session.user.tenantId },
      select: { country: true },
      distinct: ["country"],
      orderBy: { country: "asc" },
    }),
  ]);

  return NextResponse.json({
    universities,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    countries: countries.map((c) => c.country),
  });
}
