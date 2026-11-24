import type { NextAuthConfig } from "next-auth";

/**
 * Lightweight, Edge-compatible NextAuth configuration.
 *
 * This configuration contains only edge-compatible options (session strategy,
 * pages, callbacks) and deliberately omits database adapters (Prisma) and
 * Node.js-specific modules (bcryptjs) to keep the Next.js Edge middleware bundle
 * far below Vercel's 1MB limit.
 */
export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "USER" | "ADMIN";
      }
      return session;
    },
  },
};
