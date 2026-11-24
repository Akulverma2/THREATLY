# THREATLY — Autonomous Cybersecurity Threat Detection & Intelligence Platform

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](https://github.com/Akulverma2/THREATLY)
[![Tests](https://img.shields.io/badge/Tests-61%2F61%20Passing-success.svg)](https://github.com/Akulverma2/THREATLY)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black.svg?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19.3-indigo.svg?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3.3-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)

THREATLY is a modern, modular cybersecurity threat analysis platform designed to identify, analyze, and mitigate digital threats across multiple attack vectors. Built with Next.js 16 (App Router), React 19, TypeScript, and Prisma ORM, THREATLY delivers real-time heuristic scanning for suspicious URLs, phishing emails, social engineering messages, and malicious QR codes.

---

## Table of Contents

- [Project Introduction](#project-introduction)
- [Key Features](#key-features)
- [UI Showcase & Screenshots](#ui-showcase--screenshots)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Quick Start & Installation](#quick-start--installation)
- [Environment Variables](#environment-variables)
- [Database & Schema](#database--schema)
- [Development Commands](#development-commands)
- [Testing & Quality Verification](#testing--quality-verification)
- [Security Architecture](#security-architecture)
- [Deployment Guide](#deployment-guide)
- [Repository Structure](#repository-structure)
- [Contributors](#contributors)
- [Academic Context](#academic-context)
- [Roadmap & Future Enhancements](#roadmap--future-enhancements)
- [License](#license)

---

## Project Introduction

Modern cyber attacks frequently cross multiple communication boundaries — phishing links delivered via SMS (smishing), counterfeit brand portals embedded in QR codes (quishing), and fraudulent executive requests sent through forged email headers. 

**THREATLY** provides a centralized, defense-in-depth platform for organizations and security analysts to evaluate incoming digital inputs in real time. Rather than relying solely on slow external database queries, THREATLY incorporates deterministic, server-side heuristic analysis engines that instantly break down URLs, email structures, text patterns, and barcode matrices to calculate transparent risk scores with actionable security recommendations.

---

## Key Features

### 1. Multi-Vector Threat Detection Engine
- **URL Phishing & Malware Scanner:** Evaluates domains for suspicious top-level domains (TLDs), RFC 1918 private/loopback IP SSRF vectors, Levenshtein distance brand typosquatting, URL shorteners, and credential harvesting keywords.
- **Email Header & Body Analyzer:** Detects SPF/DKIM authentication anomalies, sender display-name spoofing, dangerous attachment extensions (`.exe`, `.scr`, `.vbs`, `.iso`), and urgent financial transfer lures.
- **SMS & Message Smishing Scanner:** Analyzes short messaging formats for urgency triggers, one-time password (OTP) theft lures, fake courier/package delivery alerts, and embedded telephone numbers.
- **QR Code Matrix Scanner:** Decodes PNG image payloads using `pngjs` and `jsqr`, extracts underlying data strings, and executes recursive threat analysis on embedded destinations.

### 2. Transparent Risk Scoring & Verdicts
- **Deterministic 0–100 Risk Score:** Every analyzed input receives a normalized numerical score mapped to three standard severity classifications:
  - **`SAFE`** (Score: 0–24)
  - **`SUSPICIOUS`** (Score: 25–74)
  - **`MALICIOUS`** (Score: 75–100)
- **Detailed Finding Indicators:** Provides human-readable forensic explanations detailing exactly why an input was flagged.
- **Actionable Guidance:** Automatically generates context-aware containment and mitigation recommendations.

### 3. Identity, RBAC & Telemetry
- **Role-Based Access Control (RBAC):** Supports distinct `USER` and `ADMIN` operational profiles.
- **Interactive Dashboards:** Authenticated users access complete personal scan histories and threat telemetry breakdowns.
- **Admin Management Console:** System administrators can review system-wide analytics, manage user account statuses (`ACTIVE`, `INACTIVE`, `SUSPENDED`), and monitor immutable audit logs.
- **Sliding-Window Rate Limiting:** Enforces in-memory request thresholds across authentication, registration, and scanner endpoints to defend against brute force and resource exhaustion.

---

## UI Showcase & Screenshots

THREATLY features a responsive cyber-intelligence visual design complete with real-time canvas radars, telemetry grids, and intuitive data visualizations.

For full screenshot specifications and visual previews, see the [Screenshot Documentation](docs/screenshots/README.md).

```text
docs/screenshots/
├── 01-landing-hero.png       # Landing Hero & Live Threat Metrics
├── 02-threat-radar.png       # Canvas Real-Time Threat Radar Sweep
├── 03-scanner-url.png        # Unified Multi-Vector URL Scanner Interface
├── 04-scanner-email.png      # Email Spoofing & Phishing Forensic Report
├── 05-scanner-message.png    # SMS Smishing & Social Engineering Analysis
├── 06-scanner-qr.png         # QR Code Matrix Extraction & Destination Audit
├── 07-user-dashboard.png     # User Telemetry & Scan History View
└── 08-admin-dashboard.png    # Admin Analytics & User Management Portal
```

---

## Technology Stack

| Layer | Technologies | Version |
|---|---|---|
| **Frontend Framework** | [Next.js](https://nextjs.org/) (App Router, Turbopack) | `16.4.6` |
| **UI Library** | [React](https://react.dev/) | `19.3.0` |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `5.9.3` |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | `4.3.3` |
| **Animations & Charts** | [Framer Motion](https://www.framer.com/motion/) · [Recharts](https://recharts.org/) | `^14.14.0` · `^3.11.0` |
| **State Management** | [Redux Toolkit](https://redux-toolkit.js.org/) | `^2.15.0` |
| **Database & ORM** | [Prisma ORM](https://www.prisma.io/) · [PostgreSQL](https://www.postgresql.org/) ([Neon](https://neon.tech)) | `^6.19.3` |
| **Authentication** | [NextAuth.js](https://authjs.dev/) (Auth.js v5 Beta) | `^5.0.0-beta.32` |
| **Password Hashing** | [bcryptjs](https://www.npmjs.com/package/bcryptjs) (12 rounds) | `^3.0.3` |
| **Image & QR Parsing** | [jsqr](https://github.com/cozmo/jsQR) · [pngjs](https://github.com/lukeapage/pngjs) | `^1.4.0` · `^7.0.0` |
| **Testing** | [Vitest](https://vitest.dev/) | `^3.2.4` |

---

## System Architecture

THREATLY adheres to a layered Next.js 16 App Router architecture separating presentation, edge security filtering, API routing, heuristic threat computation, and relational persistence.

```mermaid
flowchart TD
    subgraph Client["Client Tier (Browser)"]
        UI["App Router Pages\n(/, /scanner, /dashboard, /admin)"]
        Redux["Redux Toolkit Store\n(Telemetry State)"]
        Radar["Threat Radar Canvas\n(Sweep Animation)"]
    end

    subgraph Security["Edge & Middleware Tier (src/middleware.ts)"]
        SecHeaders["Security Headers Engine\n(CSP, HSTS, X-Frame, CORS)"]
        RBAC["Route RBAC Guard\n(User / Admin Session Check)"]
        RateLimit["Rate Limiter\n(Sliding Window Token Bucket)"]
    end

    subgraph API["Server API Tier"]
        AuthRoute["NextAuth Session Handler\n(/api/auth/[...nextauth])"]
        RegRoute["Registration Handler\n(/api/register)"]
        ScanRoute["Scanner Endpoints\n(/api/scan/{url, email, message, qr})"]
        AdminRoute["Admin Endpoints\n(/api/admin/{stats, users, audit})"]
    end

    subgraph Engine["Threat Detection Engine (src/lib/detection)"]
        URLEngine["URL Analyzer\n(Heuristics, Levenshtein, TLD, IP check)"]
        EmailEngine["Email Analyzer\n(Header forgery, Spoofing, Keywords)"]
        MsgEngine["Message Analyzer\n(Urgency triggers, Smishing lures)"]
        QREngine["QR Analyzer\n(PNG decoding, jsqr matrix parser)"]
    end

    subgraph Storage["Persistence Tier"]
        PrismaClient["Prisma Client 6.19.3"]
        Postgres[("Neon PostgreSQL\n(Users, Scans, AuditLogs)")]
    end

    UI --> Security
    Security --> API
    ScanRoute --> Engine
    API --> PrismaClient --> Postgres
```

For complete architecture diagrams and component interactions, read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Quick Start & Installation

### Prerequisites
- **Node.js:** v20.x or v22.x LTS (compatible with Node.js 24+)
- **npm:** v10.x+
- **PostgreSQL:** Local PostgreSQL 15+ or a cloud database instance on [Neon](https://neon.tech)

### 1. Clone & Install
```powershell
# Clone the repository
git clone https://github.com/Akulverma2/THREATLY.git
cd THREATLY

# Install dependencies
npm install
```

### 2. Configure Environment
Copy `.env.example` to create your local `.env` file:
```powershell
# Windows PowerShell
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Edit `.env` to configure your database connection string and NextAuth secret:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/threatly?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/threatly?schema=public"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Initialize Database & Start Server
```powershell
# Apply database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser. For detailed setup troubleshooting, read [docs/SETUP.md](docs/SETUP.md).

---

## Environment Variables

| Variable | Required | Default | Purpose |
|---|:---:|---|---|
| `DATABASE_URL` | **Yes** | — | Connection-pooled PostgreSQL connection string used at runtime. |
| `DIRECT_URL` | **Yes** | — | Direct non-pooled PostgreSQL connection string used for schema migrations. |
| `AUTH_SECRET` | **Yes** (Prod) | — | 32-byte secret used to sign NextAuth v5 JWT session cookies. |
| `NEXTAUTH_URL` | No (Rec.) | Inferred | Canonical HTTPS deployment URL (e.g. `https://yourdomain.com`). |
| `RATE_LIMIT_SCAN_MAX` | No | `30` | Max scan requests per IP per minute. |
| `GOOGLE_SAFE_BROWSING_API_KEY` | No | Empty | External threat feed enrichment. |
| `VIRUSTOTAL_API_KEY` | No | Empty | External domain reputation enrichment. |

For the complete environment variable reference, see [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md).

---

## Database & Schema

THREATLY uses Prisma ORM connected to PostgreSQL. The schema manages user authentication, scan telemetry, and administrative audit trails.

```text
prisma/schema.prisma
├── User                  # User accounts, credentials (bcrypt), role, total scan count
├── Account               # OAuth / Provider accounts
├── Session               # NextAuth sessions
├── VerificationToken     # Verification tokens
├── Scan                  # Stored threat telemetry, risk scores, findings, classification
├── ThreatIntelCache      # Cached threat feed lookups with TTL
└── AuditLog              # Administrative actions and security events
```

For schema details and entity-relationship diagrams, see [docs/DATABASE.md](docs/DATABASE.md).

---

## Development Commands

All development commands are defined in `package.json` and verified:

```powershell
# Start local development server (with Turbopack)
npm run dev

# Run full Vitest automated regression test suite (61 tests)
npx vitest run src/__tests__/detection/ src/__tests__/unit/ src/__tests__/api/routes-auth.test.ts src/__tests__/api/routes-register.test.ts

# Execute TypeScript typechecking
npx tsc --noEmit

# Execute ESLint verification
npm run lint

# Build production application bundle
npm run build

# Start production server
npm run start
```

---

## Testing & Quality Verification

THREATLY is verified using [Vitest](https://vitest.dev/):

```text
 Test Files  8 passed (8)
      Tests  61 passed (61)
   Duration  1.60s
```

### Verified Test Breakdown
- **URL Detection Engine (10 tests):** Verifies RFC 1918 private IP blocking, Levenshtein typosquatting, TLD heuristics.
- **Email Detection Engine (11 tests):** Verifies header forgery, display-name spoofing, dangerous attachment alerts.
- **Message Detection Engine (9 tests):** Verifies SMS smishing patterns, urgency triggers, package delivery lures.
- **QR Code Engine (2 tests):** Verifies PNG decoding, matrix barcode parsing via `jsqr`.
- **Database Isolation (7 tests):** Enforces that test runs cannot accidentally contact the production database.
- **Rate Limiting Middleware (3 tests):** Verifies sliding-window thresholds and HTTP 429 emissions.
- **API Authentication & RBAC (10 tests):** Verifies machine-readable JSON 401/403 errors on API routes and redirects on page routes.
- **Registration Handler (9 tests):** Verifies Zod constraints, duplicate email handling, and password length bounds to prevent bcrypt DoS.

*Note: Three legacy integration tests requiring live test-database connectivity (`auth.test.ts`, `authorization.test.ts`, `register.test.ts`) remain categorized as BLOCKED / NOT EXECUTED due to unreachable test branch DNS; all authentication flows are fully verified via mocked API test suites.*

For complete testing instructions, read [docs/TESTING.md](docs/TESTING.md).

---

## Security Architecture

- **Strict Content Security Policy (CSP):** Eliminates unsafe scripts and restricts framing via `frame-ancestors 'none'`.
- **REST API Route Protection:** Unauthenticated API requests receive HTTP 401/403 JSON payloads rather than HTML login page redirects.
- **Bcrypt DoS Defense:** Passwords capped at 128 characters to mitigate CPU exhaustion attacks during password hashing.
- **IP Rate Limiting:** Sliding-window rate limiting on login, registration, and scan endpoints.
- **Database Isolation:** Programmatic safeguards prevent tests from executing against production connection strings.

For the full security architecture and threat model, read [docs/SECURITY.md](docs/SECURITY.md).

---

## Deployment Guide

THREATLY is optimized for production deployment on **Vercel** with a serverless **Neon PostgreSQL** database.

### Pre-Deployment Summary
1. Set `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) in Vercel Environment Variables.
2. Generate and set `AUTH_SECRET` using `openssl rand -base64 32`.
3. Set `NEXTAUTH_URL` to your production HTTPS domain.
4. Execute `npx prisma migrate deploy` to apply baseline migrations.

For complete step-by-step instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Repository Structure

```text
THREATLY/
├── .env.example             # Clean environment variable template
├── .gitignore               # Strict secret and build artifact exclusions
├── package.json             # Scripts and production/development dependencies
├── next.config.ts           # Next.js configuration (Turbopack, CSS rules)
├── tsconfig.json            # TypeScript configuration
├── vitest.config.ts         # Vitest test framework configuration
├── prisma/
│   ├── schema.prisma        # Prisma ORM data models and PostgreSQL datasource
│   └── migrations/          # Version-controlled SQL migration history
├── docs/                    # Technical documentation
│   ├── ARCHITECTURE.md      # In-depth system architecture & data flows
│   ├── SETUP.md             # Developer environment setup & troubleshooting
│   ├── ENVIRONMENT_VARIABLES.md # Detailed environment variables specification
│   ├── DATABASE.md          # Schema models, relationships & safety rules
│   ├── TESTING.md           # Test suite architecture & verification matrix
│   ├── SECURITY.md          # Threat model & defensive controls
│   ├── DEPLOYMENT.md        # Vercel & Neon production deployment guide
│   ├── ACADEMIC_SUBMISSION.md # Academic coursework submission record
│   └── screenshots/         # UI showcase guide & asset placeholders
├── src/
│   ├── middleware.ts        # Global security headers & RBAC route protection
│   ├── app/                 # Next.js App Router (pages & REST API handlers)
│   ├── components/          # Reusable UI components (ThreatRadar, BinaryRain, ScannerTabs)
│   ├── lib/
│   │   ├── auth.ts          # NextAuth v5 configuration & JWT callbacks
│   │   ├── prisma.ts        # Prisma client proxy with database isolation safeguards
│   │   └── detection/       # Core heuristic detection engines (URL, Email, Message, QR)
│   ├── middleware/          # Rate limiting middleware & sliding window logic
│   ├── store/               # Redux Toolkit global telemetry store
│   └── __tests__/           # Vitest unit, regression, and API test suites
└── audit/                   # Historical project audit and verification reports
```

---

## Contributors

THREATLY was collaboratively designed, architected, and implemented by:

- **Akul Verma** — Project Co-Creator & Engineer
- **Granth Panwar** — Project Co-Creator & Engineer

---

## Academic Context

This project was developed and submitted for academic evaluation to **Professor Mohammad Zahid**.

Detailed academic submission metadata and student identification records are maintained in [docs/ACADEMIC_SUBMISSION.md](docs/ACADEMIC_SUBMISSION.md).

---

## Roadmap & Future Enhancements

- [ ] **Distributed Rate Limiting:** Implement Upstash Redis store for multi-region serverless cluster rate limiting.
- [ ] **Real-Time Threat Intelligence Webhooks:** Automated alerts to Slack and Microsoft Teams when high-risk indicators are discovered.
- [ ] **Batch File & Archive Inspection:** Expand scanner engine to unpack and inspect `.zip` and `.tar` archives for malicious scripts.
- [ ] **Public Threat Intelligence API:** Authenticated REST API with developer API keys for automated threat lookups.

---

## License

This repository currently has no declared open-source license. All rights are reserved by the project creators.
