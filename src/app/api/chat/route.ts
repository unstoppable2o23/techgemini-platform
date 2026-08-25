import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isStudent = session.user.role === "STUDENT";
  const where = isStudent ? { studentId: session.user.id } : { counselorId: session.user.id };

  const chats = await prisma.chat.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      counselor: {
        select: {
          id: true, firstName: true, lastName: true, email: true,
          counselorProfile: { select: { whatsappCountryCode: true, whatsappNumber: true } },
        },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({ chats });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message } = await request.json();
    if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        counselor: true,
        featureAccess: true,
      },
    });

    if (!profile?.counselor) return NextResponse.json({ error: "No counselor assigned" }, { status: 400 });

    if (!profile.featureAccess?.chat) {
      return NextResponse.json({ error: "Chat is disabled by your counselor" }, { status: 403 });
    }

    const existing = await prisma.chat.findFirst({
      where: { studentId: session.user.id, counselorId: profile.counselor.userId, status: { not: "CLOSED" } },
    });

    const chat = existing || await prisma.chat.create({
      data: { studentId: session.user.id, counselorId: profile.counselor.userId },
    });

    const msg = await prisma.message.create({
      data: { chatId: chat.id, senderId: session.user.id, content: message.trim() },
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          type: "SYSTEM",
          title: "New Chat Request",
          message: `${session.user.firstName} ${session.user.lastName} wants to chat with you`,
          linkUrl: "/messages",
          recipientId: profile.counselor.userId,
          senderId: session.user.id,
        },
      });
    }

    return NextResponse.json({ chat, message: msg }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
