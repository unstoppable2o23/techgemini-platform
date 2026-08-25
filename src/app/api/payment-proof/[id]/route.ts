import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const proof = await prisma.paymentProof.findUnique({
    where: { id },
    include: { appointment: { select: { counselorId: true, userId: true } } },
  });

  if (!proof) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCounselor = proof.appointment.counselorId === session.user.id;
  const isStudent = proof.appointment.userId === session.user.id;
  if (!isCounselor && !isStudent) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  return NextResponse.json({ proof });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const proof = await prisma.paymentProof.findUnique({
    where: { id },
    include: { appointment: true },
  });

  if (!proof) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (proof.appointment.counselorId !== session.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { verified } = await request.json();
  if (typeof verified !== "boolean") return NextResponse.json({ error: "verified must be boolean" }, { status: 400 });

  const updated = await prisma.paymentProof.update({
    where: { id },
    data: { verified },
  });

  if (verified) {
    await prisma.appointment.update({
      where: { id: proof.appointmentId },
      data: { status: "CONFIRMED" },
    });
  }

  return NextResponse.json({ proof: updated });
}
