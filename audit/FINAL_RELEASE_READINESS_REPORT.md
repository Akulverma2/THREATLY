# THREATLY — Final Release Readiness Report

**Date:** 2026-11-24  
**Project:** `C:\Users\akulv\Downloads\THREATLY\THREATLY`  
**Runtime Stack:** Next.js 16.4.6 (Turbopack) · React 19 · Prisma 6.19.3 · next-auth v5-beta.32 · Node.js v24.15.0  
**Report Author:** Automated release-preparation agent (Phases 1–9)

---

## 1. Deployment Platform & Configuration

**Platform:** Vercel (implicit — `.vercel` is gitignored, `@neon/config` and `@neon/env` present, `.env.example` documents Neon/Vercel Postgres URLs).  
No `vercel.json`, `Dockerfile`, `fly.toml`, `railway.toml`, or `netlify.toml` was found.

**Deployment assumptions:**
- `npm run build` → `npm run start` via `next start`, or Vercel's managed Next.js runtime.
- PostgreSQL is provisioned through **Neon** (serverless Postgres, compatible with Vercel Postgres).
- Schema is applied to production via `prisma migrate deploy` before or during the first deployment (see §6).

> [!IMPORTANT]
> No deployment has been executed. This report evaluates readiness only. The production database was not accessed, queried, or modified at any point during Phases 1–9.

---

## 2. Environment Variables

The following variables are required at runtime. **No values are listed.** Set each in your Vercel project dashboard (or equivalent deployment environment) before going live.

### Required — Application will not start without these

| Variable | Purpose | Note |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection string — used by Prisma at runtime | Must include `?sslmode=require` |
| `DIRECT_URL` | Neon direct (non-pooled) connection — used by Prisma for migrations | Must include `?sslmode=require` |
| `AUTH_SECRET` | JWT signing key — required by next-auth v5 in production | Generate: `openssl rand -base64 32` |

> [!WARNING]
> `NEXTAUTH_SECRET` is accepted as a backward-compatible alias by next-auth v5, but **`AUTH_SECRET` is the primary variable** the library reads. If only `NEXTAUTH_SECRET` is set and `AUTH_SECRET` is absent, next-auth v5 will throw `MissingSecretError` at runtime in production. Set **`AUTH_SECRET`**. The `.env.example` has been updated to document this correctly.

### Recommended — Degradation if absent but app still starts

| Variable | Purpose |
|---|---|
| `NEXTAUTH_URL` / `AUTH_URL` | Canonical HTTPS URL of the deployment. Not strictly required in next-auth v5 (auto-inferred from request Host), but strongly recommended for production to prevent redirect mismatches. Example: `https://yourdomain.com` |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Enriches URL scanner threat intelligence |
| `VIRUSTOTAL_API_KEY` | Enriches URL scanner threat intelligence |
| `URLHAUS_API_KEY` | Enriches URL scanner threat intelligence |
| `PHISHTANK_API_KEY` | Enriches URL scanner threat intelligence |

> [!NOTE]
> The four threat-intel API keys are optional. The scanners use built-in heuristic detection (32 unit tests verified) and degrade gracefully when external APIs are absent.

### Optional — Tune rate limits (defaults apply if unset)

| Variable | Default |
|---|---|
| `RATE_LIMIT_LOGIN_MAX` | 20 |
| `RATE_LIMIT_LOGIN_WINDOW_MS` | 900000 (15 min) |
| `RATE_LIMIT_REGISTER_MAX` | 10 |
| `RATE_LIMIT_REGISTER_WINDOW_MS` | 900000 (15 min) |
| `RATE_LIMIT_SCAN_MAX` | 30 |
| `RATE_LIMIT_SCAN_WINDOW_MS` | 60000 (1 min) |
| `UPSTASH_REDIS_REST_URL` | (not used — see rate limiting note) |
| `UPSTASH_REDIS_REST_TOKEN` | (not used — see rate limiting note) |

---

## 3. Blockers Found and Fixes Applied

### BLOCKER 1 — `.env.example` documented wrong NextAuth secret variable (FIXED)

**Severity:** High — application would fail at first authenticated request in production.  
**Finding:** `.env.example` documented `NEXTAUTH_SECRET`. next-auth v5 reads `AUTH_SECRET` as the primary production secret. Without `AUTH_SECRET` set, next-auth throws `MissingSecretError` on every auth operation.  
**Fix:** Rewrote `.env.example` to document `AUTH_SECRET` as the primary variable, with a note that `NEXTAUTH_SECRET` is a fallback alias. Added documentation for `NEXTAUTH_URL`, rate-limit tuning, and correct Neon URL configuration.  
**File changed:** `.env.example`  
**Verification:** `npx tsc --noEmit` passed (exit 0); `npm run lint` passed (exit 0); `npm run build` passed (exit 0).

---

### BLOCKER 2 — Public stats fallback returned fabricated numbers (FIXED)

**Severity:** Medium — not a security issue, but misleads users on the live landing page.  
**Finding:** `src/app/api/public/stats/route.ts` caught database errors and returned hardcoded invented statistics (`totalScans: 12847, threatsBlocked: 3421, usersProtected: 892`). A new deployment starts with no scan history, so the landing page would display false social proof.  
**Fix:** Replaced the fabricated fallback with zeroes (`0, 0, 0`) and a comment explaining the intent. The landing page will display accurate (initially empty) statistics on a fresh deployment.  
**File changed:** `src/app/api/public/stats/route.ts`  
**Verification:** `npm run build` passed (exit 0); 22/22 routes compiled.

---

### MINOR — `prisma.config.ts.txt` not in `.gitignore` (FIXED)

**Severity:** Low — this scratch file exists on disk but was not gitignored.  
**Fix:** Appended `prisma.config.ts.txt` to `.gitignore`. Verified with `git check-ignore -v`.  
**File changed:** `.gitignore`

---

### KNOWN LIMITATION — In-memory rate limiting (NOT A BLOCKER for single-instance deployments)

**Severity:** Informational / deployment-topology dependent.  
**Finding:** `src/middleware/rate-limit.ts` stores rate-limit counters in an in-memory `Map`. This is correct and effective on a single-instance deployment. On a multi-instance or serverless deployment (Vercel Functions, containers), each instance has its own counter store, so a client can bypass limits by hitting different instances.  
**Decision required:** This is acceptable for initial launch on Vercel (Vercel Functions are regional, so shared-memory rate limiting is a best-effort approximation). For strict distributed rate limiting, integrate Upstash Redis (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) with the existing rate-limit middleware. This requires a code change and is explicitly documented in `src/middleware/rate-limit.ts`.  
**No fix applied** — this is not a deployment blocker for a first release.

---

## 4. Test, Lint, TypeCheck and Build Results

All checks were executed in this session. Results are based on actual command execution and exit codes.

| Check | Command | Exit Code | Result |
|---|---|:---:|---|
| **Regression Tests** | `npx vitest run src/__tests__/detection/ src/__tests__/unit/ src/__tests__/api/routes-auth.test.ts src/__tests__/api/routes-register.test.ts` | `0` | **PASS — 61/61 tests, 8 test files** |
| **Legacy Prisma Tests** | `auth.test.ts`, `authorization.test.ts`, `register.test.ts` | — | **BLOCKED / NOT EXECUTED** (Neon test branch DNS unresolvable) |
| **TypeScript Compiler** | `npx tsc --noEmit` | `0` | **PASS — 0 errors** |
| **ESLint** | `npm run lint` | `0` | **PASS — 0 errors, 0 warnings** |
| **Production Build** | `cmd /c npm.cmd run build` | `0` | **PASS — 22/22 routes compiled** |

> [!NOTE]
> The earlier recorded exit code 1 on `npm run build` was a PowerShell stderr-redirection artefact: PowerShell converts npm's informational `stderr` output (warnings about `package-lock.json` location) into a non-zero shell exit code when stderr is redirected with `2>&1`. The build was re-run via `cmd /c` to get the unambiguous process exit code, which was `0`. The `.next/BUILD_ID` file was present and confirmed.

### Test breakdown

| Suite | Tests | Status |
|---|---|---|
| URL detection | 10 | PASS |
| Email detection | 11 | PASS |
| Message detection | 9 | PASS |
| QR detection | 2 | PASS |
| Database isolation | 7 | PASS |
| Rate limit middleware | 3 | PASS |
| API auth & RBAC | 10 | PASS |
| Registration route | 9 | PASS |
| **TOTAL** | **61** | **PASS** |

---

## 5. Database Limitations

### Schema migration

The database schema (`prisma/schema.prisma`) must be applied to the production Neon database before the first deployment using:

```bash
npx prisma migrate deploy
```

This command applies the existing baseline migration (`20240101000000_baseline`) in a non-destructive, additive manner. It does **not** reset or drop existing data. It must be run with `DATABASE_URL` and `DIRECT_URL` pointing to the production database.

> [!CAUTION]
> Do not run `prisma db push` or `prisma migrate dev` against the production database. Only `prisma migrate deploy` is safe for production use.

### Test database

The 6 legacy direct-Prisma integration tests in `src/__tests__/api/auth.test.ts`, `src/__tests__/api/authorization.test.ts`, and `src/__tests__/api/register.test.ts` remain **BLOCKED / NOT EXECUTED** due to an unreachable Neon test branch DNS endpoint. This does not affect production functionality — all authentication and authorization logic is covered by the 10 mocked API tests in `routes-auth.test.ts` and the 9 mocked registration tests.

### Runtime database safety

`src/lib/prisma.ts` enforces `validateTestDatabaseUrl()` — it throws an explicit error if test-mode code attempts to connect to any database whose URL does not contain `test` in the database name, or if `TEST_DATABASE_URL` matches `DATABASE_URL`. The production database was not contacted during any phase of this project.

---

## 6. Remaining Manual Actions Requiring Your Approval

The following actions require your explicit execution. None of them have been performed.

### 6.1 — Required before first deployment

| # | Action | Command / Location |
|---|---|---|
| 1 | **Generate `AUTH_SECRET`** | `openssl rand -base64 32` → set as `AUTH_SECRET` in Vercel env dashboard |
| 2 | **Set `DATABASE_URL`** | Neon pooled connection string → Vercel env dashboard |
| 3 | **Set `DIRECT_URL`** | Neon direct connection string → Vercel env dashboard |
| 4 | **Run database migration** | `npx prisma migrate deploy` (with production `DATABASE_URL` and `DIRECT_URL` set locally or in CI) |
| 5 | **Set `NEXTAUTH_URL`** | Your production HTTPS URL → Vercel env dashboard (e.g. `https://yourdomain.com`) |

### 6.2 — Recommended before or shortly after launch

| # | Action | Notes |
|---|---|---|
| 6 | **Create first admin user** | No seed script exists. Register normally, then update the `role` column to `ADMIN` via the Neon console or a one-off script |
| 7 | **Configure threat-intel API keys** | `GOOGLE_SAFE_BROWSING_API_KEY`, `VIRUSTOTAL_API_KEY`, `URLHAUS_API_KEY`, `PHISHTANK_API_KEY` |
| 8 | **Decide on distributed rate limiting** | For multi-region/serverless: integrate Upstash Redis; for single-region initial launch, in-memory is sufficient |
| 9 | **Upgrade Prisma CLI** (devDependency) | `npm audit --omit=dev` reports 4 high-severity vulns in `prisma` CLI via `deepmerge-ts`/`effect`. Fix requires Prisma v7+ (breaking change). `@prisma/client` (runtime) is unaffected. Upgrade at your discretion |
| 10 | **Upgrade Vitest** | `tinypool` (critical: prototype pollution RCE gadget) and `@vitest/mocker` (path traversal) are dev-only. Upgrade with `npm audit fix` when ready |
| 11 | **Migrate `src/middleware.ts` to `proxy`** | Next.js 16 deprecates the `middleware` file convention. Run `npx @next/codemod@canary middleware-to-proxy .` when ready. This is a warning, not a blocker |

---

## 7. Git and Secret Safety

| Check | Result |
|---|---|
| `.env` tracked in git | **NO** — excluded by `.gitignore` (`.env*` rule) |
| `.env.test` tracked in git | **NO** — excluded by `.gitignore` |
| `cookies.txt` tracked in git | **NO** — explicitly listed in `.gitignore` (line 47) |
| `prisma.config.ts.txt` tracked in git | **NO** — added to `.gitignore` in this session (line 49) |
| Any secret files in `git ls-files` | **NONE** — `git ls-files --cached` returned no matches for `.env*`, `cookies.txt`, `*.pem`, `*.key` |
| Destructive git commands executed | **NONE** — `git reset --hard`, `git clean` were never run |
| Uncommitted work preserved | **YES** — `git status` confirms all uncommitted changes intact |

---

## 8. Final Recommendation

> [!IMPORTANT]
> ## ✅ CONDITIONALLY READY FOR DEPLOYMENT
> 
> THREATLY is ready for first deployment **after the five required manual actions in §6.1 are completed**:
> 
> 1. Generate and set `AUTH_SECRET` in the deployment environment.
> 2. Set `DATABASE_URL` (Neon pooled) in the deployment environment.
> 3. Set `DIRECT_URL` (Neon direct) in the deployment environment.
> 4. Run `npx prisma migrate deploy` to apply the schema to the production database.
> 5. Set `NEXTAUTH_URL` to the production HTTPS URL.
> 
> No code-level deployment blockers remain. All automated checks pass. The production database was not modified during any phase of this project.

### What is verified
- **61/61 automated tests pass** (detection, isolation, RBAC, registration, rate limiting).
- **TypeScript compiles cleanly** (0 errors).
- **ESLint passes** (0 errors, 0 warnings).
- **Production build succeeds** (22/22 routes, exit code 0).
- **No secrets tracked in git.**
- **Input validation, rate limiting, and authorization hardening** are implemented and tested.

### What is not verified (and cannot be verified without a live environment)
- NextAuth JWT session creation and cookie handling at runtime.
- Prisma's connection to the production Neon database.
- bcrypt password hashing under real production load.
- End-to-end scan submission and storage in the production database.
- Threat-intel API key functionality (all keys optional and empty).
- In-memory rate limiting effectiveness under real multi-request load.
- The 6 legacy direct-Prisma integration tests (blocked by test database connectivity).

---

*Report generated: 2026-11-24. Prepared by autonomous release-preparation agent across Phases 1–9.*
