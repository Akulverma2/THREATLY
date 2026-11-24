import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { registerRateLimit } from "@/middleware/rate-limit";

const schema = z.object({
  name: z.string().min(1).max(100, "Name must not exceed 100 characters").regex(/^[a-zA-Z0-9\s\-'.]+$/, "Name must contain only letters, numbers, spaces, hyphens, apostrophes, and periods"),
  email: z.string().email().max(254, "Email must not exceed 254 characters"),
  password: z.string().min(6).max(128, "Password must not exceed 128 characters")
});

export async function POST(req: Request) {
  // Apply rate limiting before processing the request body.
  // The registerRateLimit middleware sets X-RateLimit-* headers on the
  // response if the limit is exceeded, and returns 429 if so.
  const limiterResult = registerRateLimit(req);
  if (limiterResult) return limiterResult;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { name, email, passwordHash, role: "USER" } });

    const res = NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });

    // Set CORS headers: same-origin default, specific origin for cross-origin
    // We set Access-Control-Allow-Origin to the request's origin if it's a
    // known development origin, otherwise we rely on the middleware's
    // same-origin enforcement. We do NOT use wildcard *.
    const origin = req.headers.get("origin") || "";
    // Allow the origin if it looks like a development localhost origin
    const devOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
    if (devOrigins.includes(origin)) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type");
      res.headers.set("Access-Control-Allow-Credentials", "true");
    }

    return res;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}