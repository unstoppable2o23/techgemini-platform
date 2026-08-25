"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;

    fetchNotifications();

    const handler = (e: CustomEvent) => {
      const { payload } = e.detail;
      setNotifications((prev) => [payload, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    window.addEventListener("new-notification", handler as EventListener);

    return () => {
      window.removeEventListener(
        "new-notification",
        handler as EventListener
      );
    };
  }, [session]);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(
        data.notifications?.filter((n: Notification) => !n.read).length || 0
      );
    } catch {
      console.error("Failed to fetch notifications");
    }
  }

  return { notifications, unreadCount, refresh: fetchNotifications };
}
