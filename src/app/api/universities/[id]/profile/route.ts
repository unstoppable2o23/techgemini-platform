import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUniversityProfile } from "@/lib/university-profile/profile.ts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const dataset = searchParams.get("dataset") === "global" ? "global" : "indian";
  const careerId = searchParams.get("careerId") || undefined;
  const degreeId = searchParams.get("degreeId") || undefined;
  const specializationId = searchParams.get("specializationId") || undefined;

  // Bounded program pagination
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50", 10)), 100);

  // Personalized "course connects to you" context is only produced for the
  // authenticated student themselves — never derived from a client-supplied id.
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await getUniversityProfile(id, dataset, { studentId: session.user.id, careerId, degreeId, specializationId });
    if (!profile) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    // Paginate programs
    const allPrograms = profile.programs.all;
    const totalPrograms = allPrograms.length;
    const totalPages = Math.max(1, Math.ceil(totalPrograms / limit));
    const paginated = allPrograms.slice((page - 1) * limit, page * limit);
    const byDegreePaginated: Record<string, typeof paginated> = {};
    for (const prog of paginated) {
      const key = prog.degreeName || "Other";
      if (!byDegreePaginated[key]) byDegreePaginated[key] = [];
      byDegreePaginated[key].push(prog);
    }

    // Explicit absence markers
    const response = {
      identity: {
        ...profile.identity,
        // Explicit "Not available" for missing fields
        state: profile.identity.state || "Not available",
        district: profile.identity.district || "Not available",
        city: profile.identity.city || "Not available",
        type: profile.identity.type || "Not available",
        institutionType: profile.identity.institutionType || "Not available",
        management: profile.identity.management || "Not available",
        website: profile.identity.website || "Not available",
        qsRank: profile.identity.qsRank ?? "Not available",
      },
      programs: {
        byDegree: byDegreePaginated,
        all: paginated,
        total: totalPrograms,
        verifiedCount: profile.programs.verifiedCount,
        hasVerified: profile.programs.hasVerified,
        page,
        totalPages,
        limit,
      },
      freshness: profile.freshness,
      studentContext: profile.studentContext || null,
      hasPrograms: profile.hasPrograms,
      hasVerifiedPrograms: profile.hasVerifiedPrograms,
      isEmpty: profile.isEmpty,
      // Future-proofing: clean separation
      _future: {
        fitTiers: null, // Phase 20 will populate
        comparison: null, // Phase 21 will consume
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("University profile failed:", error);
    return NextResponse.json({ error: "Failed to load university profile" }, { status: 500 });
  }
}
