# THREATLY — Security Architecture & Threat Model

This document outlines the security controls, defensive architecture, threat model, and vulnerability management practices implemented across THREATLY.

---

## 1. Threat Model & Scope

THREATLY is designed to defend end-users and enterprise environments against common cyber attack vectors:

| Threat Vector | Attack Mechanism | THREATLY Countermeasure |
|---|---|---|
| **Phishing URLs** | Lookalike brand domains, deceptive TLDs, URL shorteners | Heuristic domain analysis, Levenshtein distance typosquatting checks, suspicious TLD tracking. |
| **Server-Side Request Forgery (SSRF)** | Submitting loopback or cloud metadata IPs to scanner APIs | Strict RFC 1918 private IP and `169.254.169.254` cloud metadata detection in `analyzeUrl`. |
| **Email Spoofing & Phishing** | Header forgery, display name spoofing, malicious attachments | Header validation for SPF/DKIM flags, display name mismatch alerts, risky attachment extension filters. |
| **SMS Phishing (Smishing)** | Fear-appeal messages, fake package delivery alerts, banking lures | NLP keyword scoring, phone number format verification, embedded URL analysis. |
| **Malicious QR Codes (Quishing)** | Physical/digital QR codes redirecting to credential stealers | Image matrix parsing via `pngjs` and `jsqr`, followed by recursive threat analysis on decoded URLs. |
| **Bcrypt Denial-of-Service** | Submitting huge strings (e.g. 1MB) to CPU-intensive bcrypt hash | Strict Zod validation capping password length at 128 characters. |
| **Cross-Site Scripting (XSS)** | Injected malicious JavaScript in web pages | Strict Content-Security-Policy (CSP) restricting script execution to `'self'`. |
| **Clickjacking** | Embedding application inside malicious iframes | `X-Frame-Options: sameorigin` and `frame-ancestors 'none'` in CSP. |
| **Brute-Force / Credential Stuffing** | Automated login and registration attempts | In-memory sliding-window rate limiting with `Retry-After` headers and 429 status code. |

---

## 2. Implemented Defense-in-Depth Layers

### 2.1 HTTP Security Headers
Every HTTP response processed by `src/middleware.ts` automatically receives hardened security headers:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: sameorigin
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), sync-xhr=()
```

### 2.2 API Route Protection & Machine-Readable Errors
Standard web applications often issue 302/307 redirects to login pages when unauthorized requests hit API routes. THREATLY's middleware explicitly separates API paths from web navigation:
- Unauthenticated requests to `/api/*` receive **HTTP 401 Unauthorized** with `{"error": "Unauthorized"}` JSON payloads.
- Authenticated non-admin requests to `/api/admin/*` receive **HTTP 403 Forbidden** with `{"error": "Forbidden"}` JSON payloads.
- Web page routes (`/dashboard`, `/admin`) cleanly redirect browser sessions to `/login`.

### 2.3 Input Validation & Resource Guards
All API route handlers parse inputs through strict Zod schemas before touching business logic or the database:
- **Registration (`/api/register`):**
  - `name`: Max 100 characters, regex-restricted against script tags.
  - `email`: Valid RFC 5321 email format, max 254 characters.
  - `password`: Min 6, max 128 characters.
- **URL Scanner (`/api/scan/url`):** Max length of 2,048 characters.
- **QR Scanner (`/api/scan/qr`):** Base64 string capped at 7,000,000 characters (~5MB limit).
- **Message Scanner (`/api/scan/message`):** Max length of 10,000 characters.
- **Email Scanner (`/api/scan/email`):** Body max 500,000 characters; sender max 320 characters; subject max 1,000 characters; raw headers max 50,000 characters.

### 2.4 Rate Limiting Architecture
Rate limiting (`src/middleware/rate-limit.ts`) uses an in-memory sliding-window counter:
- **Login attempts:** 20 requests per 15-minute window per IP.
- **Registration attempts:** 10 requests per 15-minute window per IP.
- **Scan submissions:** 30 requests per 1-minute window per IP.
- **Exceeded responses:** Emits HTTP 429 with standard `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.

---

## 3. Security Disclaimers

While THREATLY implements robust cybersecurity defenses, no automated threat detection engine provides 100% detection accuracy. Users should exercise caution and verify critical communications through out-of-band channels.

---

## 4. Vulnerability Disclosure

If you discover a security vulnerability in THREATLY, please report it privately to the repository maintainers rather than opening a public issue.
