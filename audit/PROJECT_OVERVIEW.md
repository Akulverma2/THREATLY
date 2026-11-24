# AiGuard — Project Overview Report

## 1. Project Structure

**Working Directory:** `/c/Users/akulv/Downloads/THREATLY/THREATLY`

**Root Directory Contents:**
- `.env` — Database and NextAuth configuration (loaded at runtime)
- `.env.example` — Example environment variables with placeholder keys
- `.git/` — Git repository
- `.next/` — Next.js build output (development)
- `node_modules/` — Dependencies (Next.js 16.4.6, React 19, Prisma 6.19.3, etc.)
- `src/` — Application source code
- `prisma/` — Database schema and migrations
- `package.json` — Project dependencies and scripts

## 2. Architecture

### Backend (Next.js 16 App Router)

**Entry Points:**
- `src/app/api/scan/url/route.ts` — URL scanning endpoint (protected by auth)
- `src/app/api/scan/message/route.ts` — Message/SMS scanning endpoint
- `src/app/api/scan/qr/route.ts` — QR code scanning endpoint
- `src/app/api/scan/email/route.ts` — Email scanning endpoint
- `src/app/api/user/me/route.ts` — Current user profile
- `src/app/api/user/scans/route.ts` — User scan history
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handlers
- `src/app/api/admin/` — Admin endpoints (users, stats, audit, disable-user)
- `src/app/api/register/route.ts` — User registration
- `src/middleware.ts` — Request middleware for auth/role checking

### Frontend (Next.js 16 with App Router)

**Pages:**
- `src/app/page.tsx` — Public homepage (marketing/landing)
- `src/app/login/page.tsx` — Login form (credentials auth)
- `src/app/register/page.tsx` — Registration form
- `src/app/dashboard/page.tsx` — Main user dashboard with scanning, history, analytics
- `src/app/admin/page.tsx` — Admin dashboard (users, scans, threats, audit)
- `src/app/about/page.tsx` — About page with team and mission
- `src/app/scanner/page.tsx` — Scanner widget (scanner tabs UI only)
- `src/app/admin/page.tsx` — Admin neural interface

### Core Detection Modules (Pure JS/TS)

| Module | Scanning Type | Key Detection Logic |
|---|---|---|
| `src/lib/detection/url.ts` | URL scanning | Suspicious TLDs, IP hosts, punycode, shorteners, brand impersonation/typosquatting, suspicious keywords, credential-harvesting paths, HTTPS check, percent-encoding |
| `src/lib/detection/email.ts` | Email scanning | Sender validation, display name spoofing, reply-to mismatch, SPF/DKIM/DMARC, subject urgency/credential patterns, body credential harvesting, OTP requests, banking fraud, lottery scams, invoice lures, delivery scams, attachment risk extensions, embedded link analysis, visible text vs href mismatch, per-URL analysis via URL engine (capped at 5 URLs) |
| `src/lib/detection/message.ts` | SMS/scam detection | Scam pattern matching (OTP, lottery, urgency, credential harvesting, embedded links, payment methods) |
| `src/lib/detection/qr.ts` | QR code decoding | Base64 PNG decoding → jsQR → URL analysis if payload looks like URL; otherwise WiFi/vCard/executable payload detection |
| `src/lib/detection/base.ts` | Shared types | Classification enum (SAFE/SUSPICIOUS/MALICIOUS), severity levels, DetectionResult interface, classifyScore(), recommendedAction(), clamp(), confidenceLevel(), makeResult() |

### Database (PostgreSQL via Neon / Prisma ORM)

**Models:**
- `User` — Users with role (USER/ADMIN), status (ACTIVE/INACTIVE/SUSPENDED), scan count, last login
- `Scan` — Scan records with type (URL/QR/MESSAGE/EMAIL), risk score, classification, threat category, reasons, recommended action
- `ThreatIntelCache` — Cached threat intelligence entries
- `Account` — NextAuth OAuth accounts
- `Session` — NextAuth sessions
- `AuditLog` — Audit trail of admin actions

### Key Integrations

- **NextAuth** — Credentials-based authentication with Prisma adapter, JWT strategy
- **Prisma ORM** — Type-safe database access, PostgreSQL connector
- **Recharts** — Charting library for dashboards
- **Framer Motion** — Animation library
- **Tailwind CSS** — Utility-first styling (v4)
- **jsQR** — QR code decoding
- **pngjs** — PNG image parsing for QR code processing

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.4.6 (App Router) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS 4.3.3 |
| UI Components | Framer Motion, Recharts, custom glass/neon themed components |
| Auth | NextAuth 5.0.0-beta.32 with Credentials provider + Prisma adapter |
| ORM | Prisma Client 6.19.3 → PostgreSQL (Neon) |
| Detection | Custom heuristic engines (url.ts, email.ts, message.ts, qr.ts) |
| QR decoding | jsqr + pngjs |
| Voice | Web Speech API (SpeechSynthesis, SpeechRecognition) |
| Charts | Recharts |
| State | Redux Toolkit (v2), React context |

## 4. Application Entry Points

- **Public:** `src/app/page.tsx` → Landing/About page
- **Auth:** `src/app/login/page.tsx` → Login, `src/app/register/page.tsx` → Register
- **Scanner:** `src/app/scanner/page.tsx` → Scanner widget (frontend only, routes to API endpoints)
- **Dashboard:** `src/app/dashboard/page.tsx` → User dashboard with scan history, analytics
- **Admin:** `src/app/admin/page.tsx` → Admin interface (requires ADMIN role)

## 5. Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| next | 16.4.6 | React framework |
| react | 19.3.0 | UI library |
| react-dom | 19.3.0 | DOM rendering |
| prisma | ^6.19.3 | DB ORM |
| @prisma/client | ^6.19.3 | Prisma client |
| next-auth | ^5.0.0-beta.32 | Auth |
| @auth/prisma-adapter | ^2.11.3 | NextAuth-Prisma integration |
| bcryptjs | ^3.0.3 | Password hashing |
| zod | ^4.6.7 | Input validation |
| recharts | ^3.11.0 | Charting |
| framer-motion | ^14.14.0 | Animations |
| jsqr | ^1.4.0 | QR decoding |
| pngjs | ^7.0.0 | PNG parsing |
| qrcode-reader | ^1.0.4 | QR reader (referenced) |

## 6. Detection Engine Capabilities

| Feature | Status | Implementation |
|---|---|---|
| URL scanning | ✅ Fully implemented | `analyzeUrl()` in `src/lib/detection/url.ts` |
| Phishing URL detection | ✅ Fully implemented | Brand impersonation, typosquatting, suspicious TLDs, IP hosts, shorteners |
| Email scanning | ✅ Fully implemented | `analyzeEmail()` in `src/lib/detection/email.ts` |
| SMS/scam detection | ✅ Fully implemented | `analyzeMessage()` in `src/lib/detection/message.ts` |
| QR code scanning | ✅ Fully implemented | `analyzeQr()` in `src/lib/detection/qr.ts` |
| Domain reputation | ⚠️ Partially | Suspicious TLDs and brand matching only |
| IP reputation | ✅ Implemented | Private/reserved IP detection, SSRF risk marking |
| Malware indicators | ⚠️ Partially | Attachment risk extensions only |
| Threat intelligence APIs | ❌ Not connected | Google Safe Browsing, VirusTotal, URLhaus, PhishTank API keys present as placeholders only |
| Rate limiting | ❌ Not implemented | No rate limiting middleware or config |
| Background task queue | ❌ Not implemented | No Celery/RQ or similar |