import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chat = await prisma.chat.findUnique({ where: { id } });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (chat.counselorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { status, grantAccess } = await request.json();
  if (status && !["ACTIVE", "CLOSED"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const data: any = {};
  if (status) data.status = status;

  if (Object.keys(data).length > 0) {
    await prisma.chat.update({ where: { id }, data });
  }

  if (status === "ACTIVE") {
    await prisma.notification.create({
      data: {
        type: "SYSTEM",
        title: "Chat Accepted",
        message: "Your counselor has accepted your chat request",
        linkUrl: "/messages",
        recipientId: chat.studentId,
        senderId: session.user.id,
      },
    });
  }

  if (grantAccess) {
    const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: chat.studentId } });
    if (studentProfile) {
      await prisma.studentFeatureAccess.upsert({
        where: { studentProfileId: studentProfile.id },
        update: { appointments: true },
        create: { studentProfileId: studentProfile.id, appointments: true },
      });
    }
    await prisma.notification.create({
      data: {
        type: "SYSTEM",
        title: "Booking Access Granted",
        message: "Your counselor has granted you access to book appointments",
        linkUrl: "/appointments",
        recipientId: chat.studentId,
        senderId: session.user.id,
      },
    });
  }

  return NextResponse.json({ success: true });
}
