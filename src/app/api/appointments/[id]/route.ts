import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { status, meetLink } = await request.json();
    const validStatuses = ["CONFIRMED", "CANCELLED", "COMPLETED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        student: { select: { userId: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (appointment.counselorId !== session.user.id) {
      return NextResponse.json({ error: "Only the counselor can update this appointment" }, { status: 403 });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status, ...(meetLink ? { meetLink } : {}) },
    });

    const statusLabels: Record<string, string> = {
      CONFIRMED: "Confirmed",
      CANCELLED: "Cancelled",
      COMPLETED: "Completed",
    };

    const notification = await prisma.notification.create({
      data: {
        type: status === "CONFIRMED" ? "APPOINTMENT_SCHEDULED" : "APPOINTMENT_REMINDER",
        title: `Appointment ${statusLabels[status]}`,
        message: `Your appointment "${appointment.title}" has been ${statusLabels[status].toLowerCase()}${meetLink ? `. Join: ${meetLink}` : ""}`,
        linkUrl: "/appointments",
        recipientId: appointment.student.userId,
        senderId: session.user.id,
      },
    });

    await redis.publish(
      `channel:notify:${appointment.student.userId}`,
      JSON.stringify({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        linkUrl: notification.linkUrl,
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
      })
    );

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    console.error("Failed to update appointment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
