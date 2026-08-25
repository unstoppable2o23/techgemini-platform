import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, message } = await request.json();
    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    const counselors = await prisma.user.findMany({
      where: { role: "COUNSELOR", tenantId: session.user.tenantId },
      select: { id: true },
    });

    if (counselors.length === 0) {
      return NextResponse.json({ error: "No counselors found" }, { status: 404 });
    }

    const notifications = await Promise.all(
      counselors.map((c) =>
        prisma.notification.create({
          data: {
            type: "SYSTEM",
            title: title.trim(),
            message: message.trim(),
            senderId: session.user.id,
            recipientId: c.id,
          },
        })
      )
    );

    for (const c of counselors) {
      await redis.publish(
        `channel:notifications:${c.id}`,
        JSON.stringify({ type: "new_notification" })
      );
    }

    return NextResponse.json({ success: true, count: notifications.length }, { status: 201 });
  } catch (error) {
    console.error("Broadcast notification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
