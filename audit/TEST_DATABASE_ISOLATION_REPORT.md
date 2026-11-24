# AiGuard / THREATLY — Test Database Isolation Report (Phase 6.0)

## 1. Executive Summary

This report documents the verification and hardening of test database isolation safeguards for the THREATLY (AiGuard) project conducted in **Phase 6.0**, prior to running any API integration tests.

All verification steps were performed strictly **without connecting to, modifying, migrating, or deleting anything in the production database**. API integration tests were **not** executed. All 32 detection unit tests and 5 new isolation safeguard tests pass with exit code 0.

---

## 2. Configuration Inspected

| File / Component | Purpose & Findings |
|---|---|
| `vitest.config.ts` | Vitest configuration. Previously lacked an alias for `@/lib/prisma`. Setup file configured via `setupFiles: ['./vitest.setup.ts']`. Updated to alias `@/lib/prisma` to `src/lib/prisma.ts`. |
| `vitest.setup.ts` | Setup hook running before test files. Previously eagerly created a `PrismaClient` when `TEST_DATABASE_URL` was present in the environment (wasting resources on pure unit tests). Refactored to load `.env.test` via `dotenv` and use a lazy proxy so unit tests incur zero Prisma initialization. |
| `package.json` | Dependencies include `@prisma/client` (`^6.19.3`), `prisma` (`^6.19.3`), `dotenv` (`^18.0.10`), `vitest` (`^3.2.4`). No automated migration scripts run against tests. |
| `prisma/schema.prisma` | Datasource uses `provider = "postgresql"`, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`. Standard configuration; must never be targeted by test runs. |
| `prisma.config.ts.txt` | Inactive text reference file regarding Prisma 7 patterns; not loaded by the application or test runner. |
| `src/__tests__/api/` | 3 API integration test files (`auth.test.ts`, `authorization.test.ts`, `register.test.ts`). All import `prisma` from `@/lib/prisma`. Contain `beforeEach` hooks with `deleteMany` calls (`auth` and `authorization` perform unbounded `prisma.user.deleteMany({})`). |
| `.env` | Production environment file containing production `DATABASE_URL` (`.../neondb`), `DIRECT_URL`, and `NEXTAUTH_SECRET`. Completely untouched and preserved. |
| `.env.test` | Test environment file containing `TEST_DATABASE_URL` (`.../neondb_test?sslmode=require`) and `NEXTAUTH_TEST_SECRET`. |

---

## 3. TEST_DATABASE_URL Flow Tracing

The lifecycle and transmission of `TEST_DATABASE_URL` to Prisma is traced as follows:

```
[.env.test]
    │
    ▼ (Explicit dotenv loading via path.resolve)
[vitest.setup.ts]
    │ (Populates process.env.TEST_DATABASE_URL & sets process.env.NODE_ENV = 'test')
    │
    ▼ (Imported by test files via @/lib/prisma alias)
[src/lib/prisma.ts]
    │
    ├─► validateTestDatabaseUrl(TEST_DATABASE_URL, DATABASE_URL)
    │     ├── 1. Check if TEST_DATABASE_URL is defined and non-empty
    │     ├── 2. Check that TEST_DATABASE_URL !== DATABASE_URL
    │     └── 3. Check that target database name contains 'test' (e.g. 'neondb_test')
    │
    ▼ (Only on first database operation / property access - Lazy Proxy)
[PrismaClient({ datasources: { db: { url: safeTestUrl } } })]
    │
    ▼
[Isolated Test Database (neondb_test)]
```

---

## 4. Isolation Safeguards Verification

| Safeguard Requirement | Status | Verification Detail |
|---|---|---|
| **No silent fallback to DATABASE_URL** | ✅ Verified & Enforced | If `TEST_DATABASE_URL` is missing, empty, or undefined in test mode (`NODE_ENV === 'test'` or `VITEST === 'true'`), `validateTestDatabaseUrl` throws `[DATABASE_ISOLATION_VIOLATION]` before `PrismaClient` can be instantiated. |
| **Unit tests do not initialize Prisma unnecessarily** | ✅ Verified & Enforced | Detection tests (`url.test.ts`, `email.test.ts`, `message.test.ts`, `qr.test.ts`) do not import `@/lib/prisma`. `vitest.setup.ts` uses a lazy proxy, ensuring zero Prisma instances are created during unit test execution. |
| **Explicit test database configuration** | ✅ Verified | Test target is explicitly specified via `TEST_DATABASE_URL` in `.env.test`. |
| **Test database distinguishable from production** | ✅ Verified | Production target: `neondb` (via pooler `ep-square-recipe-bdxeoeo7-pooler`). Test target: `neondb_test` (via direct/branch endpoint `ep-square-recipe-bdxeoeo7`). Database names are distinct and clearly indicate test role. |
| **Destructive operations reject unsafe targets** | ✅ Verified & Enforced | In `auth.test.ts` and `authorization.test.ts`, `beforeEach` runs `prisma.user.deleteMany({})`. Because `prisma` is guarded at instantiation time by `validateTestDatabaseUrl`, these queries cannot execute against production or any database lacking `'test'` in its name. |
| **No production migrations triggered** | ✅ Verified | No migration scripts or CLI invocations (`prisma migrate`, `prisma db push`) were run. Production schema and data remain untouched. |
| **Secrets not leaked in logs/reports** | ✅ Verified | Credentials, passwords, tokens, and connection strings were masked and inspected via boolean/attribute checks only. |

---

## 5. Missing Safeguards Identified & Implemented

During the audit, four critical gaps were identified and resolved without requiring database access:

1. **Gap 1: Missing `@/lib/prisma` alias in `vitest.config.ts`**
   - *Issue*: `vitest.config.ts` only mapped detection libraries. API tests importing `@/lib/prisma` failed module resolution.
   - *Fix*: Added `'@/lib/prisma': 'C:/Users/akulv/Downloads/THREATLY/THREATLY/src/lib/prisma.ts'` to `vitest.config.ts`.

2. **Gap 2: Potential silent fallback to production `DATABASE_URL`**
   - *Issue*: `src/lib/prisma.ts` previously instantiated PrismaClient without validating `TEST_DATABASE_URL` against `DATABASE_URL`, which would allow fallback to production if `TEST_DATABASE_URL` was unset.
   - *Fix*: Implemented `validateTestDatabaseUrl()` in `src/lib/prisma.ts` that strictly requires `TEST_DATABASE_URL`, verifies it does not equal `DATABASE_URL`, and enforces that the target database name contains `'test'`.

3. **Gap 3: Eager Prisma initialization during unit tests**
   - *Issue*: `vitest.setup.ts` previously instantiated `new PrismaClient()` unconditionally on setup, running before every test file.
   - *Fix*: Replaced eager initialization with a lazy proxy in `vitest.setup.ts` and lazy getter in `src/lib/prisma.ts`.

4. **Gap 4: Lack of automated unit verification of safeguards**
   - *Issue*: Isolation logic had no automated regression tests.
   - *Fix*: Created `src/__tests__/unit/isolation.test.ts` with 5 automated unit tests verifying rejection of missing URLs, identical URLs, non-test database names, and acceptance of valid isolated targets.

---

## 6. Files Changed in Phase 6.0

| File | Change Description |
|---|---|
| [`src/lib/prisma.ts`](file:///c:/Users/akulv/Downloads/THREATLY/THREATLY/src/lib/prisma.ts) | Added `validateTestDatabaseUrl()` guard function and converted `prisma` export to a lazy proxy that strictly enforces test database isolation. |
| [`vitest.setup.ts`](file:///c:/Users/akulv/Downloads/THREATLY/THREATLY/vitest.setup.ts) | Explicitly loads `.env.test` via `dotenv` and provides a lazy proxy for `testPrisma` (eliminating eager initialization during unit tests). |
| [`vitest.config.ts`](file:///c:/Users/akulv/Downloads/THREATLY/THREATLY/vitest.config.ts) | Added path alias for `@/lib/prisma`. |
| [`src/__tests__/unit/isolation.test.ts`](file:///c:/Users/akulv/Downloads/THREATLY/THREATLY/src/__tests__/unit/isolation.test.ts) | New automated unit test suite with 5 test cases validating isolation safeguards. |
| [`audit/TEST_DATABASE_ISOLATION_REPORT.md`](file:///c:/Users/akulv/Downloads/THREATLY/THREATLY/audit/TEST_DATABASE_ISOLATION_REPORT.md) | Updated with complete Phase 6.0 audit results. |

---

## 7. Verification Test Suite Results

### Detection Engine Unit Tests
```bash
npx.cmd vitest run src/__tests__/detection/url.test.ts src/__tests__/detection/email.test.ts src/__tests__/detection/message.test.ts src/__tests__/detection/qr.test.ts
```
- **Files Passed**: 4 / 4
- **Tests Passed**: 32 / 32
- **Prisma Initializations**: 0
- **Exit Code**: 0

### Isolation Safeguard Unit Tests
```bash
npx.cmd vitest run src/__tests__/unit/isolation.test.ts
```
- **Files Passed**: 1 / 1
- **Tests Passed**: 5 / 5
- **Exit Code**: 0

### Combined Suite (Unit + Isolation)
- **Total Test Files Passed**: 5 / 5
- **Total Tests Passed**: 37 / 37
- **Total Tests Failed**: 0
- **Total Tests Skipped**: 0
- **Exit Code**: 0

---

## 8. Remaining Blockers Before Running API Integration Tests

Before executing API integration tests (`auth.test.ts`, `authorization.test.ts`, `register.test.ts`):

1. **User Approval Required**: Explicit approval to connect to the test database (`neondb_test`).
2. **Test Database Schema Readiness**: The `neondb_test` database must have the Prisma schema applied (tables `User`, `Account`, `Session`, `Scan`, `AuditLog`, etc.) before integration tests can perform queries against it.

---

*Report finalized: Phase 6.0 — 2026-11-24*
