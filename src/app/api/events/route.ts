import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redis } from "@/lib/redis";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = session.user;
  const tenantId = user.tenantId || "";
  const userId = request.nextUrl.searchParams.get("userId") || "";

  // Callers may only stream notifications addressed to themselves.
  if (!userId || userId !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // The tenant-wide presence channel is only exposed to staff roles.
  const canReadPresence =
    user.role === "COUNSELOR" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "UNIVERSITY_ADMIN";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sub = redis.duplicate();
      await sub.connect();

      const notifyChannel = `channel:notify:${userId}`;
      const unsubs: Array<{ unsubscribe: () => void }> = [];

      const unsubNotify = sub.subscribe(notifyChannel, (message) => {
        const data = `data: ${JSON.stringify({ type: "notification", payload: JSON.parse(message) })}\n\n`;
        controller.enqueue(encoder.encode(data));
      });
      unsubs.push(unsubNotify);

      if (canReadPresence && tenantId) {
        const presenceChannel = `channel:presence:${tenantId}`;
        const unsubPresence = sub.subscribe(presenceChannel, (message) => {
          const data = `data: ${JSON.stringify({ type: "presence", payload: JSON.parse(message) })}\n\n`;
          controller.enqueue(encoder.encode(data));
        });
        unsubs.push(unsubPresence);
      }

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(":keepalive\n\n"));
      }, 30000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        for (const unsub of unsubs) unsub?.unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}