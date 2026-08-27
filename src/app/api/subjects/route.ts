import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true },
    });
    return NextResponse.json({ subjects });
  } catch (error) {
    console.error("Subjects query failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
