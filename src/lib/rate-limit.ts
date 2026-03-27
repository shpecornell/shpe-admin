import { NextRequest } from "next/server";

const WINDOW_MS = 60_000;
const LIMIT = 20;

type Entry = {
  count: number;
  expiresAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __shpeRateLimitStore: Map<string, Entry> | undefined;
}

const store = globalThis.__shpeRateLimitStore ?? new Map<string, Entry>();
globalThis.__shpeRateLimitStore = store;

export function getClientIp(request: NextRequest) {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const ip = fwd.split(",")[0]?.trim();
    if (ip) {
      return ip;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function enforceRateLimit(request: NextRequest, routeKey: string) {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${routeKey}:${ip}`;

  for (const [mapKey, value] of store.entries()) {
    if (value.expiresAt <= now) {
      store.delete(mapKey);
    }
  }

  const existing = store.get(key);
  if (!existing || existing.expiresAt <= now) {
    store.set(key, {
      count: 1,
      expiresAt: now + WINDOW_MS
    });
    return { allowed: true, remaining: LIMIT - 1 };
  }

  if (existing.count >= LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.expiresAt - now) / 1000)
    };
  }

  existing.count += 1;
  store.set(key, existing);
  return { allowed: true, remaining: LIMIT - existing.count };
}
