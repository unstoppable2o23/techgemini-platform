import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { recipientId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      sender: {
        select: {
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return NextResponse.json({ notifications });
}

export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { recipientId: session.user.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const limited = await rateLimit(`notifications:${session.user.id}`, 30, 60);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many notifications. Please slow down." },
        { status: 429 }
      );
    }

    const { type, title, message, linkUrl, recipientId } = await request.json();

    if (!type || !title || !message || !recipientId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const isStaff =
      session.user.role === "COUNSELOR" ||
      session.user.role === "SUPER_ADMIN" ||
      session.user.role === "UNIVERSITY_ADMIN";

    // Students may only notify themselves; only staff may notify others,
    // and only within their own tenant.
    if (!isStaff && recipientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, tenantId: true },
    });
    if (!recipient) return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    if (recipient.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        linkUrl,
        recipientId,
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

    await redis.publish(`channel:notify:${recipientId}`, JSON.stringify(payload));

    return NextResponse.json({ notification: payload }, { status: 201 });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
