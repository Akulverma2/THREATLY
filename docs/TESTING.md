# THREATLY — Test Suite & Quality Verification Guide

THREATLY employs a comprehensive automated testing framework powered by [Vitest](https://vitest.dev) (v3.2.4). All critical detection logic, route protection, input sanitization, and security isolation safeguards are thoroughly verified with unit and integration tests.

---

## 1. Test Architecture & Structure

Test files are organized cleanly under `src/__tests__/`:

```text
src/__tests__/
├── api/
│   ├── routes-auth.test.ts         # Mocked NextAuth session, middleware RBAC, and API 401/403 status tests (10 tests)
│   ├── routes-register.test.ts     # Mocked registration route handler, Zod bounds, and DoS mitigation tests (9 tests)
│   ├── auth.test.ts                # Legacy direct-Prisma test (BLOCKED - requires live Neon test DB)
│   ├── authorization.test.ts       # Legacy direct-Prisma test (BLOCKED - requires live Neon test DB)
│   └── register.test.ts            # Legacy direct-Prisma test (BLOCKED - requires live Neon test DB)
├── detection/
│   ├── url.test.ts                 # Heuristic URL detection, typosquatting, private IP checks (10 tests)
│   ├── email.test.ts               # Email header forgery, spoofing, high-risk keywords (11 tests)
│   ├── message.test.ts             # SMS smishing, urgency triggers, package lures (9 tests)
│   └── qr.test.ts                  # QR code image parsing and extraction (2 tests)
└── unit/
    ├── isolation.test.ts           # Database isolation safeguard logic (7 tests)
    └── rate-limit.test.ts          # In-memory sliding window rate limiter & 429 emissions (3 tests)
```

---

## 2. Test Execution Commands

### Run All Active Regression Tests
To execute all 61 active automated tests across 8 test suites:

```powershell
npx vitest run src/__tests__/detection/ src/__tests__/unit/ src/__tests__/api/routes-auth.test.ts src/__tests__/api/routes-register.test.ts
```

### Run Specific Test Suites
```powershell
# Detection engines only
npx vitest run src/__tests__/detection/

# Security and isolation units only
npx vitest run src/__tests__/unit/

# API route handlers only
npx vitest run src/__tests__/api/routes-auth.test.ts src/__tests__/api/routes-register.test.ts
```

### Run Vitest in Watch Mode (Interactive Development)
```powershell
npx vitest src/__tests__/detection/
```

---

## 3. Verified Test Coverage Matrix

| Test Suite | File | Tests | Exit Code | Status | Verified Functionality |
|---|---|:---:|:---:|:---:|---|
| **URL Detection** | `url.test.ts` | 10 | 0 | **PASS** | TLD classification, private/loopback IP SSRF blocking, Levenshtein typosquatting detection, shortener tracking. |
| **Email Detection** | `email.test.ts` | 11 | 0 | **PASS** | SPF/DKIM validation strings, spoofed display names, urgency keywords, suspicious file extensions. |
| **Message Detection** | `message.test.ts` | 9 | 0 | **PASS** | Smishing patterns, bank verification lures, package delivery hooks, fear appeal scoring. |
| **QR Code Detection** | `qr.test.ts` | 2 | 0 | **PASS** | PNG decoding, matrix barcode parsing via `jsqr`, invalid image rejection. |
| **Database Isolation**| `isolation.test.ts` | 7 | 0 | **PASS** | Programmatic block on production DB in test mode, mandatory test DB naming rules. |
| **Rate Limiter** | `rate-limit.test.ts` | 3 | 0 | **PASS** | Request threshold enforcement, sliding window resets, `Retry-After` header emission, 429 response. |
| **API Auth & RBAC** | `routes-auth.test.ts` | 10 | 0 | **PASS** | Machine-readable 401/403 JSON responses on API endpoints, browser redirects to `/login` on page routes. |
| **Registration Handler**| `routes-register.test.ts` | 9 | 0 | **PASS** | Input bounds, password length constraints (max 128 chars to mitigate bcrypt DoS), duplicate email 409 status. |
| **TOTAL VERIFIED** | **8 Suites** | **61** | **0** | **PASS** | **Zero failures, zero regressions across active suites.** |

---

## 4. Status of Legacy Direct-Prisma Integration Tests

Three legacy test files exist in the repository that attempt direct network connectivity to an external Neon test database branch:
- `src/__tests__/api/auth.test.ts` (2 tests)
- `src/__tests__/api/authorization.test.ts` (2 tests)
- `src/__tests__/api/register.test.ts` (2 tests)

**Current Status:** **BLOCKED / NOT EXECUTED**  
**Reason:** The configured Neon test branch hostname is unreachable over the public network (DNS non-resolving).  
**Resolution & Safety:** Rather than attempting to run these tests against the production database (which would violate database safety protocols), full behavioral and RBAC verification is actively provided by `src/__tests__/api/routes-auth.test.ts` and `src/__tests__/api/routes-register.test.ts` using isolated mocks.
