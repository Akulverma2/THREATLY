import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeQr } from "@/lib/detection/qr";
import { scanRateLimit } from "@/middleware/rate-limit";
import { z } from "zod";

const schema = z.object({ imageBase64: z.string().min(1).max(7_000_000, "Image payload exceeds 5MB limit") });

export async function POST(req: Request) {
  const limiterResult = scanRateLimit(req);
  if (limiterResult) return limiterResult;
  const origin = req.headers.get("origin") || "";
  const devOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
  const isDevOrigin = devOrigins.includes(origin);

  const session = await auth();
  if (!session?.user?.id) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isDevOrigin) {
      res.headers.set("Access-Control-Allow-Origin", origin);
    }
    return res;
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const res = NextResponse.json({ error: "Invalid input" }, { status: 400 });
    if (isDevOrigin) {
      res.headers.set("Access-Control-Allow-Origin", origin);
    }
    return res;
  }
  const result = analyzeQr(parsed.data.imageBase64);
  const scan = await prisma.scan.create({
    data: { userId: session.user.id, type: "QR", input: "[QR image]", riskScore: result.riskScore, classification: result.classification, threatCategory: result.threatCategory, confidence: result.confidence, reasons: result.reasons, recommendedAction: result.recommendedAction },
  });
  await prisma.user.update({ where: { id: session.user.id }, data: { totalScans: { increment: 1 } } });
  const res = NextResponse.json({ scanId: scan.id, ...result });
  if (isDevOrigin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
    res.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return res;
}