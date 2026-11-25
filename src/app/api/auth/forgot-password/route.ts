import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { z } from "zod";
import { resetPasswordRateLimit } from "@/middleware/rate-limit";

const schema = z.object({
  email: z.string().email("Invalid email address").max(254),
});

export async function POST(req: Request) {
  const rateLimitRes = resetPasswordRateLimit(req);
  if (rateLimitRes) return rateLimitRes;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid email" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Do not disclose user non-existence, but respond gracefully
      return NextResponse.json({
        success: true,
        message: "If that email address exists in our system, a password reset authorization has been generated.",
      });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    // Remove any previous verification tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: user.email },
    });

    // Save token
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires,
      },
    });

    // Log security audit event
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        metadata: { email: user.email },
      },
    });

    const resetUrl = `/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    return NextResponse.json({
      success: true,
      message: "Password reset authorization generated successfully.",
      resetUrl,
      token,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred while processing password reset request." },
      { status: 500 }
    );
  }
}
