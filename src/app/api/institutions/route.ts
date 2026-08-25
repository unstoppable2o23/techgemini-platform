import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = (searchParams.get("search") || "").trim();
  const type = (searchParams.get("type") || "").trim();
  const state = (searchParams.get("state") || "").trim();
  const district = (searchParams.get("district") || "").trim();
  const format = (searchParams.get("format") || "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10) || 50, MAX_LIMIT);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { aisheCode: { contains: search, mode: "insensitive" } },
      { district: { contains: search, mode: "insensitive" } },
    ];
  }
  if (type && type !== "All") where.type = type;
  if (state && state !== "All") where.state = state;
  if (district && district !== "All") where.district = district;

  if (format === "csv") {
    const rows = await prisma.indianInstitution.findMany({
      where,
      orderBy: [{ state: "asc" }, { name: "asc" }],
      take: 50000,
      select: {
        aisheCode: true,
        name: true,
        type: true,
        state: true,
        district: true,
        website: true,
        yearOfEstablishment: true,
        location: true,
        institutionType: true,
        management: true,
        universityName: true,
      },
    });
    const escape = (v: string | null | undefined) => {
      const s = (v || "").replace(/"/g, '""');
      return `"${s}"`;
    };
    const header = "AISHE Code,Name,Type,State,District,Website,Year of Establishment,Location,Institution Type,Management,University Name";
    const csv = [
      header,
      ...rows.map((r) =>
        [
          escape(r.aisheCode),
          escape(r.name),
          escape(r.type),
          escape(r.state),
          escape(r.district),
          escape(r.website),
          escape(r.yearOfEstablishment),
          escape(r.location),
          escape(r.institutionType),
          escape(r.management),
          escape(r.universityName),
        ].join(",")
      ),
    ].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="indian-institutions.csv"',
      },
    });
  }

  const [total, institutions] = await Promise.all([
    prisma.indianInstitution.count({ where }),
    prisma.indianInstitution.findMany({
      where,
      orderBy: [{ state: "asc" }, { name: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        aisheCode: true,
        name: true,
        type: true,
        state: true,
        district: true,
        website: true,
        yearOfEstablishment: true,
        location: true,
        institutionType: true,
        management: true,
        universityName: true,
      },
    }),
  ]);

  return NextResponse.json({
    institutions,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
