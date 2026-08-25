import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setStudentPresence } from "@/lib/redis";


export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) {
    return NextResponse.json(
      { error: "Tenant not resolved" },
      { status: 400 }
    );
  }

  const { status, testTitle } = await request.json();

  await setStudentPresence(tenantId, session.user.id, status, testTitle);

  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, lastHeartbeatAt: true, totalUsageMinutes: true },
  });

  let totalUsageMinutes = user?.totalUsageMinutes ?? 0;
  const lastHeartbeat = user?.lastHeartbeatAt;
  let addedMinutes = 0;

  if (lastHeartbeat) {
    const elapsed = (now.getTime() - lastHeartbeat.getTime()) / 60000;
    if (elapsed > 0 && elapsed <= 5) {
      addedMinutes = Math.round(elapsed * 10) / 10;
      totalUsageMinutes = Math.round((totalUsageMinutes + addedMinutes) * 10) / 10;
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastSeen: now, lastHeartbeatAt: now, totalUsageMinutes },
  });

  if (addedMinutes > 0) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    await prisma.dailyUsage.upsert({
      where: { userId_date: { userId: session.user.id, date: today } },
      create: { userId: session.user.id, date: today, totalMinutes: addedMinutes },
      update: { totalMinutes: { increment: addedMinutes } },
    });
  }

  if (user?.role === "STUDENT") {
    await prisma.studentProfile.updateMany({
      where: { userId: session.user.id },
      data: { status },
    });
  }

  return NextResponse.json({ ok: true });
}
