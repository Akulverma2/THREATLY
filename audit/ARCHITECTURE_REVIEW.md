# AiGuard — Architecture and Code Quality Review

## 1. Separation of Concerns

### Strengths
- **Detection engines are pure functions** — `url.ts`, `email.ts`, `message.ts`, `qr.ts` are all standalone TypeScript modules with no DOM/Next.js dependencies. They can be tested in isolation and imported from any context.
- **API routes handle HTTP, detection engines handle logic** — Clear boundary between `src/app/api/scan/*/route.ts` (HTTP, auth, DB persistence) and `src/lib/detection/*` (pure analysis).
- **Prisma ORM abstracts database** — All database operations go through Prisma client, preventing raw SQL in API routes.

### Weaknesses
- **Frontend detects and persists in same flow** — `ScannerTabs.tsx` posts to API endpoints, but the UI also directly displays detection results. No separate service layer; UI logic mixed with API response handling.
- **Middleware does double duty** — `src/middleware.ts` handles both auth routing AND admin role checking. These are separate concerns (auth vs authorization) bundled together.
- **No service layer between API and detection** — API routes (`/api/scan/url`, etc.) directly call detection functions. No middleware/service layer for preprocessing, postprocessing, caching, or error translation.
- **Voice assistant state in LocalStorage** — `src/components/VoiceAssistant.tsx` stores mute preference in `localStorage` rather than in user profile or state management. Breaks separation between client persistence and app logic.

### Recommendations
- Extract detection engine calls into a dedicated `services/` or `scanner/` service layer.
- Split middleware into auth middleware and authorization middleware.
- Move voice assistant state to user preferences in the database or Redux store.

---

## 2. Modularity

### Strengths
- **Four separate detection modules** — `url.ts`, `email.ts`, `message.ts`, `qr.ts` each handle their scanning type independently.
- **Detection base types shared** — `base.ts` provides common types (`Classification`, `Severity`, `Indicator`, `DetectionResult`) and helper functions (`classifyScore`, `recommendedAction`, `clamp`, `makeResult`).
- **API routes are modular** — Each scan type has its own `route.ts` file, easy to add or remove scan types.
- **Components are somewhat modular** — `ScannerTabs.tsx` encapsulates tab state; `ThreatRadar.tsx` is a self-contained canvas component.

### Weaknesses
- **Duplicate brand/keywords lists** — `BRANDS` and `SUSPICIOUS_KEYWORDS` defined in `url.ts` and also referenced/duplicated in `email.ts` (`BRANDS` list partial overlap).
- **No shared utilities** — `clamp`, `confidenceLevel`, `makeResult` in `base.ts` are good, but other utilities (string trimming, URL normalization) are duplicated across modules.
- **ScannerTabs manages too much state** — `tab`, `loading`, `result`, `error`, `urlInput`, `msgInput`, `emailSender`, `emailSubject`, `emailBody`, `cameraActive`, `videoRef` — all in one component.
- **No feature-based directory structure** — All `src/lib/detection/` files at root of `src/lib/`, but no grouping by feature area beyond the detection modules.

### Recommendations
- Create `src/lib/utils/` for shared functions (URL trimming, string sanitization).
- Group brand lists and configuration in a single `src/lib/config/` file.
- Split `ScannerTabs.tsx` into smaller components per tab or use a state manager (Redux Toolkit already installed).
- Consider feature-based directory: `src/features/url/scanner.tsx`, `src/features/email/scanner.tsx`, etc.

---

## 3. Maintainability

### Strengths
- **Type-safe throughout** — TypeScript used across; Prisma types; Zod schemas for input validation.
- **Descriptive variable and function names** — `analyzeUrl`, `classifyScore`, `makeResult`, `recommendedAction` are clear.
- **Consistent coding style** — Throughout the codebase: `camelCase` for functions/variables, `PascalCase` for components, `UPPER_SNAKE_CASE` for constants.
- **Error handling present** — Try/catch in API routes; `safeParse` in Zod; optional chaining in many places.
- **Documentation in code** — JSDoc-style comments in detection engines explaining each check.

### Weaknesses
- **Magic numbers in detection scoring** — Scores like `+8`, `+15`, `+30` scattered without constants. Hard to understand or adjust scoring logic without reading each check.
- **Large API route files** — Each `route.ts` is ~15-25 lines, but as more features are added, they could grow unwieldy without service layer.
- **No clear upgrade path** — Detection engines are heuristic-only; adding ML or threat intel would require significant refactoring.
- **Prisma schema has denormalized fields** — `Scan` model has `riskScore`, `classification`, `threatCategory`, `reasons`, `recommendedAction` all as separate fields; these are derived from the detection result and could be computed on read.
- **Error boundaries not present** — No React error boundaries; uncaught errors in components could crash parent UI.

### Recommendations
- Create constants for scoring weights: `SUSPICIOUS_TLD_SCORE = 10`, etc.
- Add computed properties or methods to derive classification from riskScore rather than storing redundantly.
- Add React error boundaries at key layout points.
- Add documentation for scoring logic and how to extend/configure weights.

---

## 4. Naming Conventions

### Strengths
- **Consistent across codebase** — `camelCase` for functions/variables (`analyzeUrl`, `riskScore`), `PascalCase` for components (`ScannerTabs`, `ThreatRadar`), `UPPER_SNAKE_CASE` for constants (`SUSPICIOUS_TLDS`, `BRANDS`).
- **Descriptive model names** — `User`, `Scan`, `ThreatIntelCache`, `AuditLog`, `Classification`, `ScanType`, `AccountStatus` are all clear and domain-appropriate.
- **API route naming** — `/api/scan/url`, `/api/scan/email`, `/api/user/me`, `/api/admin/users` all intuitive and consistent.

### Weaknesses
- **Inconsistent enum naming** — `ScanType` enum values: `URL`, `QR`, `MESSAGE`, `EMAIL` (uppercase). `AccountStatus`: `ACTIVE`, `INACTIVE`, `SUSPENDED` (uppercase). `Classification`: `SAFE`, `SUSPICIOUS`, `MALICIOUS` (uppercase). All consistent, but mixed with camelCase function names.
- **`tld` vs `tldSuspicious`** — Variable named `tld` in `url.ts` but check variable `tldSuspicious`; slightly inconsistent pattern.
- **`isPrivateIP` vs `isIP`** — Helper functions with similar names but different responsibilities; could be confusing.
- **`dailyStats` vs `dailyTrends`** — Admin page uses both terms for similar concepts (30-day scan trends).

### Recommendations
- Keep current naming; it's largely consistent and reasonable.
- Consider `isIPv4` instead of `isIP` for clarity if IPv6 support added.
- Standardize on one term for 30-day trends (use `dailyTrends` consistently, as admin page already does).

---

## 5. Type Safety

### Strengths
- **Full TypeScript coverage** — All source files `.ts` or `.tsx`; no JavaScript files in `src/`.
- **Prisma types** — `prisma generate` produces type-safe client; `prisma.schema.prisma` defines all models with types.
- **Zod schema validation** — All API routes use Zod for request body validation with inferred types.
- **NextAuth types** — `src/types/next-auth.d.ts` custom types; `@auth/prisma-adapter` provides type-safe adapter.
- **React component types** — `interface ScanRow`, `interface UserData` in dashboard; `ThreatEvent` interface in ThreatRadar.

### Weaknesses
- **`any` type usage** — Several places use `any` or loose types:
  - `src/app/admin/page.tsx` — `filteredUsers`, `filteredScans`, `typeCounts` use `useMemo` with `any` types in callbacks.
  - `src/components/ScannerTabs.tsx` — `result` type defined inline; `postScan` payload type `unknown` then cast.
  - `src/app/api/admin/disable-user/route.ts` — `metadata` field in audit log is `Json?` (opaque).
- **Prisma `select` types could be tighter** — Several `select` clauses use inline type assertions rather than full interfaces.
- **No runtime type validation on DB results** — Prisma returns objects; no Zod/ClassTransformer validation on scan results persisted to DB.
- **`session.user.role` typed as `"USER" | "ADMIN"`** — But role could theoretically be other values if database is modified directly.

### Recommendations
- Replace `any` types with specific interfaces where possible.
- Use `z.infer<Schema>` to infer types from Zod schemas instead of manual typing.
- Add Zod validation/pipes for Prisma query results if needed for API responses.
- Ensure role field has enum constraint at DB level (already done via Prisma enum).

---

## 6. Exception Handling

### Strengths
- **Try/catch in all API routes** — Every `src/app/api/*/route.ts` has try/catch blocks.
- **Zod safeParse** — All input validation uses `schema.safeParse()` instead of `.parse()` which would throw.
- **NextAuth error handling** — `authorize()` returns `null` instead of throwing for invalid credentials.
- **URL analysis fallback** — `analyzeUrl()` catches `URL` constructor error and returns MALICIOUS result with "Malformed URL" reason.

### Weaknesses
- **Inconsistent error response format** — Some routes return `{ error: "..." }`, others return `{ scans: [...] }`, others may expose Prisma error details in development.
- **No global error handler** — Next.js may handle some errors, but no centralized error handling middleware or error boundary for API routes.
- **Detection engine errors silently caught** — `analyzeUrl()` catches URL parsing error but what about regex errors, memory errors, etc.? Not handled.
- **No user-friendly error messages** — API returns technical errors; frontend displays `data.error || "Scan failed"` which is generic.
- **Prisma error logging in development** — `log: ["query", "error", "warn"]` may expose query details in prod logs.

### Recommendations
- Standardize API error response format: `{ error: string, code?: string, details?: any }`.
- Add global error middleware in Next.js `middleware.ts` or `error.ts` page.
- Wrap detection engine calls in try/catch with user-friendly fallback results.
- Add error boundary component in React app for UI errors.

---

## 7. Logging

### Strengths
- **Prisma query logging** — Configured in `src/lib/prisma.ts`: `log: ["query", "error", "warn"]` in development.
- **Audit logging** — `AuditLog` model and `/api/admin/audit` endpoint track admin actions.
- **Scan logging** — Every scan creates a `Scan` record and increments `user.totalScans`.

### Weaknesses
- **No application-level structured logging** — No `pino`, `winston`, or similar logging library. `console.debug`/`console.log` used implicitly via Next.js dev mode.
- **No request logging** — `middleware.ts` has no request/response logging.
- **No error tracking** — No Sentry, Bugsnag, or similar error monitoring integration.
- **Audit log missing actor IP** — As noted in security audit (L4), audit entries don't capture source IP.
- **No performance logging** — No request timing, scan duration, or performance metrics logged.

### Recommendations
- Add a logging library (pino or winston) with structured JSON logs.
- Add request middleware logging (method, path, status, response time).
- Integrate Sentry or similar for error tracking.
- Add scan duration timing and performance metrics.
- Ensure audit logs always capture `req.ip` or `req.headers['x-forwarded-for']`.

---

## 8. Configuration Management

### Strengths
- **Environment variables in `.env`** — `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET` configured.
- **`.env.example` provides guidance** — Lists all expected variables with descriptions.
- **Prisma respects `DATABASE_URL` and `DIRECT_URL`** — Both configured and working.

### Weaknesses
- **No production-specific configuration** — Single `.env` file used for both development and production; no `.env.production` or `.env.local`.
- **Hardcoded values in code** — bcrypt cost factor 12 hardcoded; scoring weights hardcoded; brand lists hardcoded in source.
- **No feature flags** — No way to toggle features on/off without code change.
- **NextAuth config not environment-driven** — `session: { strategy: "jwt" }` hardcoded in `src/lib/auth.ts`; no env var control.
- **No centralized config** — Configuration scattered: some in `.env`, some in code, some in `next.config.ts`.

### Recommendations
- Create `.env.production` or use `dotenv` with `path` differentiation.
- Move hardcoded configuration to environment variables (`BCRYPT_COST`, `SCORING_WEIGHTS`, etc.).
- Add feature flag mechanism (database column or env var) for enabling/disabling features.
- Externalize detection engine configuration (brand lists, TLD sets) to JSON config files or environment variables.

---

## 9. Database Design

### Strengths
- **Well-normalized core models** — `User`, `Account`, `Session`, `VerificationToken` follow auth best practices.
- **Scan model captures full detection result** — All risk score, classification, reasons, indicators stored per scan.
- **AuditLog model provides traceability** — Records admin actions with user, action, metadata.
- **Proper indexing** — `@@index([userId])`, `@@index([createdAt])`, `@@index([type])`, `@@index([classification])` on Scan model; `@@index([userId])`, `@@index([createdAt])` on AuditLog.
- **Role-based enum** — `Role { USER, ADMIN }` and `AccountStatus { ACTIVE, INACTIVE, SUSPENDED }` provide clear state management.

### Weaknesses
- **ThreatIntelCache underutilized** — Model exists but no cache lookup/insertion logic in detection engines or API routes.
- **Scan input stored verbatim** — `Scan.input` is `String` without size limit or sanitization; could grow unbounded or store malicious content.
- **No soft-delete pattern** — Users can be toggled ACTIVE/INACTIVE/SUSPENDED but not truly deleted (no `deletedAt` field).
- **Cascade dependencies** — `onDelete: Cascade` on User→Scans, User→AuditLog; deleting a user loses all their scan history and audit entries. May be intentional but worth documenting.
- **No migration versioning observed** — No `prisma migrate` commands seen; schema changes may be applied directly.

### Recommendations
- Add `deletedAt` timestamp to `User` model for soft deletes (if ever needed).
- Add `MAX_INPUT_LENGTH` constraint or Prisma `@db.VarChar(5000)` on `Scan.input`.
- Consider separating `reasons` and `classification` into a separate `ScanResult` model if they grow complex.
- Add cache utilization to `ThreatIntelCache` model — use it in detection engines to avoid repeated external lookups.
- Document cascade behavior and migration strategy.

---

## 10. API Consistency

### Strengths
- **Consistent response structure** — Most API routes return JSON with `{ scanId, ...result }` or `{ users, ... }` or `{ stats, ... }`.
- **Authentication pattern consistent** — All routes start with `const session = await auth(); if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });`.
- **Admin authorization consistent** — `if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });`.
- **Error handling consistent** — Try/catch, Zod `safeParse`, generic "Server error" fallback.
- **Pagination consistent** — Admin uses `take: 50` or `take: 200`; dashboard uses `scans.filter()` with client-side filtering.

### Weaknesses
- **Inconsistent scan return format** — Each scan API route spreads `...result` differently; URL scan returns full DetectionResult, message scan manually constructs result object, email scan similar.
- **No versioning** — API endpoints have no version prefix (`/api/v1/scan/url`).
- **No API documentation** — No OpenAPI/Swagger spec; no `api` route page with endpoint descriptions.
- **Public stats endpoint returns hardcoded fallback** — `/api/public/stats` has fallback hardcoded values if DB query fails, which could mislead callers.
- **No rate limit headers** — No `X-Rate-Limit-Remaining`, `X-Rate-Limit-Reset` headers on any endpoint.

### Recommendations
- Standardize scan API response format across all four scan types.
- Add API versioning prefix if public API is intended.
- Generate OpenAPI spec or at least add inline route documentation.
- Remove hardcoded fallback in `/api/public/stats` or make it clearly marked as fallback.
- Add rate limit headers to all endpoints.

---

## 11. Code Duplication

### Found Duplication

| Location | Description |
|---|---|
| `src/lib/detection/url.ts` lines 74-76 and `src/lib/detection/email.ts` lines 69-71 | Similar IP/display name checks; `isIP()` and `isPrivateIP()` logic could be shared utility. |
| `BRANDS` array — `src/lib/detection/url.ts` line 4 and `src/lib/detection/email.ts` line 13 | Partial overlap; both contain many of the same brand names. |
| SUSPICIOUS_KEYWORDS regex — `src/lib/detection/url.ts` line 6 and `src/lib/detection/message.ts` implicit | Keyword patterns repeated across modules. |
| Class color definitions — `src/app/dashboard/page.tsx` line 119, `src/app/admin/page.tsx` line 54-58, `src/components/ThreatRadar.tsx` line 26-31 | Same color hex codes defined in three separate places. |
| `classColors` object — multiple pages define identical mapping | React component reusability issue. |

### Recommendations
- Extract `BRANDS` to shared config file `src/lib/config/brands.ts`.
- Extract class colors to shared utility or CSS variables.
- Create `src/lib/utils/ip.ts` with `isIP()`, `isPrivateIP()` functions.
- Centralize scoring weights and detection configuration.

---

## 12. Dependency Management

### Strengths
- **All dependencies in `package.json`** — No missing required packages.
- **Prisma ORM** — Manages DB client lifecycle; `prisma generate` works.
- **TypeScript compiler** — `typescript ^5` in devDependencies; `tsconfig.json` and `tsconfig.tsbuildinfo` present.
- **Tailwind CSS v4** — Modern utility-first styling; `tailwind.config.js` not seen but Tailwind defaults work.
- **No obvious version conflicts** — `package-lock.json` present and consistent.

### Weaknesses
- **`next-auth` beta version** — `^5.0.0-beta.32` is a beta release of NextAuth v5; may have breaking changes or unstable APIs.
- **No security-related dependencies** — No `helmet` (HTTP headers), `cors` explicit config, `rate-limit` middleware, `snyk` or `npm audit` configurations.
- **`bcryptjs` v3** — Older version; `argon2` or `password-hashing` may be more modern. No known vulnerabilities but not latest.
- **Recharts v3** — Slightly older version; v4 available with more features.
- **No lockfile audit scripts** — No `npm audit` or `npm audit --production` scripts in `package.json`.

### Recommendations
- Run `npm audit` to check for known vulnerabilities.
- Consider upgrading `next-auth` to stable v5 or evaluating v4 if beta concerns.
- Add `helmet` middleware for HTTP security headers.
- Add explicit `cors` configuration.
- Add `npm audit` to CI/CD pipeline.
- Consider `argon2` for password hashing on new accounts.

---

## 13. Performance and Scalability

### Strengths
- **Detection engines are lightweight** — Pure heuristic analysis; no external API calls by default; runs in <100ms per URL as claimed in About page.
- **Prisma optimizes queries** — Indexes on `userId`, `createdAt`, `type`, `classification` support common query patterns.
- **Static frontend** — All pages are server-rendered or statically generated potential; no client-side heavy frameworks beyond React.
- **Recharts uses canvas efficiently** — Chart rendering is performant for typical data sizes.

### Weaknesses
- **No caching for detection results** — Same URL scanned twice re-runs full heuristic analysis. No Redis or in-memory cache.
- **No background task queue** — Scans are synchronous API responses; no async processing for heavy analysis.
- **Database queries without pagination on user scans** — `prisma.scan.findMany({ where: { userId: session.user.id } })` returns all scans user ever made; could be thousands.
- **No horizontal scaling considerations** — Next.js App Router scale depends on deployment platform (Vercel/Netlify); no explicit clustering or session sticky-notes.
- **ThreatRadar generates 12 simulated threats on every render** — `generateSimulatedThreats(12)` called in useEffect whenever `realThreats` or `showSimulated` changes; could be performance issue on frequent re-renders.

### Recommendations
- Add result caching (memory or Redis) for recent scan results keyed by URL hash.
- Implement background task processing for scan analysis if heuristics become heavier.
- Add pagination to user scan history (`take`, `skip`, or cursor-based).
- Debounce ThreatRadar simulated threat generation (only generate when component mounts or prop changes, not on every render).
- Add performance monitoring (scan duration, DB query timing).

---

## 14. Documentation Quality

### Strengths
- **Code is self-documenting** — Function and variable names are descriptive; detection checks have inline comments.
- **README.md present** — Basic project description, tech stack, setup instructions.
- **Prisma schema documented** — Enum values and model fields clearly defined.
- **Inline JSDoc/comments in detection engines** — Each check in `url.ts`, `email.ts`, `message.ts` explains what it does and why.

### Weaknesses
- **No API documentation** — No OpenAPI/Swagger; no endpoint descriptions beyond code names.
- **No architecture decision record** — No docs explaining why certain technologies were chosen.
- **No user documentation** — No guides for users on how to interpret scan results, what risk scores mean, how to use features.
- **No developer onboarding guide** — New developers must reverse-engineer code to understand architecture.
- **TODO/FIXME markers not inspected** — May exist but not counted; could indicate technical debt.

### Recommendations
- Add OpenAPI/Swagger documentation for all API endpoints.
- Create architecture overview document (already started in this audit).
- Add user guide explaining scan results, classifications, risk scores.
- Create developer onboarding guide with setup, project structure, contribution guidelines.
- Search for and address any TODO/FIXME markers found in code.

---

## 15. Overall Architecture Assessment

**Grade: C+ (Functional but needs significant polish and security hardening)**

### Summary
The application has a solid functional foundation with:
- ✅ Clean detection engine architecture (pure functions, shared types)
- ✅ Type-safe throughout (TypeScript, Zod, Prisma)
- ✅ Good separation between HTTP layer and business logic
- ✅ Working authentication and user management
- ✅ Comprehensive URL and content detection heuristics

### Liabilities
- ⚠️ Missing security controls (rate limiting, CSP, input sanitization)
- ⚠️ Incomplete feature set (no threat intel APIs, no background processing, no export)
- ⚠️ Hardcoded configuration and magic numbers
- ⚠️ No test coverage
- ⚠️ Scalability limitations (no caching, no pagination on user data, synchronous scans)
- ⚠️ Inconsistent error handling and API response formats

### Key Architectural Issues to Address
1. **Add service layer** between API routes and detection engines
2. **Implement rate limiting** on auth and scan endpoints
3. **Standardize API response format**
4. **Add caching** for detection results
5. **Externalize configuration** (brand lists, scoring weights, feature flags)
6. **Improve testing** (unit tests for detection engines, integration tests)
7. **Harden security** (CSP, input validation, XSS prevention, session management)

The codebase is maintainable and extensible, but requires deliberate investment in security, testing, and configuration management to reach production quality.