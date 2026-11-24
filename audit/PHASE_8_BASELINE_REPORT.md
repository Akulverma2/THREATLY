# THREATLY / AiGuard — Phase 8 Baseline Inspection Report

> **Inspection Date**: 2026-11-24  
> **Target Project**: `C:\Users\akulv\Downloads\THREATLY\THREATLY`  
> **Status**: Verified Baseline Completed  

---

## 1. Project Overview & Architecture Baseline

THREATLY (AiGuard) is a unified Next.js 16 (App Router + Turbopack) & React 19 cybersecurity platform providing real-time multi-vector threat detection across URLs, QR codes, messages, and emails, integrated with NextAuth v5 (JWT strategy) and Prisma ORM against PostgreSQL.

### Key Framework & Library Baseline
- **Next.js**: `16.4.6` with App Router, Turbopack, and Cache Components
- **React**: `19.3.0`
- **NextAuth**: `5.0.0-beta.32` with PrismaAdapter and Credentials provider
- **Prisma**: `6.19.3` with PostgreSQL datasource and lazy client initialization
- **Detection Engines**: Custom heuristic rules, scoring pipelines, homograph punycode decoders, SSRF protections, QR matrix decoders (`jsqr`, `qrcode-reader`, `pngjs`), and NLP/pattern matching
- **Validation**: Zod `4.6.7`
- **Password Hashing**: bcryptjs `3.0.3` (12 rounds)

---

## 2. Review of Prior Phase States (Phases 6 & 7)

### Phase 6 (Database Isolation & Route Tests)
- Formally closed as **PARTIALLY COMPLETE (Accepted)**.
- **56 passing automated tests** verified across detection, database isolation safeguards, and mocked API route integration (`routes-register.test.ts` & `routes-auth.test.ts`).
- **6 legacy Prisma direct-database tests** (`auth.test.ts`, `authorization.test.ts`, `register.test.ts`) are **BLOCKED / NOT EXECUTED** due to unreachable Neon remote test database endpoint (`ep-square-recipe-bdxeoeo7.pooler.us-east-2.aws.neon.tech`).
- Production database (`neondb`) was verified untouched, with zero connections or mutations.

### Phase 7 (UI/UX, Responsiveness & Code Quality)
- Resolved all 71 ESLint warnings/errors (0 errors, 0 warnings).
- Fixed Next.js 16 static prerendering issues caused by impure `Date.now()` / `Math.random()` during component evaluation.
- TypeScript compilation passed with 0 errors.
- Production build succeeded with all 22 routes generated and optimized.

---

## 3. Existing Security Controls Identified

| Category | Control Mechanism | Location | Status |
|---|---|---|---|
| **Security Headers** | CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy | `src/middleware.ts` | Active on all routes |
| **Authentication** | NextAuth v5 with bcryptjs (12 rounds), JWT sessions, secure cookie defaults | `src/lib/auth.ts`, `src/app/api/auth/` | Active |
| **Role-Based Access** | Role enforcement (`ADMIN` vs `USER`), middleware route checks, server-side route guards | `src/middleware.ts`, `src/app/api/admin/` | Active |
| **Input Validation** | Server-side Zod schemas on registration, auth, scans, and admin actions | API route handlers | Active |
| **Rate Limiting** | In-memory sliding window rate limiters for auth and registration | `src/middleware/rate-limit.ts` | Active |
| **Database Isolation** | Explicit URL validation rejecting production DB reuse and missing test DB in test mode | `src/lib/prisma.ts` | Active & Verified |
| **Secret Masking** | URI masking utility ensuring connection strings mask credentials in diagnostics | `src/lib/prisma.ts` | Active & Tested |
| **IDOR Protection** | Scans and user profiles scoped directly to `session.user.id` | `/api/user/me`, `/api/user/scans` | Active |

---

## 4. Phase 8 Security Audit Scope & Identified Focus Areas

Based on baseline inspection, the following concrete areas require review, hardening, and verification:

1. **API Route Authentication & Middleware Consistency**:
   - `src/middleware.ts` redirects unauthenticated `/api/` requests to HTML `/login` with 307 redirects instead of returning 401 JSON. This must be adjusted so API endpoints return proper 401/403 JSON payloads.
2. **CORS Header Consistency**:
   - In `src/app/api/register/route.ts`, the fallback `else` branch inadvertently sets `Access-Control-Allow-Origin: origin` on unvalidated origins. Needs strict alignment with same-origin defaults.
3. **Payload / Request Size Limits**:
   - Base64 QR code and body inputs should enforce reasonable size limits to prevent Denial of Service (DoS) via memory exhaustion.
4. **Rate Limiting on Scanner Endpoints**:
   - Scanner endpoints (`/api/scan/*`) perform CPU-intensive parsing (image decoding, URL regexes). Ensure rate-limiting protects against abuse.
5. **Scanner Reliability & Threshold Review**:
   - Verify detection scoring stability, homograph punycode normalization, error fallbacks, and test coverage across detection units.
6. **Environment Variable Validation**:
   - Add explicit runtime validation for required environment variables (`NEXTAUTH_SECRET`, `DATABASE_URL`) to fail fast with helpful messages rather than crashing cryptically.

---

*Report created: 2026-11-24*
