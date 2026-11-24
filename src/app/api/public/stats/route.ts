import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [totalScans, threatsBlocked, usersProtected] = await Promise.all([
      prisma.scan.count(),
      prisma.scan.count({ where: { classification: { in: ["SUSPICIOUS", "MALICIOUS"] } } }),
      prisma.user.count({ where: { status: "ACTIVE" } }),
    ]);

    return NextResponse.json({ totalScans, threatsBlocked, usersProtected });
  } catch {
    // Database unavailable: return zeroes rather than fabricated numbers.
    // The landing page renders empty/zero stats rather than invented data.
    return NextResponse.json({ totalScans: 0, threatsBlocked: 0, usersProtected: 0 });
  }
}