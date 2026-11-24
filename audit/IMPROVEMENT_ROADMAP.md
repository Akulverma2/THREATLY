# AiGuard — Improvement Roadmap

Based on the complete audit findings, this roadmap prioritizes improvements across six phases. Each task includes dependencies, affected files, estimated complexity, and acceptance criteria.

---

## Phase 1 — Critical Stabilization

### Task ID: P1-CRITICAL-001
**Description:** Add rate limiting to authentication endpoints
**Priority:** CRITICAL
**Dependencies:** None
**Affected Files:** `src/middleware.ts`, possibly new `src/middleware/rate-limit.ts`
**Estimated Complexity:** 2 days
**Acceptance Criteria:**
- POST /api/auth/signin returns 429 after 5 failed attempts within 15 minutes per IP
- Rate limit headers included: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Brute-force attacks are throttled effectively

### Task ID: P1-CRITICAL-002
**Description:** Add JWT token expiration configuration
**Priority:** CRITICAL
**Dependencies:** P1-CRITICAL-001
**Affected Files:** `src/lib/auth.ts`
**Estimated Complexity:** 1 day
**Acceptance Criteria:**
- NextAuth JWT config includes `maxAge` or `expiration` set via environment variable
- Tokens expire after configured period (e.g., 30 days)
- Users re-authenticate after expiration

### Task ID: P1-CRITICAL-003
**Description:** HTML-escape all user input before database storage and display
**Priority:** CRITICAL
**Dependencies:** None
**Affected Files:** `src/app/api/scan/url/route.ts`, `src/app/api/scan/email/route.ts`, `src/app/dashboard/page.tsx`, `src/app/admin/page.tsx`, `src/store/index.ts`
**Estimated Complexity:** 3 days
**Acceptance Criteria:**
- No raw user input rendered in dashboard without escaping
- URL input sanitized with dompurify or equivalent before Prisma create
- Stored XSS vectors (e.g., `javascript:`, `<script>`) are neutralized
- Dashboard displays sanitized input safely

### Task ID: P1-CRITICAL-004
**Description:** Add SQL injection protection for admin search features
**Priority:** CRITICAL
**Dependencies:** None
**Affected Files:** `src/app/admin/page.tsx`
**Estimated Complexity:** 2 days
**Acceptance Criteria:**
- All user input in database queries goes through Prisma safe `where` clauses
- No raw SQL string concatenation in admin page queries
- Input sanitization utility added and used consistently

---

## Phase 2 — Core Feature Completion

### Task ID: P2-COMPLETE-001
**Description:** Integrate threat intelligence APIs (Google Safe Browsing, VirusTotal, URLhaus, PhishTank)
**Priority:** HIGH
**Dependencies:** P1-CRITICAL-001 (rate limiting for external API protection)
**Affected Files:** `src/lib/detection/url.ts`, `src/lib/detection/email.ts`, `src/lib/detection/base.ts`, `.env`, `.env.example`
**Estimated Complexity:** 5 days
**Acceptance Criteria:**
- API keys configured via environment variables (optional — can be omitted for offline mode)
- API responses normalized and merged with heuristic scores
- Caching via `ThreatIntelCache` model for repeated lookups
- Rate limiting and timeout configuration on all external API calls
- Fallback to pure heuristic mode when APIs are unavailable or keys missing

### Task ID: P2-COMPLETE-002
**Description:** Implement background task queue for scans
**Priority:** HIGH
**Dependencies:** P1-CRITICAL-001, P2-COMPLETE-001 (threat intel may need async)
**Affected Files:** `src/lib/prisma.ts`, new `src/jobs/scan.job.ts`, `package.json` (add bull or similar), `src/app/api/scan/*/route.ts` (async pattern)
**Estimated Complexity:** 4 days
**Acceptance Criteria:**
- Scan API routes return 202 Accepted immediately; scan runs in background
- User can poll `/api/user/scans/{id}` for completion status
- Redis or Bull queue configured for task management
- Idempotent task execution (same URL scanned twice uses cached result)
- Task status tracked in DB with progress updates

### Task ID: P2-COMPLETE-003
**Description:** Add export functionality for scan data
**Priority:** MEDIUM
**Dependencies:** P2-COMPLETE-002 (background queue enables data retrieval)
**Affected Files:** `src/app/dashboard/page.tsx`, `src/app/admin/page.tsx`, new `export` API routes
**Estimated Complexity:** 3 days
**Acceptance Criteria:**
- Users can export their scan history as CSV or JSON
- Admins can export all user scan data (with proper authorization)
- Export includes: scan ID, type, input, risk score, classification, threat category, reasons, timestamp
- Export endpoint properly authenticated and authorized

### Task ID: P2-COMPLETE-004
**Description:** Implement duplicate task prevention
**Priority:** MEDIUM
**Dependencies:** P2-COMPLETE-002 (background queue)
**Affected Files:** `src/app/api/scan/*/route.ts`, `src/lib/detection/base.ts`, new cache logic
**Estimated Complexity:** 3 days
**Acceptance Criteria:**
- Same URL submitted for scanning multiple times returns cached result
- Cache key based on URL hash (e.g., SHA256)
- Deduplication respects user ownership (user can't override another user's cache entry)
- Cache expiration/TTL configured (e.g., 30 days)

---

## Phase 3 — Security Hardening

### Task ID: P3-SECURE-001
**Description:** Add explicit CORS configuration
**Priority:** HIGH
**Dependencies:** None
**Affected Files:** `next.config.ts`, new `src/middleware/cors.ts` or middleware chain
**Estimated Complexity:** 2 days
**Acceptance Criteria:**
- `Access-Control-Allow-Origin` set to specific trusted domains only (not `*`)
- `Access-Control-Allow-Methods` limited to needed methods (POST, GET, OPTIONS)
- `Access-Control-Allow-Headers` limited to needed headers
- Preflight OPTIONS requests handled correctly
- CORS configuration environment-driven (different origins for dev/prod)

### Task ID: P3-SECURE-002
**Description:** Add Content Security Policy (CSP) headers
**Priority:** HIGH
**Dependencies:** P3-SECURE-001
**Affected Files:** `next.config.ts` `headers()` middleware
**Estimated Complexity:** 2 days
**Acceptance Criteria:**
- CSP header added to all responses: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'`
- Inline styles via Tailwind allowed via `'unsafe-inline'` (acceptable for this app's theming)
- No inline scripts beyond what's already in the app
- CSP report-uri configured for violation reporting

### Task ID: P3-SECURE-003
**Description:** Add input length limits and format validation on all scanner endpoints
**Priority:** HIGH
**Dependencies:** P1-CRITICAL-003 (HTML escaping already in progress)
**Affected Files:** `src/app/api/scan/url/route.ts`, `src/app/api/scan/email/route.ts`, `src/app/api/scan/message/route.ts`, `src/app/api/scan/qr/route.ts`
**Estimated Complexity:** 3 days
**Acceptance Criteria:**
- Zod schemas include `.max()` length limits (e.g., URL max 2000 chars, email body max 10000 chars)
- URL format validation added (`z.string().url()` or custom regex with length limit)
- Malformed inputs rejected with 400 error and clear message
- Regex denial-of-service protection (e.g., `re DoS` protection via `regex-trie` or length limits)

### Task ID: P3-SECURE-004
**Description:** Implement session fixation prevention
**Priority:** MEDIUM
**Dependencies:** P1-CRITICAL-002 (JWT expiration)
**Affected Files:** `src/lib/auth.ts`
**Estimated Complexity:** 2 days
**Acceptance Criteria:**
- JWT token regenerated on login (NextAuth handles this by default, verify)
- All previous sessions invalidated on password change
- Users can view and revoke active sessions
- Session revocation endpoint added if not automatic

### Task ID: P3-SECURE-005
**Description:** Add HTTPS enforcement for all external API calls
**Priority:** MEDIUM
**Dependencies:** None
**Affected Files:** `src/lib/detection/url.ts`, `src/lib/detection/email.ts` (URL analysis section)
**Estimated Complexity:** 1 day
**Acceptance Criteria:**
- `analyzeUrl()` rejects any URL not using `https:` or `http:` scheme
- `file://`, `gopher://`, `ftp://` etc. are rejected with clear error
- All external threat intel API calls use `https:` strictly
- URL scheme validation added to Zod schemas where applicable

---

## Phase 4 — Testing and Reliability

### Task ID: P4-RELIABLE-001
**Description:** Add unit tests for detection engines
**Priority:** HIGH
**Dependencies:** None (infrastructure setup first)
**Affected Files:** new `src/__tests__/detection/` directory, `src/lib/detection/base.ts`
**Estimated Complexity:** 5 days
**Acceptance Criteria:**
- `jest` or `vitest` configured with project
- `analyzeUrl()` tested with ~30+ known safe/malicious/benign URLs with expected classifications
- `analyzeEmail()` tested with sample emails and expected scores/categories
- `analyzeMessage()` tested with scam patterns and expected weights
- `analyzeQr()` tested with base64 PNG fixtures or mocked jsQR
- Test coverage >= 80% for detection engine functions

### Task ID: P4-RELIABLE-002
**Description:** Add integration tests for API routes
**Priority:** HIGH
**Dependencies:** P4-RELIABLE-001
**Affected Files:** new `src/__tests__/api/` directory, Prisma test database setup
**Estimated Complexity:** 5 days
**Acceptance Criteria:**
- All 6 API routes tested with valid and invalid inputs
- Authentication flow tested (login, logout, unauthorized access)
- Admin endpoint authorization tested
- Input validation tested (Zod safeParse success/failure paths)
- Error handling tested (try/catch paths, fallback responses)

### Task ID: P4-RELIABLE-003
**Description:** Add E2E tests with Playwright or Cypress
**Priority:** MEDIUM
**Dependencies:** P4-RELIABLE-002
**Affected Files:** new `playwright/` or `cypress/` directory, CI configuration
**Estimated Complexity:** 4 days
**Acceptance Criteria:**
- User can register → login → scan URL → view dashboard → logout workflow
- Scanner tabs (URL, QR, MESSAGE, EMAIL) all functional end-to-end
- Dashboard loads and displays scan history correctly
- Admin can view users, stats, audit log
- No console errors during typical workflow

### Task ID: P4-RELIABLE-004
**Description:** Add rate limiting tests
**Priority:** MEDIUM
**Dependencies:** P1-CRITICAL-001
**Affected Files:** new test files for rate limiter middleware
**Estimated Complexity:** 3 days
**Acceptance Criteria:**
- Rate limiter tested with various request patterns
- 429 response returned after threshold exceeded
- Headers present on all responses after rate limiter middleware
- Different IPs have separate rate limits

---

## Phase 5 — UI/UX Polish

### Task ID: P5-UI-001
**Description:** Add loading and error states for all scanner tabs
**Priority:** MEDIUM
**Dependencies:** None
**Affected Files:** `src/components/ScannerTabs.tsx`
**Estimated Complexity:** 2 days
**Acceptance Criteria:**
- Each tab (URL, QR, MESSAGE, EMAIL) shows proper loading state during API call
- Error messages displayed for different error types (network, validation, scan failure)
- UI remains responsive during scan processing
- No "ghost" results from previous scans interfering with new scans

### Task ID: P5-UI-002
**Description:** Improve responsive design on dashboard and admin pages
**Priority:** MEDIUM
**Dependencies:** None
**Affected Files:** `src/app/dashboard/page.tsx`, `src/app/admin/page.tsx`
**Estimated Complexity:** 3 days
**Acceptance Criteria:**
- Tables scroll horizontally on mobile; column visibility toggled
- Charts resize appropriately on different screen sizes
- Tab navigation works on touch devices
- No horizontal overflow on mobile viewport

### Task ID: P5-UI-003
**Description:** Add accessibility improvements
**Priority:** LOW
**Dependencies:** P5-UI-001, P5-UI-002
**Affected Files:** Throughout `src/`
**Estimated Complexity:** 3 days
**Acceptance Criteria:**
- All interactive elements have adequate touch target size (48px minimum)
- Color contrast meets WCAG AA for normal text (currently cyan/white on dark may be insufficient)
- ARIA labels added on scanner tabs, buttons, and interactive elements
- Keyboard navigation works throughout (tab order, focus states)
- Skip links or anchor navigation for main content sections

### Task ID: P5-UI-004
**Description:** Improve empty and error states throughout UI
**Priority:** LOW
**Dependencies:** P5-UI-001
**Affected Files:** `src/app/dashboard/page.tsx`, `src/app/admin/page.tsx`, `src/components/ScannerTabs.tsx`
**Estimated Complexity:** 2 days
**Acceptance Criteria:**
- "No scans found" message displayed when user has no scan history
- "Error: Scan failed" message displayed when API call fails
- Loading spinners appropriate size and themed consistently
- Graceful degradation when data is unavailable

---

## Phase 6 — Production Readiness

### Task ID: P6-PROD-001
**Description:** Add Dockerfile and Docker Compose configuration
**Priority:** HIGH
**Dependencies:** P3-SECURE-001 (CORS may need Docker networking consideration)
**Affected Files:** `Dockerfile`, `docker-compose.yml`, `.env` (update for Docker paths)
**Estimated Complexity:** 3 days
**Acceptance Criteria:**
- Dockerfile builds Next.js app successfully
- Docker Compose brings up app + PostgreSQL (Neon or local) + Redis (optional)
- Environment variables configured for Docker context
- Health check endpoint exposed and working (`/api/public/stats` or custom)
- Container ports mapped correctly (3000 for Next.js)

### Task ID: P6-PROD-002
**Description:** Add production environment configuration
**Priority:** HIGH
**Dependencies:** P6-PROD-001, P3-SECURE-001, P3-SECURE-002
**Affected Files:** `.env.production`, `.env.local`, `next.config.ts` (production overrides)
**Estimated Complexity:** 2 days
**Acceptance Criteria:**
- Separate `.env.production` with production DATABASE_URL, NEXTAUTH_URL, etc.
- `NEXTAUTH_URL` set to production domain
- Production-specific security settings (CSP, CORS, rate limits)
- `npm run build` produces successful production build
- `npm run start` runs production server successfully

### Task ID: P6-PROD-003
**Description:** Add CI/CD workflow
**Priority:** MEDIUM
**Dependencies:** P4-RELIABLE-003 (E2E tests), P6-PROD-002
**Affected Files:** `.github/workflows/ci.yml`, `.github/workflows/cd.yml`
**Estimated Complexity:** 3 days
**Estimated Complexity:** 3 days
**Acceptance Criteria:**
- CI workflow runs on every push and PR: `npm install`, `npm run lint`, `npm run build`, `npm test`, `npm run lint`
- E2E tests run in CI (Playwright/Cypress)
- Code quality checks pass
- CD workflow deploys to production on main branch merge (manual approval step)
- Artifacts (build, test results) uploaded to CI pipeline

### Task ID: P6-PROD-004
**Description:** Add secrets management and environment validation
**Priority:** MEDIUM
**Dependencies:** P1-CRITICAL-002, P3-SECURE-001
**Affected Files:** `.env.example` (update), `scripts/validate-env.js` or similar
**Estimated Complexity:** 2 days
**Acceptance Criteria:**
- `.env.example` has all required variables marked (no empty defaults for critical vars)
- Environment validation script checks for missing required vars on startup
- API keys not committed to repo (in `.gitignore` verified)
- `NEXTAUTH_SECRET` generated securely (openssl rand base64 32)
- Secrets not exposed in error messages or logs

### Task ID: P6-PROD-005
**Description:** Add health check and monitoring endpoints
**Priority:** LOW
**Dependencies:** P6-PROD-002, P3-SECURE-005
**Affected Files:** new `src/app/api/health/route.ts`, monitoring integration
**Estimated Complexity:** 2 days
**Acceptance Criteria:**
- GET `/api/health` returns `{ status: "ok", timestamp, version, uptime }`
- Checks DB connectivity, Prisma client status
- Response time included
- Endpoint used by container orchestration for liveness/readiness probes

---

## Phase Overview Summary

| Phase | Focus | Key Deliverables |
|---|---|---|
| **Phase 1** | Critical Stabilization | Rate limiting, JWT escaping, XSS prevention, SQL injection protection |
| **Phase 2** | Core Feature Completion | Threat intel APIs, background queue, export, deduplication |
| **Phase 3** | Security Hardening | CORS, CSP, input validation, session fixup, HTTPS enforcement |
| **Phase 4** | Testing and Reliability | Unit tests, integration tests, E2E tests, rate limiting tests |
| **Phase 5** | UI/UX Polish | Loading/error states, responsive design, accessibility, empty states |
| **Phase 6** | Production Readiness | Docker, production config, CI/CD, secrets management, health checks |

**Estimated Total Effort:** ~6 weeks for full roadmap completion
**Critical Path:** P1-CRITICAL-001 → P1-CRITICAL-002 → P1-CRITICAL-003 → P3-SECURE-001 → P4-RELIABLE-001 → P6-PROD-001