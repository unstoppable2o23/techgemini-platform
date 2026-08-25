import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chat = await prisma.chat.findUnique({ where: { id } });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (chat.studentId !== session.user.id && chat.counselorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { chatId: id },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, firstName: true, lastName: true } } },
  });

  await prisma.message.updateMany({ where: { chatId: id, senderId: { not: session.user.id }, read: false }, data: { read: true } });

  return NextResponse.json({ messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chat = await prisma.chat.findUnique({ where: { id } });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (chat.studentId !== session.user.id && chat.counselorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (chat.status !== "ACTIVE") return NextResponse.json({ error: "Chat is not active" }, { status: 400 });

  const { content } = await request.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 });

  const message = await prisma.message.create({
    data: { chatId: id, senderId: session.user.id, content: content.trim() },
    include: { sender: { select: { id: true, firstName: true, lastName: true } } },
  });

  const recipientId = chat.studentId === session.user.id ? chat.counselorId : chat.studentId;
  await redis.publish(`channel:chat:${recipientId}`, JSON.stringify({ chatId: id, message }));

  return NextResponse.json({ message }, { status: 201 });
}
