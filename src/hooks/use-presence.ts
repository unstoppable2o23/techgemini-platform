"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";

interface PresenceState {
  current: "ONLINE" | "IN_TEST" | "OFFLINE";
  testTitle?: string;
}

export function usePresence() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<PresenceState>({
    current: "OFFLINE",
  });
  const heartbeatRef = useRef<NodeJS.Timeout>(undefined);
  const eventSourceRef = useRef<EventSource>(undefined);

  const BEAT_INTERVAL = 15000;

  async function sendHeartbeat() {
    if (!session?.user?.id) return;
    try {
      const tenantId = document
        .querySelector('meta[name="x-tenant-id"]')
        ?.getAttribute("content");
      await fetch("/api/presence/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tenantId ? { "x-tenant-id": tenantId } : {}),
        },
        body: JSON.stringify({
          status: status.current,
          testTitle: status.testTitle,
        }),
      });
    } catch {
      console.error("Heartbeat failed");
    }
  }

  function updatePresence(
    newStatus: "ONLINE" | "IN_TEST" | "OFFLINE",
    testTitle?: string
  ) {
    setStatus({ current: newStatus, testTitle });
  }

  useEffect(() => {
    if (!session?.user?.id) return;

    (window as any).__updatePresence = updatePresence;
    updatePresence("ONLINE");

    heartbeatRef.current = setInterval(sendHeartbeat, BEAT_INTERVAL);

    const tenantId = document
      .querySelector('meta[name="x-tenant-id"]')
      ?.getAttribute("content");

    if (tenantId && session.user.role === "COUNSELOR") {
      const es = new EventSource(
        `/api/events?tenantId=${tenantId}&userId=${session.user.id}`
      );
      eventSourceRef.current = es;
    }

    return () => {
      clearInterval(heartbeatRef.current);
      eventSourceRef.current?.close();
      sendHeartbeat();
    };
  }, [session]);

  return { status, updatePresence };
}
