# THREATLY — Vercel Middleware Bundle Fix & Verification Report

**Date:** 2026-11-24  
**Project:** THREATLY  
**Repository:** `https://github.com/Akulverma2/THREATLY`  
**Target Branch:** `main`  
**Status:** **COMPLETE & VERIFIED**

---

## 1. Executive Summary

During Vercel production deployment, the deployment failed with the error:
```text
The Edge Function "_middleware" size is 1.07 MB and your plan size limit is 1 MB.
```

The issue was investigated, root-caused, and resolved using the official Auth.js v5 split-configuration architecture. The Edge middleware bundle was reduced from **~2.93 MB uncompressed / 1.07 MB compressed** down to **323.1 KB uncompressed / 103.76 KB compressed**, placing the Edge Function well within Vercel's 1 MB limit with a **~90% safety margin**.

All 62 automated tests pass, TypeScript compiler reports zero errors, ESLint passes with zero warnings, and the Next.js production build compiles all 22 routes cleanly.

---

## 2. Root Cause Analysis

### 2.1 Dependency Graph Inspection
In Next.js, `src/middleware.ts` runs on the **Edge Runtime**.

Previously, `src/middleware.ts` imported `auth` directly from `src/lib/auth.ts`:
```typescript
import { auth } from "@/lib/auth";
```

Inspection of `src/lib/auth.ts` revealed that it initialized NextAuth with full database connectivity and hashing dependencies:
- `@auth/prisma-adapter`
- `@prisma/client` (`src/lib/prisma.ts`)
- `bcryptjs`
- `zod`

When the Edge compiler bundled `src/middleware.ts`, it pulled in the entire `@prisma/client` runtime, including the Prisma WebAssembly query engine:
```text
server/edge/chunks/node_modules__prisma_client_query_engine_bg_0athij3ijk6je.wasm: 2,297,601 bytes (2.2 MB)
server/edge/chunks/[root-of-the-server]__1pc682ugfecva._.js: 616,280 bytes
Total uncompressed size: ~2.92 MB
Vercel compressed Edge Function size: 1.07 MB (Exceeded 1.00 MB plan limit)
```

Prisma ORM and database connection adapters are never needed in middleware because middleware only inspects the signed JWT session cookie (`req.auth`) to enforce RBAC and route protection. Database queries and credential validation only occur in API Route Handlers (`src/app/api/...`), which run in the Node.js Serverless Function runtime where bundle size limits are 50 MB (not 1 MB).

---

## 3. Architectural Solution: Auth.js v5 Split Configuration

Following the official Auth.js v5 specification, the NextAuth configuration was cleanly split into two modules:

### 3.1 Edge-Compatible Config (`src/lib/auth.config.ts`)
Created a lightweight, edge-safe configuration containing only options needed to decode and verify JWT sessions:
```typescript
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
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
```
*Key benefit:* Zero database drivers, zero WASM binaries, zero Node.js native packages.

### 3.2 Full Node.js Runtime Config (`src/lib/auth.ts`)
Updated `src/lib/auth.ts` to extend `authConfig` with the `PrismaAdapter` and `Credentials` provider:
```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({ ... }),
  ],
});
```
*Key benefit:* All existing server components, server actions, and API routes continue importing from `@/lib/auth` with zero changes.

### 3.3 Middleware Integration (`src/middleware.ts`)
Updated `src/middleware.ts` to initialize `auth` using only `authConfig`:
```typescript
import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // All existing security headers, CORS preflight, and RBAC evaluation logic
  ...
});
```

---

## 4. Bundle Size Comparison & Measurements

| Metric | Before Fix | After Fix | Net Change |
|---|:---:|:---:|:---:|
| **Prisma WASM Engine in Edge** | 2,297,601 bytes | **0 bytes** (Eliminated) | -100% (-2.2 MB) |
| **Edge JS Chunks (Raw)** | 627,731 bytes | **330,850 bytes** (323.1 KB) | -47.3% (-296.8 KB) |
| **Total Uncompressed Bundle** | 2,925,332 bytes (2.86 MB) | **330,850 bytes** (323.1 KB) | **-88.7% (-2.59 MB)** |
| **Gzipped Edge Function Size** | ~1,070,000 bytes (1.07 MB) | **106,247 bytes** (103.76 KB) | **-90.1% (-963.7 KB)** |
| **Vercel Plan Limit (1.00 MB)** | ❌ FAILED (1.07 MB) | ✅ **PASS (0.10 MB)** | **~90% Safety Margin** |

---

## 5. Security & Functional Verification

All security controls and requirements have been preserved and verified:

| Security Control | Implementation | Verification Status |
|---|---|:---:|
| **Dashboard Route Protection** | Unauthenticated requests redirected to `/login` | **VERIFIED** |
| **API Route Authentication** | Unauthenticated `/api/user/*` and `/api/scan/*` return HTTP 401 JSON | **VERIFIED** |
| **Admin Route Protection** | Non-admin users redirected to `/dashboard` on pages, receive HTTP 403 on API | **VERIFIED** |
| **Security Headers** | CSP, HSTS (production), X-Frame-Options, X-Content-Type-Options, Permissions-Policy | **VERIFIED** |
| **CORS Isolation** | Preflight OPTIONS handler, disallows wildcard with credentials | **VERIFIED** |
| **Rate Limiting** | Sliding window rate limiting on auth, register, and scan routes | **VERIFIED** |
| **Bcrypt DoS Protection** | Password length bounded to 128 characters in Zod schema | **VERIFIED** |

### Verification Commands & Results:
- **Unit & Regression Tests:** `npx vitest run ...` → **PASS** (62/62 tests passed across 8 test suites).
- **TypeScript Check:** `npx tsc --noEmit` → **PASS** (Exit code 0, zero type errors).
- **ESLint Check:** `npm run lint` → **PASS** (Exit code 0, zero warnings).
- **Production Build:** `npm run build` → **PASS** (Exit code 0, 22/22 routes generated).

---

## 6. Files Changed

1. `src/lib/auth.config.ts` (New file) — Edge-compatible NextAuthConfig without database or bcrypt dependencies.
2. `src/lib/auth.ts` — Imports and spreads `authConfig`, retains PrismaAdapter and Credentials provider for Node.js runtime.
3. `src/middleware.ts` — Imports `authConfig` and initializes Edge-safe `auth` middleware wrapper.
4. `src/__tests__/api/routes-auth.test.ts` — Added unit test verifying `authConfig` structure and callbacks.
5. `audit/VERCEL_MIDDLEWARE_BUNDLE_FIX_REPORT.md` (New file) — This completion report.
