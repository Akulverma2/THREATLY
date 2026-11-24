import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scans = await prisma.scan.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, input: true, type: true, riskScore: true, classification: true, threatCategory: true, confidence: true, createdAt: true },
  });
  return NextResponse.json({ scans });
}