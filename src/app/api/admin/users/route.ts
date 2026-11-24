import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, status: true, totalScans: true, createdAt: true, lastLogin: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}
