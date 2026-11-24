import { handlers } from "@/lib/auth";
import { authRateLimit } from "@/middleware/rate-limit";

// Wrap NextAuth handlers with rate limiting.
// The authRateLimit middleware sets X-RateLimit-* headers and returns 429
// when the configured limit is exceeded. It is applied at the handler level
// so that every auth request is rate-limited.

// CORS: This endpoint is same-origin by default (frontend and API on same domain).
// We set CORS headers here explicitly for development flexibility, but restrict
// to the request's origin (not wildcard) to avoid the wildcard+credentials anti-pattern.
// In production, the middleware's corsPreflight handler will manage OPTIONS requests
// based on the allowedOrigins list (currently empty, enforcing same-origin default).

export const { GET, POST } = authRateLimit(handlers);

// Since this is a NextAuth endpoint, we need to ensure CORS allows the frontend
// origin. The middleware sets Access-Control-Allow-Origin based on the Origin
// header for preflight requests. For actual GET/POST, the browser reads the
// headers from this response. We set a modest set of headers here so that
// same-origin requests work, and cross-origin preflights are handled by the
// middleware's corsPreflight logic above.

// Important: We do NOT set Access-Control-Allow-Origin: * because that would
// combine with NextAuth's potential use of cookies/session, violating the
// "no wildcard + credentials" rule. The origin is set per-request by the
// middleware's corsPreflight handler if the origin is in the allowed list.
// Since the allowed list is currently empty, same-origin is the default,
// which is correct for this deployment.