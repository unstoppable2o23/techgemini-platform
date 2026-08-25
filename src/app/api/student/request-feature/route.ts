import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { featureName } = await request.json();
    if (!featureName) {
      return NextResponse.json({ error: "Feature name is required" }, { status: 400 });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        counselor: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (!studentProfile?.counselor) {
      return NextResponse.json({ error: "No counselor assigned" }, { status: 400 });
    }

    const counselorUser = studentProfile.counselor.user;

    const notification = await prisma.notification.create({
      data: {
        type: "FEATURE_REQUEST",
        title: "Feature Access Request",
        message: `${session.user.firstName} ${session.user.lastName} requested access to ${featureName}`,
        linkUrl: "/students",
        recipientId: counselorUser.id,
        senderId: session.user.id,
      },
    });

    const payload = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      linkUrl: notification.linkUrl,
      read: notification.read,
      createdAt: notification.createdAt.toISOString(),
    };

    await redis.publish(`channel:notify:${counselorUser.id}`, JSON.stringify(payload));

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to request feature:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
