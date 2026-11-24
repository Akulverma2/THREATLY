# THREATLY — Local Development & Setup Guide

This guide walks you through setting up, configuring, and running THREATLY on your local development machine.

---

## 1. Prerequisites

Ensure the following tools are installed on your workstation:

- **Node.js:** v20.x or v22.x LTS (tested with Node.js v24.15.0).
- **Package Manager:** `npm` v10.x or newer (included with Node.js).
- **Git:** Git 2.30+ installed.
- **Database:** A PostgreSQL instance (either local PostgreSQL 15+, Docker container, or a cloud PostgreSQL instance such as [Neon](https://neon.tech)).
- **Operating System:** Windows 10/11 (PowerShell), macOS, or Linux.

---

## 2. Clone the Repository

Clone the project to your local workstation:

```powershell
# Using Windows PowerShell
git clone https://github.com/Akulverma2/THREATLY.git
Set-Location THREATLY
```

```bash
# Using macOS / Linux / Git Bash
git clone https://github.com/Akulverma2/THREATLY.git
cd THREATLY
```

---

## 3. Install Dependencies

Install all required production and development dependencies:

```powershell
npm install
```

This installs Next.js 16, React 19, Tailwind CSS 4, Prisma ORM, NextAuth v5, Vitest, and supporting packages.

---

## 4. Configure Environment Variables

Create your local `.env` file by copying the provided `.env.example` template:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# macOS / Linux / Git Bash
cp .env.example .env
```

Open `.env` in your code editor and configure the values:

```env
# 1. Database Connection (PostgreSQL)
# For local PostgreSQL:
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/threatly_dev?schema=public"
DIRECT_URL="postgresql://postgres:yourpassword@localhost:5432/threatly_dev?schema=public"

# 2. NextAuth Secret (Required in production, recommended in dev)
# Generate a secure key using: openssl rand -base64 32
AUTH_SECRET="your-generated-32-byte-base64-secret"

# 3. Canonical Application URL
NEXTAUTH_URL="http://localhost:3000"

# 4. Optional Threat Intelligence APIs (Leave empty to use built-in heuristics)
GOOGLE_SAFE_BROWSING_API_KEY=""
VIRUSTOTAL_API_KEY=""
URLHAUS_API_KEY=""
PHISHTANK_API_KEY=""
```

> [!WARNING]
> Never commit your `.env` file to version control. The repository `.gitignore` is configured to prevent accidental commits of `.env` files.

---

## 5. Initialize the Database

Generate the Prisma Client and apply migrations to your local or development database:

```powershell
# Generate Prisma Client types
npx prisma generate

# Apply existing migrations to your development database
npx prisma migrate dev
```

*Note: If connecting to an existing database with the schema already created, you can use `npx prisma migrate deploy`.*

---

## 6. Run the Development Server

Start the Next.js development server with Turbopack:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

### Available Navigation Endpoints
- **Landing Page & Live Radar:** `http://localhost:3000`
- **Unified Threat Scanner:** `http://localhost:3000/scanner`
- **User Dashboard:** `http://localhost:3000/dashboard` (requires login)
- **Admin Portal:** `http://localhost:3000/admin` (requires user with `ADMIN` role)
- **User Authentication:** `http://localhost:3000/login` & `http://localhost:3000/register`
- **Platform Architecture & About:** `http://localhost:3000/about`

---

## 7. Running Quality & Verification Checks

Execute the following commands to verify code quality, typing, and test suites:

```powershell
# Run the automated test suite (61 tests across 8 suites)
npx vitest run src/__tests__/detection/ src/__tests__/unit/ src/__tests__/api/routes-auth.test.ts src/__tests__/api/routes-register.test.ts

# Run the TypeScript compiler check
npx tsc --noEmit

# Run ESLint check
npm run lint

# Build the production application bundle
npm run build
```

---

## 8. Common Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `PrismaClientInitializationError` | Database unreachable or credentials invalid in `.env` | Verify PostgreSQL is running and test the connection string with a database client. |
| `MissingSecretError` | `AUTH_SECRET` is unset in production environment | Set `AUTH_SECRET` using `openssl rand -base64 32` in your `.env` file. |
| PowerShell script execution error (`PSSecurityException`) | Execution policy restricts running npm scripts | Run PowerShell as Administrator and execute `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`. |
| Port 3000 already in use | Another service is using port 3000 | Run Next.js on a different port: `npx next dev -p 3001`. |
