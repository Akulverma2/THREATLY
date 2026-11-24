import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [totalUsers, totalScans, byClass, byType, recentScans] = await Promise.all([
    prisma.user.count(),
    prisma.scan.count(),
    prisma.scan.groupBy({ by: ["classification"], _count: true }),
    prisma.scan.groupBy({ by: ["type"], _count: true }),
    prisma.scan.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { email: true, name: true } } } }),
  ]);
  return NextResponse.json({ totalUsers, totalScans, byClass, byType, recentScans });
}
