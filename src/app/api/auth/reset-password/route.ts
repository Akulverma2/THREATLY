import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { resetPasswordRateLimit } from "@/middleware/rate-limit";

const schema = z.object({
  email: z.string().email("Invalid email address").max(254),
  token: z.string().min(16, "Invalid reset token"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128, "Password exceeds maximum length"),
});

export async function POST(req: Request) {
  const rateLimitRes = resetPasswordRateLimit(req);
  if (rateLimitRes) return rateLimitRes;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, token, newPassword } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Verify token
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        token: token.trim(),
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: "Invalid or expired password reset token." },
        { status: 400 }
      );
    }

    if (new Date() > tokenRecord.expires) {
      // Clean up expired token
      await prisma.verificationToken.deleteMany({
        where: { identifier: normalizedEmail },
      });
      return NextResponse.json(
        { error: "Password reset token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Find target user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    // Hash new password securely
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and invalidate all tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier: normalizedEmail },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "PASSWORD_RESET_COMPLETED",
          metadata: { email: normalizedEmail },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred while resetting password." },
      { status: 500 }
    );
  }
}
