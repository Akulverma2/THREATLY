# THREATLY — Environment Variables Specification

This document provides a comprehensive reference for all environment variables supported by THREATLY.

---

## 1. Environment Variable Reference

| Variable Name | Required | Target Environment | Default / Fallback | Code Usage | Description |
|---|:---:|:---:|---|---|---|
| `DATABASE_URL` | **Yes** | Dev, Staging, Prod | None | `prisma/schema.prisma`<br>`src/lib/prisma.ts` | Connection-pooled PostgreSQL connection string used by Prisma Client at runtime. Must include `?sslmode=require` on cloud providers like Neon. |
| `DIRECT_URL` | **Yes** | Dev, Staging, Prod | None | `prisma/schema.prisma` | Direct, non-pooled PostgreSQL connection string used exclusively by Prisma during schema migrations (`prisma migrate deploy`). |
| `AUTH_SECRET` | **Yes** (Prod) | Staging, Prod | NextAuth fallback | `src/lib/auth.ts`<br>`node_modules/next-auth` | 32-byte cryptographic secret used by NextAuth v5 to sign and encrypt JWT session cookies. In production, omitting this causes `MissingSecretError`. |
| `NEXTAUTH_SECRET` | No | Any | Alias for `AUTH_SECRET` | `node_modules/next-auth` | Legacy NextAuth v4 secret name. Supported by NextAuth v5 as a backward-compatible alias. |
| `NEXTAUTH_URL` / `AUTH_URL` | No (Rec.) | Dev, Staging, Prod | Inferred from request host | `src/lib/auth.ts` | The canonical HTTPS origin of the application (e.g. `https://yourdomain.com`). Prevents redirect mismatch errors behind reverse proxies. |
| `TEST_DATABASE_URL` | Test Only | Test (`.env.test`) | None | `src/lib/prisma.ts` | Dedicated disposable test database connection string. Enforced by `validateTestDatabaseUrl()`; must contain `test` in database name. |
| `RATE_LIMIT_LOGIN_MAX` | No | Any | `20` | `src/middleware/rate-limit.ts` | Maximum allowed login requests per IP address within the login window. |
| `RATE_LIMIT_LOGIN_WINDOW_MS` | No | Any | `900000` (15 min) | `src/middleware/rate-limit.ts` | Time window in milliseconds for login rate limiting. |
| `RATE_LIMIT_REGISTER_MAX` | No | Any | `10` | `src/middleware/rate-limit.ts` | Maximum allowed registration attempts per IP within the registration window. |
| `RATE_LIMIT_REGISTER_WINDOW_MS` | No | Any | `900000` (15 min) | `src/middleware/rate-limit.ts` | Time window in milliseconds for registration rate limiting. |
| `RATE_LIMIT_SCAN_MAX` | No | Any | `30` | `src/middleware/rate-limit.ts` | Maximum allowed scanner API submissions per IP within the scan window. |
| `RATE_LIMIT_SCAN_WINDOW_MS` | No | Any | `60000` (1 min) | `src/middleware/rate-limit.ts` | Time window in milliseconds for scanner API rate limiting. |
| `GOOGLE_SAFE_BROWSING_API_KEY` | No | Optional | None | Threat intel integrations | API key for Google Safe Browsing API v4. When omitted, URL scanner uses built-in heuristic analysis. |
| `VIRUSTOTAL_API_KEY` | No | Optional | None | Threat intel integrations | API key for VirusTotal URL/domain intelligence API. |
| `URLHAUS_API_KEY` | No | Optional | None | Threat intel integrations | API key for abuse.ch URLhaus threat feed. |
| `PHISHTANK_API_KEY` | No | Optional | None | Threat intel integrations | API key for PhishTank verified phishing database. |
| `UPSTASH_REDIS_REST_URL` | No | Multi-instance Prod | None | Distributed rate limiting | Upstash Redis REST endpoint for multi-instance distributed rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN` | No | Multi-instance Prod | None | Distributed rate limiting | Upstash Redis authentication token. |

---

## 2. Generating Secure Secrets

To generate a cryptographically strong `AUTH_SECRET` for production, execute:

```bash
# Using OpenSSL (macOS, Linux, Git Bash)
openssl rand -base64 32

# Using Node.js in terminal
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using PowerShell
$bytes = New-Object byte[] 32; (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes); [Convert]::ToBase64String($bytes)
```

---

## 3. Safe `.env.example` Template

The repository provides `.env.example` as a checked-in template containing only safe placeholder values:

```env
# Database (Neon / PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/threatly?sslmode=require"
DIRECT_URL="postgresql://user:password@host:5432/threatly?sslmode=require"

# NextAuth v5
AUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Threat Intel APIs (optional)
GOOGLE_SAFE_BROWSING_API_KEY=""
VIRUSTOTAL_API_KEY=""
URLHAUS_API_KEY=""
PHISHTANK_API_KEY=""

# Distributed Rate Limiting (optional)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```
