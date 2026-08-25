import { Redis } from "@upstash/redis";

type PresenceData = {
  status: "ONLINE" | "IN_TEST" | "OFFLINE";
  testTitle?: string;
  timestamp: number;
};

type NotificationPayload = {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
  read: boolean;
  createdAt: string;
};

const PRESENCE_PREFIX = "presence:";
const NOTIFICATION_PREFIX = "notify:";

const hasRedis =
  !!process.env.REDIS_URL &&
  !!process.env.REDIS_TOKEN &&
  /^https:\/\//.test(process.env.REDIS_URL);

function createUpstash(): Redis | null {
  if (!hasRedis) return null;
  try {
    return new Redis({
      url: process.env.REDIS_URL!,
      token: process.env.REDIS_TOKEN!,
    });
  } catch (e) {
    console.error("Failed to init Upstash Redis, falling back to in-memory:", e);
    return null;
  }
}

const upstash = createUpstash();

// Local/dev fallback when no Upstash Redis is configured.
const store = new Map<string, string>();
const subscribers = new Map<string, Set<(data: string) => void>>();

type SubscribeHandle = {
  unsubscribe: () => void;
};

const localRedis = {
  async setex(key: string, ttl: number, value: string) {
    store.set(key, value);
    if (ttl > 0) {
      setTimeout(() => store.delete(key), ttl * 1000);
    }
  },

  async get(key: string): Promise<string | null> {
    return store.get(key) ?? null;
  },

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return keys.map((k) => store.get(k) ?? null);
  },

  async keys(pattern: string): Promise<string[]> {
    const prefix = pattern.replace("*", "");
    return Array.from(store.keys()).filter((k) => k.startsWith(prefix));
  },

  async publish(channel: string, message: string) {
    const subs = subscribers.get(channel);
    if (subs) {
      for (const cb of subs) {
        cb(message);
      }
    }
  },

  subscribe(channel: string, callback: (message: string) => void): SubscribeHandle {
    if (!subscribers.has(channel)) {
      subscribers.set(channel, new Set());
    }
    subscribers.get(channel)!.add(callback);
    return { unsubscribe: () => subscribers.get(channel)?.delete(callback) };
  },

  duplicate() {
    return localRedis;
  },

  async connect() {},
};

export const redis = upstash
  ? {
      async setex(key: string, ttl: number, value: string) {
        await upstash.setex(key, ttl, value);
      },

      async get(key: string): Promise<string | null> {
        return upstash.get<string>(key);
      },

      async mget(...keys: string[]): Promise<(string | null)[]> {
        if (keys.length === 0) return [];
        const result = await upstash.mget<(string | null)[]>(keys);
        return result.map((r) => (r == null ? null : String(r)));
      },

      async keys(pattern: string): Promise<string[]> {
        return upstash.keys(pattern);
      },

      async publish(channel: string, message: string) {
        await upstash.publish(channel, message);
      },

      subscribe(channel: string, callback: (message: string) => void): SubscribeHandle {
        const subscriber = upstash.subscribe<string>(channel);
        const listener = (event: { channel: string; message: string }) => {
          callback(event.message);
        };
        subscriber.on("message", listener);
        return {
          unsubscribe: () => {
            subscriber.removeAllListeners();
            subscriber.unsubscribe().catch(() => {});
          },
        };
      },

      duplicate() {
        return this;
      },

      async connect() {},
    }
  : localRedis;

export async function setStudentPresence(
  tenantId: string,
  studentId: string,
  status: "ONLINE" | "IN_TEST" | "OFFLINE",
  testTitle?: string
) {
  const key = `${PRESENCE_PREFIX}${tenantId}:${studentId}`;
  const payload: PresenceData = { status, testTitle, timestamp: Date.now() };
  await redis.setex(key, 30, JSON.stringify(payload));
  await redis.publish(
    `channel:presence:${tenantId}`,
    JSON.stringify(payload)
  );
}

export async function getStudentPresence(
  tenantId: string,
  studentId: string
): Promise<PresenceData> {
  const raw = await redis.get(`${PRESENCE_PREFIX}${tenantId}:${studentId}`);
  if (!raw) return { status: "OFFLINE", timestamp: Date.now() };
  try {
    return JSON.parse(raw);
  } catch {
    return { status: "OFFLINE", timestamp: Date.now() };
  }
}

export async function getAllStudentPresences(tenantId: string) {
  const keys = await redis.keys(`${PRESENCE_PREFIX}${tenantId}:*`);
  if (keys.length === 0) return {};
  const values = await redis.mget(...keys);
  const result: Record<string, PresenceData> = {};
  keys.forEach((key, i) => {
    const studentId = key.replace(`${PRESENCE_PREFIX}${tenantId}:`, "");
    result[studentId] = values[i]
      ? JSON.parse(values[i])
      : { status: "OFFLINE", timestamp: Date.now() };
  });
  return result;
}

export async function getUnreadNotifications(userId: string) {
  const raw = await redis.get(`${NOTIFICATION_PREFIX}${userId}`);
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function setUnreadNotifications(
  userId: string,
  notifications: NotificationPayload[]
) {
  await redis.setex(
    `${NOTIFICATION_PREFIX}${userId}`,
    86400,
    JSON.stringify(notifications)
  );
}

export type { PresenceData, NotificationPayload };
