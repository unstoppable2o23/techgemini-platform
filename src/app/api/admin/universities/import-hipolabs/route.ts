import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "UNIVERSITY_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const fs = await import("fs");
    const path = await import("path");
    let qsData: any[] = [];
    try {
      const qsPath = path.join(process.cwd(), "prisma", "universities-seed.json");
      if (fs.existsSync(qsPath)) {
        qsData = JSON.parse(fs.readFileSync(qsPath, "utf-8"));
      }
    } catch { /* optional */ }

    const qsMap = new Map<string, any>();
    for (const u of qsData) {
      const key = u.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!qsMap.has(key) || (u.qsRank && u.qsRank < (qsMap.get(key)?.qsRank || 9999))) {
        qsMap.set(key, u);
      }
    }

    const res = await fetch("http://universities.hipolabs.com/search", {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `API returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid API response" }, { status: 502 });
    }

    const apiNames = new Set<string>();
    let imported = 0;
    let updated = 0;
    let deleted = 0;

    for (const uni of data) {
      const name = String(uni.name || "").trim();
      if (!name) continue;
      apiNames.add(name);

      const qsKey = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const qsMatch = qsMap.get(qsKey);

      const record = {
        name,
        country: uni.country || "",
        region: uni["state-province"] || null,
        domains: uni.domains || [],
        webPages: uni.web_pages || [],
        qsRank: qsMatch?.qsRank || null,
        overallScore: qsMatch?.overallScore || null,
        academicRepScore: qsMatch?.academicRepScore || null,
        employerRepScore: qsMatch?.employerRepScore || null,
        facultyStudentScore: qsMatch?.facultyStudentScore || null,
        citationsScore: qsMatch?.citationsScore || null,
        intlFacultyScore: qsMatch?.intlFacultyScore || null,
        intlStudentScore: qsMatch?.intlStudentScore || null,
        employmentScore: qsMatch?.employmentScore || null,
        sustainabilityScore: qsMatch?.sustainabilityScore || null,
      };

      const existing = await prisma.university.findFirst({
        where: { name, tenantId: session.user.tenantId },
      });

      if (existing) {
        await prisma.university.update({ where: { id: existing.id }, data: record });
        updated++;
      } else {
        await prisma.university.create({
          data: { tenantId: session.user.tenantId, ...record },
        });
        imported++;
      }
    }

    // Delete universities that no longer exist in the API
    const toDelete = await prisma.university.findMany({
      where: {
        tenantId: session.user.tenantId,
        NOT: { name: { in: Array.from(apiNames) } },
      },
      select: { id: true },
    });

    if (toDelete.length > 0) {
      await prisma.university.deleteMany({
        where: { id: { in: toDelete.map((u) => u.id) } },
      });
      deleted = toDelete.length;
    }

    return NextResponse.json({
      success: true,
      total: data.length,
      imported,
      updated,
      deleted,
      message: `Total: ${data.length} | Imported: ${imported} | Updated: ${updated} | Removed: ${deleted}`,
    });
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
