import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import { getStudent360 } from "@/lib/counselor/student360.ts";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const auth = await loadAuthorizedStudent(id, session);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 404 ? "Student not found" : "Forbidden" },
      { status: auth.status }
    );
  }

  const data = await getStudent360(id, {
    counselorUserId:
      session?.user?.role === "COUNSELOR" ? session.user.id : undefined,
  });
  if (!data) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  return NextResponse.json({ student360: data });
}
