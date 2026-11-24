# THREATLY — Production Deployment Guide

This guide details the procedure for deploying THREATLY to production on [Vercel](https://vercel.com) with a serverless [Neon](https://neon.tech) PostgreSQL database.

---

## 1. Deployment Architecture

THREATLY is optimized for serverless edge deployment:
- **Application Host:** Vercel (Next.js 16 App Router runtime).
- **Database Host:** Neon (Serverless PostgreSQL with connection pooling).
- **Session Management:** Stateless NextAuth JWTs stored in secure HTTP-only cookies.
- **Static Assets:** Optimized automatically via Vercel CDN and Next.js Image Optimization.

---

## 2. Pre-Deployment Checklist

Before deploying, verify the following prerequisites:

- [ ] A Neon PostgreSQL project is provisioned with a dedicated production database.
- [ ] You have both connection strings:
  - Pooled connection string (`DATABASE_URL`, using `-pooler` endpoint).
  - Direct connection string (`DIRECT_URL`, non-pooled endpoint).
- [ ] A secure 32-byte cryptographic secret is generated for `AUTH_SECRET`.
- [ ] All local tests pass: `npx vitest run ...` (61 tests pass).
- [ ] TypeScript compiles cleanly: `npx tsc --noEmit` (0 errors).
- [ ] ESLint check passes: `npm run lint` (0 errors).
- [ ] Production build succeeds locally: `npm run build` (22/22 routes).

---

## 3. Step-by-Step Deployment Instructions

### Step 1: Push Repository to GitHub
Push your verified code to your GitHub repository:

```powershell
git push -u origin master
```

### Step 2: Import Project into Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Select your `THREATLY` GitHub repository and click **Import**.
4. Framework Preset: Leave as **Next.js**.
5. Root Directory: `./` (leave default).

### Step 3: Configure Environment Variables
In the Vercel project configuration screen, expand **Environment Variables** and add the following:

| Key | Value Description | Example / Notes |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection string | `postgresql://user:pass@ep-xyz-pooler.neon.tech/threatly?sslmode=require` |
| `DIRECT_URL` | Neon direct connection string | `postgresql://user:pass@ep-xyz.neon.tech/threatly?sslmode=require` |
| `AUTH_SECRET` | 32-byte base64 secret | Generated via `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production HTTPS URL | `https://your-threatly-deployment.vercel.app` |

*(Optional) Add external threat intelligence API keys if available:*
- `GOOGLE_SAFE_BROWSING_API_KEY`
- `VIRUSTOTAL_API_KEY`
- `URLHAUS_API_KEY`
- `PHISHTANK_API_KEY`

### Step 4: Apply Database Schema to Production
Before directing live traffic to your deployment, apply the baseline Prisma migrations to your production database. From your local terminal (configured with production credentials) or CI/CD runner:

```powershell
# Set temporary connection strings and deploy migrations
npx prisma migrate deploy
```

> [!CAUTION]
> Always use `npx prisma migrate deploy` for production databases. Never use `prisma migrate reset` or `prisma db push`.

### Step 5: Deploy & Verify
Click **Deploy** in Vercel. Once the build finishes, verify:
1. Landing page loads cleanly: `https://<your-project>.vercel.app/`
2. Authentication works: Navigate to `/register` and create an account.
3. Scanner works: Submit a test URL on `/scanner` and verify that the scan result and database record are created.
4. Promote initial user to administrator if admin access is required (update `role = 'ADMIN'` in the Neon database console).

---

## 4. Current Deployment Status

- **Status:** **CONDITIONALLY READY FOR DEPLOYMENT**
- **Build Status:** Next.js Turbopack build generates 22/22 routes cleanly.
- **Database Status:** Production database migration (`20240101000000_baseline`) is ready to deploy.
- **Live Deployment:** Not yet deployed (pending owner's manual push and Vercel project creation).
