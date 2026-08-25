import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user;
  const isStudent = user.role === "STUDENT";

  const where = isStudent
    ? { userId: user.id }
    : { counselorId: user.id };

    const [appointments, counselorInfo] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { startTime: "desc" },
      include: {
        student: {
          select: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        counselor: {
          select: { firstName: true, lastName: true, email: true },
        },
        paymentProof: {
          select: { id: true, verified: true, fileName: true, expiresAt: true },
        },
      },
    }),
    isStudent
      ? prisma.studentProfile.findUnique({
          where: { userId: user.id },
          include: {
            counselor: {
              select: {
                user: { select: { firstName: true, lastName: true, email: true } },
                title: true,
                counsellingPrice: true,
                assessmentPrice: true,
                indiaPrice: true,
                internationalPrice: true,
                upiId: true,
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    appointments,
    counselor: counselorInfo?.counselor || null,
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students can book appointments" }, { status: 403 });
  }

  try {
    const { title, description, startTime, endTime, package: pkg, amount } = await request.json();
    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: "Title, startTime, and endTime are required" }, { status: 400 });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: { counselor: true },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    if (!studentProfile.counselor) {
      return NextResponse.json({ error: "No counselor assigned" }, { status: 400 });
    }

    // Server-side feature-flag enforcement: the client-side lock is cosmetic.
    const featureAccess = await prisma.studentFeatureAccess.findUnique({
      where: { studentProfileId: studentProfile.id },
    });
    if (!featureAccess?.appointments) {
      return NextResponse.json(
        { error: "Appointments are not enabled for your account. Contact your counselor." },
        { status: 403 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        title,
        package: pkg || null,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        amount: amount ? parseInt(amount) : null,
        studentId: studentProfile.id,
        counselorId: studentProfile.counselor.userId,
        userId: session.user.id,
        status: "PENDING",
      },
    });

    const notification = await prisma.notification.create({
      data: {
        type: "APPOINTMENT_SCHEDULED",
        title: "New Appointment Request",
        message: `${session.user.firstName} ${session.user.lastName} booked "${title}" on ${new Date(startTime).toLocaleDateString()}`,
        linkUrl: "/calendar",
        recipientId: studentProfile.counselor.userId,
        senderId: session.user.id,
      },
    });

    await redis.publish(
      `channel:notify:${studentProfile.counselor.userId}`,
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

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("Failed to create appointment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
