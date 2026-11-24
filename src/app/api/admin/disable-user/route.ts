import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ userId: z.string(), active: z.boolean().optional() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const user = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { status: parsed.data.active === false ? "INACTIVE" : "ACTIVE" },
  });
  await prisma.auditLog.create({ data: { userId: session.user.id, action: "TOGGLE_USER", metadata: { target: parsed.data.userId, active: parsed.data.active } } });
  return NextResponse.json({ id: user.id, status: user.status });
}
