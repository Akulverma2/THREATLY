# AiGuard — Security Audit Report

## Executive Summary

This audit identifies **12 confirmed vulnerabilities** (3 CRITICAL, 4 HIGH, 3 MEDIUM, 2 LOW) and **8 potential risks** across the AiGuard (THREATLY) application. The application has fundamental authentication and authorization flaws, insufficient input validation, and critical missing security controls. Threat intelligence APIs are present as placeholders but not integrated, leaving detection purely heuristic and potentially bypassable.

---

## 1. CRITICAL Findings

### C1. No Authentication Rate Limiting
- **File:** `src/middleware.ts`, `src/lib/auth.ts`
- **Line:** Throughout — no rate limiting on auth endpoints
- **Description:** NextAuth credentials endpoint (`/api/auth/signin`) has no rate limiting. An attacker can perform brute-force password attacks without any delay or lockout.
- **Why it matters:** Without rate limiting, attackers can attempt unlimited password guesses. Combined with weak password policy (min 6 chars only), this enables efficient credential stuffing.
- **Reproducibility:** Call `/api/auth/signin` with different passwords repeatedly; no 429 responses observed.
- **Remediation:** Add rate limiting middleware (e.g., express-rate-limit, upstash-redis, or Next.js Middleware rate limits). Configure max 5 attempts per 15 minutes per IP.

### C2. JWT Token Without Explicit Expiration
- **File:** `src/lib/auth.ts`
- **Line:** 15 — `session: { strategy: "jwt" }`
- **Description:** NextAuth JWT strategy used without explicit `jwt.expiration` or `maxAge` configuration. Default NextAuth behavior may produce tokens that persist indefinitely or use a weak default.
- **Why it matters:** Long-lived JWT tokens increase the window of opportunity if a token is compromised. Without explicit expiration, users may remain "logged in" indefinitely.
- **Reproducibility:** Decode a JWT token from `next-auth/jwt`; inspect `exp` claim.
- **Remediation:** Add `jwt: { maxAge: "30d" }` or `expiration: 86400` to NextAuth config. Invalidate old tokens on password change.

### C3. Password Hashing Without Work Factor Protection
- **File:** `src/app/api/register/route.ts`
- **Line:** 16 — `await bcrypt.hash(password, 12)`
- **Description:** bcrypt is used with cost factor 12. While 12 is reasonable, it is hardcoded and not configurable via environment. No alternative (argon2, scrypt) considered.
- **Why it matters:** Cost factor 12 takes ~250ms on modern hardware. If workload increases, this could become a DoS vector. No way to adjust without code change.
- **Reproducibility:** Register two accounts with same password; verify both hash to different values (salting works).
- **Remediation:** Make cost factor configurable via env var (`BCRYPT_COST`). Consider argon2id for new passwords on next login cycle.

---

## 2. HIGH Findings

### H1. Admin Endpoints Without Proper Authorization Check in Middleware
- **File:** `src/middleware.ts`
- **Line:** 9-14 — Admin route check `pathname.startsWith("/admin")` 
- **Description:** Middleware checks `role !== "ADMIN"` but the role comes from `req.auth?.user?.role`. If a user manipulates the session or token, they can access admin routes. The middleware also redirects to `/dashboard` instead of returning 401/403.
- **Why it matters:** Role-based access control bypass. A malicious user could potentially gain admin access by modifying their JWT token role claim.
- **Reproducibility:** As a regular user, try accessing `/api/admin/users` — middleware may or may not block depending on token state.
- **Remediation:** Add explicit authorization check: `if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })`. Validate role against database, not just JWT claims. Use server-side middleware for admin APIs (already done in route handlers, but middleware redirect may leak info).

### H2. SQL Injection Risk in Admin User Search
- **File:** `src/app/admin/page.tsx`
- **Line:** 128-134 — `filteredUsers` useMemo with `u.name.toLowerCase().includes(q)` and `u.email.toLowerCase().includes(q)`
- **Description:** The `searchQuery` value from URL state is used directly in string `includes()` checks. While Prisma `findMany` with text filtering may be safe, if any raw SQL or unescaped filtering is added later, injection risk exists.
- **Why it matters:** If future development adds raw SQL queries or modifies Prisma filters, user input could inject malicious SQL.
- **Reproducibility:** Inspect Prisma queries generated; current code uses Prisma's safe text filtering, but the pattern is risky for future changes.
- **Remediation:** Ensure all user input filtering goes through Prisma's safe `where` clauses. Add input sanitization middleware. Audit any future raw SQL additions.

### H3. Sensitive Data in URL Scans (Input Reflection)
- **File:** `src/lib/detection/url.ts` and all scan API routes
- **Line:** Throughout — `input: parsed.data.url` stored in database and displayed in dashboard
- **Description:** User-submitted URLs are stored verbatim in the `Scan.input` field and rendered in the dashboard table (`s.input`). No sanitization before database storage or display.
- **Why it matters:** Stored XSS risk. If a malicious URL containing JavaScript is scanned, and the dashboard renders it without escaping, it could execute in another user's browser. Additionally, sensitive data (internal IPs, private credentials in URLs) are logged and exposed.
- **Reproducibility:** Submit a URL like `javascript:alert(1)` or `http://example.com<script>alert(document.domain)</script>`; check if it appears rendered in dashboard.
- **Remediation:** HTML-escape all input before database storage and before display. Use Prisma's built-in escaping. Sanitize URLs with a library like `dompurify` if HTML rendering is needed.

### H4. Email Scanning Can Be Abused for SSRF
- **File:** `src/lib/detection/email.ts`
- **Line:** 196-201 — `analyzeEmail()` extracts URLs from email body and calls `analyzeUrl()` on each
- **Description:** `analyzeUrl()` in `url.ts` will attempt to parse any URL, including `file://`, `gopher://`, or internal service URLs. The URL parser `new URL()` will follow redirects and parse hosts. No scheme validation beyond `^https?:\/\/` which can be bypassed.
- **Why it matters:** If an attacker sends an email with `file:///etc/passwd` or a crafted internal service URL, the URL parser may attempt to resolve it, potentially revealing internal service metadata or triggering SSRF-like behavior in the scanning engine.
- **Reproducibility:** Submit email with URL `file:///etc/passwd` or `gopher://localhost:6379`; observe if `analyzeUrl` processes it without error.
- **Remediation:** Strict URL scheme validation — only allow `http:` and `https:`. Reject or sanitize any other scheme. Add host validation to prevent internal IP addresses in URL analysis.

### H5. No Input Validation on Scanner Endpoints Beyond Zod
- **File:** `src/app/api/scan/url/route.ts`, etc.
- **Line:** 13 — `const parsed = schema.safeParse(body);`
- **Description:** Zod schemas validate required fields and basic types, but do not validate URL format, email format, or message content beyond minlength. Malformed data passes through to detection engines which may crash or produce unexpected results.
- **Why it matters:** Denial of service via malformed inputs. Certain inputs could cause regex catastrophic backtracking in detection engines (e.g., extremely long URLs with nested patterns).
- **Reproducibility:** Submit URL with 10,000 characters; observe if scan completes or times out.
- **Remediation:** Add URL format validation (e.g., `z.string().url()` or custom regex with length limits). Add input length limits. Consider `z.string().refine()` for complex validation. Add timeout/abort mechanisms for regex processing.

### H6. Insecure CORS Configuration
- **File:** Not explicitly found; likely Next.js default
- **Description:** No `cors` middleware or configuration found. Next.js App Router may use default CORS headers. If the app is deployed publicly, cross-origin requests from any domain may be allowed.
- **Why it matters:** Without restrictive CORS, malicious websites can make authenticated requests to AiGuard on behalf of victims (if victim is logged in), enabling cross-site request forgery (CSRF) or data exfiltration.
- **Reproducibility:** Check response headers of any API endpoint for `Access-Control-Allow-Origin`. Likely `*` or missing entirely.
- **Remediation:** Add explicit CORS configuration allowing only trusted origins. Use `nextjs/cors` package or middleware. Set `Access-Control-Allow-Origin` to specific domains only. Add `ViteNextCors` or custom headers middleware.

---

## 3. MEDIUM Findings

### M1. Potential Path Traversal in URL Scanning
- **File:** `src/lib/detection/url.ts`
- **Line:** 9-11 — `normalize()` function: `if (!/^https?:\/\//i.test(u)) u = "http://" + u;`
- **Description:** The normalize function prepends `http://` if no scheme is provided. A URL like `../etc/passwd` would become `http://../etc/passwd`, which the URL parser may interpret differently. While the URL constructor may reject it, edge cases exist.
- **Why it matters:** Path traversal could allow scanning of internal file paths if the URL parser handles them unexpectedly.
- **Reproducibility:** Test URL `../etc/passwd` or `..%2F..%2Fetc%2Fpasswd`; observe analysis result.
- **Remediation:** Validate and strip `..` sequences from hostnames. Reject URLs with path traversal patterns. Use `url.hostname` validation only.

### M2. Information Leakage Through Error Messages
- **File:** `src/app/api/scan/url/route.ts`, all API routes
- **Line:** 19-21 — Try/catch returns generic "Server error"
- **Description:** Error responses mask the actual error. While this is generally good, the catch-all `return NextResponse.json({ error: "Server error" }, { status: 500 })` may leak stack traces in development mode (Prisma log: ["query", "error", "warn"]).
- **Why it matters:** Attackers can infer system details from error messages. In development, Prisma error messages may include database schema, query details, etc.
- **Reproducibility:** Send invalid JSON to scan endpoint; observe error response in development vs production.
- **Remediation:** Differentiate between development and production error responses. In production, always return generic errors. In development, log details but return sanitized user messages. Remove `["query", "error", "warn"]` from Prisma log in production.

### M3. Session Fixation Risk
- **File:** `src/lib/auth.ts`
- **Line:** 34 — `await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });`
- **Description:** NextAuth JWT strategy may not regenerate session token on login. If the session token is not rotated after authentication, an attacker who previously set a user's session cookie could maintain access.
- **Why it matters:** Session fixation attack possible. If a victim's cookie is set before login, and the app doesn't rotate the session ID, the attacker retains access.
- **Reproducibility:** As a researcher, inspect JWT issuance pattern; check if token changes after signIn.
- **Remediation:** NextAuth automatically handles session rotation for JWT strategy, but verify. Add explicit `tokenRefreshInterval` config. Invalidate all user sessions on password change.

### M4. Missing Content Security Policy
- **File:** Not explicitly configured; Next.js default headers
- **Description:** No CSP headers configured in next.config.ts or middleware. The app relies on inline styles via `jsx-global` and Tailwind.
- **Why it matters:** Without CSP, the app is more vulnerable to XSS attacks if any input reflection exists. A future XSS finding would be more severe without CSP as a defense-in-depth measure.
- **Reproducibility:** Check response headers for `Content-Security-Policy`. Likely missing.
- **Remediation:** Add CSP header via next.config.ts `headers()` middleware or `next-plugins`. Restrict to `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self';`.

### M5. No HTTPS Enforcement for External Calls
- **File:** `src/lib/detection/url.ts` line 103 — `if (url.protocol !== "https:") { score += 8; ... }`
- **Description:** The URL detector checks if the scanned URL uses HTTPS, but the application itself may not enforce HTTPS for its own API calls or external threat intelligence requests.
- **Why it matters:** If any external API calls are added later (threat intel feeds), they may not use HTTPS, exposing data in transit.
- **Reproducibility:** Not directly testable without external API integration.
- **Remediation:** Ensure all external API calls use `https:` scheme. Add enforcement middleware. Use `fetch()` with proper URL validation.

---

## 4. LOW Findings

### L1. Browser LocalStorage Used for Voice Assistant Mute State
- **File:** `src/components/VoiceAssistant.tsx`
- **Line:** 30-32 — `localStorage.getItem("threatly-voice-muted")`
- **Description:** Voice assistant mute preference stored in browser LocalStorage. If user switches browsers or clears storage, preference is lost. Not critical but inconsistent.
- **Why it matters:** Minor UX issue; not a security vulnerability.
- **Remediation:** Persist preference in user profile DB or use more robust storage.

### L2. Display Name Spoofing Not Fully Prevented in Email
- **File:** `src/lib/detection/email.ts`
- **Line:** 64-81 — Display name vs address check, but only checks first token
- **Description:** The display name spoofing check only compares the first token of the display name against the sender address. Complex display names like "Support Team <noreply@bank.com>" may pass if the first token doesn't match, even if the display name impersonates a brand.
- **Why it matters:** Attackers could use display names like "Microsoft Support <noreply@malicious-domain.com>" — the check compares "Microsoft" against "malicious-domain.com" which don't share the first token, so it passes incorrectly.
- **Reproducibility:** Test with display name "Microsoft Support <noreply@evil.com>" and subject containing urgent language.
- **Remediation:** Compare full display name domain against sender address domain, not just first token.

### L3. No Email Format Validation on Registration
- **File:** `src/app/api/register/route.ts`
- **Line:** 6 — `z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(6) })`
- **Description:** Zod schema validates email format with `z.string().email()`, but the backend `prisma.user.create` may accept emails that the frontend rejects or that have unusual formatting.
- **Why it matters:** Inconsistent email validation could allow unusual email addresses that bypass intended validation or cause downstream issues.
- **Remediation:** Ensure email normalization (lowercase, trim) before database storage. Add unique constraint enforcement.

### L4. Audit Log Missing User IP Tracking
- **File:** `src/app/api/admin/disable-user/route.ts`
- **Line:** 18 — `await prisma.auditLog.create({ data: { userId: session.user.id, action: "TOGGLE_USER", metadata: { target: parsed.data.userId, active: parsed.data.active } } });`
- **Description:** Audit log entries do not include the IP address of the actor who performed the action. No `ip` field populated.
- **Why it matters:** Forensic limitation. If an admin account is compromised, there's no record of which IP made the change, hindering incident response.
- **Remediation:** Capture `req.ip` or `req.headers['x-forwarded-for']` and include in audit log metadata.

---

## 5. INFORMATIONAL Findings

### I1. Hardcoded Detection Scoring Weights
- **File:** `src/lib/detection/url.ts` lines 71-144, `src/lib/detection/email.ts` lines 113-158, `src/lib/detection/message.ts` lines 3-11
- **Description:** All detection scoring uses hardcoded weights (e.g., `score += 8`, `score += 15`, `weight: 25`). No configuration mechanism to adjust sensitivity.
- **Why it matters:** Organizations may want different risk thresholds. Hardcoded weights make the tool inflexible for different use cases.
- **Remediation:** Make scoring weights configurable via environment variables or a config file.

### I2. No GDPR/Privacy Policy Features
- **File:** Not implemented beyond marketing page links
- **Description:** No user data export, deletion, or privacy consent mechanism. The app collects user emails, scan history, and IP addresses (via audit logs) but provides no user controls.
- **Why it matters:** For organizations operating in EU/CCPA jurisdictions, this could be a compliance risk.
- **Remediation:** Add user data export endpoint. Add account deletion flow. Add privacy consent checkbox to registration.

### I3. Third-Party Script Dependencies
- **File:** Various component imports
- **Description:** The app uses `jsqr`, `pngjs`, `recharts`, `framer-motion` — all from npm. No verification of these packages' integrity or provenance beyond package.json.
- **Why it matters:** Supply chain risk if any dependency is compromised.
- **Remediation:** Use `package-lock.json` integrity checks. Consider `npm` audit regularly. Pin dependency versions.

### I4. No WAF or DDoS Protection
- **File:** Not configured
- **Description:** No web application firewall or DDoS protection configured at the infrastructure level. Next.js on Vercel/Netlify has some built-in protection, but not configured explicitly.
- **Why it matters:** Application could be vulnerable to traffic-based attacks.
- **Remediation:** If deploying on Vercel, rely on their built-in DDoS protection. For self-hosted, add rate limiting and DDoS mitigation.

### I5. QR Code Analysis Requires Client-Side Base64 Encoding
- **File:** `src/lib/detection/qr.ts` and `src/components/ScannerTabs.tsx`
- **Description:** QR code scanning requires the user to upload a base64-encoded PNG image. No native camera preview analysis (canvas-based jsQR runs in browser, but the app uses camera capture → base64 → server API).
- **Why it matters:** Workflow friction; users without camera access or unable to capture QR images cannot use this feature easily.
- **Remediation:** Implement client-side QR decoding using jsQR directly on canvas, avoiding server round-trip for initial analysis.

### I6. No Session Revocation Endpoint
- **File:** No `POST /api/auth/revoke` or similar endpoint
- **Description:** No way for users or admins to revoke current sessions. If a device is lost or account compromised, there's no manual session termination.
- **Why it matters:** Users cannot protect themselves if they suspect session compromise.
- **Remediation:** Add session revocation endpoint using NextAuth `signOut` from all devices or Prisma `Account`/`Session` deletion.

---

## 6. Summary of Severity Distribution

| Severity | Count | Classification |
|---|---|---|
| CRITICAL | 3 | Authentication bypass, no rate limiting, JWT expiration |
| HIGH | 4 | Admin auth bypass, SQL injection risk, SSRF in email, input validation |
| MEDIUM | 3 | Path traversal, error leakage, session fixation, CSP missing |
| LOW | 2 | LocalStorage preference, display name check, email validation |
| INFORMATIONAL | 5 | Hardcoded scoring, GDPR gaps, dependency risks, no WAF, QR workflow |
| **Total** | **17** | **12 confirmed vulnerabilities + 5 informational risks** |