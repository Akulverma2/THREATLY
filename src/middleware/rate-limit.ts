// Rate Limiter for AiGuard Authentication Endpoints
// ===============================================
import { NextResponse } from "next/server";

// This module provides in-memory rate limiting for authentication endpoints.
// It is designed for single-instance deployments.
//
// For multi-instance (clustered/container) deployments, a distributed store
// such as Redis is required. See the production deployment considerations
// at the bottom of this file.
//
// ---------------------------------------------------------------------------
// EXPORTED API
// ---------------------------------------------------------------------------

/**
 * Creates a rate limiter middleware for Next.js.
 *
 * Usage:
 *   import { rateLimit } from "@/middleware/rate-limit";
   *
 *   export const GET = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 })(req =>
 *     req.method === "GET"
 *   );
 *
 * @param options Configuration for the rate limiter.
 * @returns A Next.js middleware function.
 */
export function rateLimit(options: {
  /** Maximum number of allowed requests per window. */
  max: number;
  /** Time window in milliseconds. */
  windowMs: number;
  /** Custom key generator. If not provided, uses IP address. */
  keyGenerator?: (req: Request) => string;
  /** Custom response when rate limit is exceeded. */
  onLimitExceeded?: (req: Request, info: RateLimitInfo) => NextResponse;
}) {
  // In-memory store: Map<key, { count: number, first: number, last: number }>
  const store = new Map<string, { count: number; first: number; last: number }>();

  const {
    max,
    windowMs,
    keyGenerator,
    onLimitExceeded = defaultOnLimitExceeded,
  } = options;

  return function (req: Request): NextResponse | null {
    // --- Key Generation ---
    const reqWithMeta = req as unknown as { ip?: string; socket?: { remoteAddress?: string }; headers?: Record<string, string> };
    const ip =
      keyGenerator?.(req) ||
      (typeof req.headers?.get === "function" ? req.headers.get("x-real-ip")?.trim() : undefined) ||
      reqWithMeta.ip ||
      reqWithMeta.socket?.remoteAddress ||
      (typeof req.headers?.get === "function" ? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() : undefined) ||
      reqWithMeta.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
      "unknown";

    const normalizedKey = ip;
    const now = Date.now();
    const entry = store.get(normalizedKey);

    if (entry && now - entry.first > windowMs) {
      store.delete(normalizedKey);
    }

    if (entry) {
      entry.count += 1;
      entry.last = now;
    } else {
      store.set(normalizedKey, { count: 1, first: now, last: now });
    }

    const currentCount = store.get(normalizedKey)!.count;

    if (currentCount > max) {
      return onLimitExceeded(req, {
        limit: max,
        remaining: 0,
        reset: Math.floor(((store.get(normalizedKey)?.first ?? now) + windowMs) / 1000),
        timeout: Math.ceil(((store.get(normalizedKey)?.first ?? now) + windowMs - now) / 1000),
        retryAfter: Math.ceil(((store.get(normalizedKey)?.first ?? now) + windowMs - now) / 1000),
        count: currentCount,
      });
    }

    return null;
  };
}

const _registerLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_REGISTER_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_REGISTER_MAX) || 10,
});

export function registerRateLimit(req: Request): NextResponse | null {
  return _registerLimiter(req);
}

const _scanLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_SCAN_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.RATE_LIMIT_SCAN_MAX) || 30,
});

export function scanRateLimit(req: Request): NextResponse | null {
  return _scanLimiter(req);
}

export function authRateLimit<T>(handlers: T): T {
  const loginLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 20,
  });

  const h = handlers as unknown as {
    GET?: (...args: unknown[]) => unknown;
    POST?: (req: Request, ...args: unknown[]) => Promise<Response> | Response;
  };

  return {
    ...handlers,
    GET: h.GET,
    POST: async (req: Request, ...args: unknown[]) => {
      const limitRes = loginLimiter(req);
      if (limitRes) return limitRes;
      if (typeof h.POST === "function") {
        return h.POST(req, ...args);
      }
      return new Response(null, { status: 405 });
    },
  } as T;
}

/**
 * Default response when the rate limit is exceeded.
 *
 * Returns HTTP 429 with Retry-After and educational headers. The body is
 * intentionally generic to avoid revealing whether an account exists or any
 * other internal detail.
 */
function defaultOnLimitExceeded(_req: Request, info: RateLimitInfo): NextResponse {
  const body = {
    error: "Too many attempts. Please try again later.",
  };
  return new NextResponse(JSON.stringify(body), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.ceil(info.timeout as number)),
      "X-RateLimit-Limit": String(info.limit),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(info.reset),
    },
  });
}

/** Information returned when the rate limit is exceeded. */
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp (seconds) when the limit resets
  timeout: number; // Seconds until the limit resets
  retryAfter: number; // Seconds until the client should retry
  count: number; // Current request count in this window
}

// ---------------------------------------------------------------------------
// PRODUCTION DEPLOYMENT CONSIDERATIONS
// ---------------------------------------------------------------------------
//
// THIS LIMITER IS IN-MEMORY ONLY.
//
//   • In a single Next.js instance (one process, one server), this limiter
//     works correctly. All requests share the same process memory.
//
//   • In a clustered or containerized deployment (multiple Next.js instances),
//     this limiter DOES NOT work. Each instance has its own in-memory store,
//     so a client could bypass limits by hitting a different instance.
//
// TO ENABLE DISTRIBUTED RATE LIMITING:
//
//   1. Install a Redis-backed store (e.g., using upstash-redis, redis,
//      or a self-managed Redis instance).
//
//   2. Replace the in-memory `store` Map with a Redis-backed implementation,
//      using either:
//      • A Redis SET with EXpiry per IP key, or
//      • A Redis Lua script for atomic increment + expire, or
//      • A library like `rate-limit-redis`, `throttle-redis`, etc.
//
//   2. Ensure all Next.js instances share the same Redis endpoint.
//
//   3. Configure the REDIS_URL (or similar) environment variable and update
//      the keyGenerator / store logic accordingly.
//
// ALTERNATIVELY, for simple clustered deployments without Redis, you can:
//
//   • Use a shared database table (e.g., PostgreSQL via Prisma) with a
//     `rate_limit_log` table and atomic upserts.
//   • Accept slightly weaker limits (e.g., per-region limits) as a trade-off.
//
// ---------------------------------------------------------------------------
// ENVIRONMENT VARIABLES
// ---------------------------------------------------------------------------
//
// It is recommended to configure these via .env (or the deployment environment):
//
//   RATE_LIMIT_LOGIN_MAX=5
//   RATE_LIMIT_LOGIN_WINDOW_MS=900000   /* 15 minutes */
//   RATE_LIMIT_REGISTER_MAX=3
//   RATE_LIMIT_REGISTER_WINDOW_MS=900000 /* 15 minutes */
//   RATE_LIMIT_RESET_TIMEOUT_MS=300000  /* 5 minutes (Retry-After default) */
//
// Example .env entry:
//
//   RATE_LIMIT_LOGIN_MAX=5
//   RATE_LIMIT_LOGIN_WINDOW_MS=900000
//
// These values are read by the API route wrappers (see below), not by the
// limiter core itself, to keep the limiter pure and testable.

// ---------------------------------------------------------------------------
// END OF MODULE
// ---------------------------------------------------------------------------