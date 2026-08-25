import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "UNIVERSITY_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as any;
      const name = String(row["Name"] || "").trim();
      if (!name) {
        errors.push(`Row ${i + 2}: Missing Name`);
        continue;
      }

      const existing = await prisma.university.findFirst({
        where: { name, tenantId: session.user.tenantId },
      });
      if (existing) {
        skipped++;
        continue;
      }

      try {
        await prisma.university.create({
          data: {
            tenantId: session.user.tenantId,
            name,
            country: String(row["Country"] || ""),
            qsRank: parseInt(row["QS World University Rankings"]) || null,
            overallScore: parseFloat(row["Overall SCORE"]) || null,
            academicRepScore: parseFloat(row["Academic Reputation SCORE"]) || null,
            employerRepScore: parseFloat(row["Employer Reputation SCORE"]) || null,
            facultyStudentScore: parseFloat(row["Faculty Student Ratio SCORE"]) || null,
            citationsScore: parseFloat(row["Citations per Faculty SCORE"]) || null,
            intlFacultyScore: parseFloat(row["International Faculty SCORE"]) || null,
            intlStudentScore: parseFloat(row["International Student SCORE"]) || null,
            employmentScore: parseFloat(row["Employment Outcomes SCORE"]) || null,
            sustainabilityScore: parseFloat(row["Sustainability SCORE"]) || null,
          },
        });
        imported++;
      } catch (err) {
        errors.push(`Row ${i + 2} (${name}): ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}
