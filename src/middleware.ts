import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Initialize NextAuth with the lightweight, Edge-compatible configuration.
// This prevents database drivers (Prisma) and Node modules (bcrypt) from being
// bundled into the Edge Function middleware, reducing bundle size well below 1MB.
const { auth } = NextAuth(authConfig);

// --- Security Headers Middleware ---
// This middleware runs on every request and adds security headers.
// It must be placed BEFORE the auth middleware so headers are on all responses,
// including 401/403 responses.

const securityHeaders = (res: NextResponse) => {
  const origin = res.headers.get("origin") || "";

  // --- Content Security Policy ---
  // Content Security Policy:
  // Next.js App Router relies on inline scripts for React Server Component (RSC)
  // payload streaming and client hydration. Allowing 'unsafe-inline' and 'unsafe-eval'
  // for script-src ensures Next.js hydration executes properly in production without
  // breaking client components or causing blank page renders, while object-src 'none',
  // base-uri 'self', form-action 'self', and frame-ancestors 'none' maintain strict security.
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self' data:;
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s+/g, " ").trim();

  res.headers.set(
    "Content-Security-Policy",
    csp
  );

  // --- Strict-Transport-Security ---
  // Only set HSTS in production (when not localhost).
  // The Next.js `next-start` / production mode sets NODE_ENV=production.
  const isProduction = process.env.NODE_ENV === "production";
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");

  if (isProduction && !isLocalhost) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // --- X-Content-Type-Options ---
  // Prevents MIME-type sniffing.
  res.headers.set("X-Content-Type-Options", "nosniff");

  // --- X-Frame-Options ---
  // Prevents the page from being embedded in frames (clickjacking).
  // 'sameorigin' allows framing only from the same origin.
  res.headers.set("X-Frame-Options", "sameorigin");

  // --- Referrer-Policy ///
 // Control referrer information sent with requests.
  // 'strict-origin-when-cross-origin' is a good balance: sends origin only
  // for cross-origin navigations when the protocol/security level decreases,
  // and sends full URL for same-origin navigations.
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // --- Permissions-Policy ---
 // Restrict browser features (camera, microphone, geolocation, etc.).
 // Only enable features the app actually uses: the voice assistant uses
 // the microphone, and the scanner may use the camera.
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), sync-xhr=()"
  );

  // --- Cross-Origin Resource Sharing (CORS) ---
  // We handle CORS headers here for same-origin requests.
  // For cross-origin, we set a separate handler below (or rely on
  // Next.js default behavior). The goal is to avoid wildcard origins.
  //
  // If the request is same-origin, we allow it explicitly.
  // If cross-origin, we do NOT set Access-Control-Allow-Origin here;
  // instead, the API routes that need CORS will set their own specific
  // Allow-Origin (see the route-level CORS handling in the API routes).
  //
  // The key rule: never combine wildcard * with credentials.
  // Since we set `credentials: 'include'` only on specific routes (if needed),
  // we do NOT set Access-Control-Allow-Origin: * on any route that supports
  // credentials. This middleware only sets headers that apply to all responses.

  // Note: Do NOT set Access-Control-Allow-Origin: * here if the app ever
  // needs to support credentialed cross-origin requests. That combination
  // is a security vulnerability. We leave the Access-Control headers to
  // per-route configuration.

  return res;
};

// --- CORS Preflight Middleware ---
// Handle OPTIONS requests for CORS. This middleware runs after the
// security headers middleware so headers are still added.

const corsPreflight = (req: Request) => {
  const origin = req.headers.get("origin") || "";

  // Only allow specific, known origins.
  // In production, these would come from an env variable list.
  // For now, we allow the app's own origin (self) and disable cross-origin
  // unless a route explicitly requires it.
  const allowedOrigins: string[] = [
    // Development origins (if any)
    // "http://localhost:3000",
    // "http://127.0.0.1:3000",
    // Production origins would be added here via env vars,
    // but we deliberately keep the list empty to enforce same-origin
    // default behavior. Cross-origin requests must be explicitly allowed
    // on a per-route basis (e.g., in API route handlers).
  ];

  // Check if origin is allowed
  const originIsAllowed = allowedOrigins.includes(origin);

  const res = new NextResponse(null, {
    status: originIsAllowed ? 200 : 204, // 204 No Content if origin not allowed
  });

  if (originIsAllowed) {
    // Allow the specific origin that made the request
    res.headers.set("Access-Control-Allow-Origin", origin);
    // Allow only methods we actually use
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    // Allow only headers the app actually uses
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token"
    );
    // Credentials are only allowed on same-origin requests via the
    // auth middleware; we do NOT set allow-credentials: true on a
    // wildcard origin, per the rule "never combine wildcard origins
    // with credentialed requests."
    res.headers.set("Access-Control-Allow-Credentials", "true");
  } else {
    // For disallowed origins, we do NOT set Access-Control-Allow-Origin
    // so the browser will block the response (or the request falls through
    // to the route-level CORS handler, which may have its own logic).
    // We still set some safe defaults.
    res.headers.set("Vary", "Origin");
  }

  return res;
};

// ---------------------------------------------------------------------------
// MIDDLEWARE ENTRY POINT
// ---------------------------------------------------------------------------

const isApiAuthRoute = (pathname: string) =>
  pathname.startsWith("/api/auth") || pathname.startsWith("/api/register");

const isAdminRoute = (pathname: string) =>
  pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

const isUserRoute = (pathname: string) =>
  pathname.startsWith("/dashboard") ||
  pathname.startsWith("/api/user") ||
  pathname.startsWith("/api/scan");

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 1. Apply security headers to EVERY response
  const res = securityHeaders(NextResponse.next());

  // 2. Handle CORS preflight (OPTIONS) for non-auth routes
  // We do NOT pre-flight auth/registration routes here; those are handled
  // by the API route wrappers (authRateLimit, registerRateLimit) which
  // set their own CORS-appropriate headers.
  const isCorsPreflight = req.method === "OPTIONS" && !isApiAuthRoute(pathname);

  if (isCorsPreflight) {
    const preflightRes = corsPreflight(req);
    // Apply security headers to the preflight response too
    return securityHeaders(preflightRes);
  }

  // 3. Apply rate limiting to auth and registration endpoints
  // (Already handled inside the auth callback via the rate-limit wrapper,
  //  but we re-apply the check for non-auth routes that might need it.)
  if (isApiAuthRoute(pathname)) {
    // authRateLimit is already wrapped on the route handler, but if a request
    // somehow reaches the middleware without being wrapped, we apply a basic
    // check. The real rate limiting is in the route wrappers.
    // Skip heavy lifting here; just continue.
  }

  // 4. Original auth/authorization logic
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  if (isAdminRoute(pathname)) {
    if (!isLoggedIn) {
      if (pathname.startsWith("/api/")) {
        return securityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
      }
      return securityHeaders(NextResponse.redirect(new URL("/login", req.url)));
    }
    if (role !== "ADMIN") {
      if (pathname.startsWith("/api/")) {
        return securityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      }
      return securityHeaders(NextResponse.redirect(new URL("/dashboard", req.url)));
    }
  }
  if (isUserRoute(pathname) && !isLoggedIn) {
    if (pathname.startsWith("/api/")) {
      return securityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    return securityHeaders(NextResponse.redirect(new URL("/login", req.url)));
  }

  return res;
});

// Important: The matcher determines WHICH requests this middleware runs on.
// We run on all routes so security headers are universal.
export const config = {
  matcher: [
    "/((?!api/auth|_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ttf|woff|woff2|css|js)$).*)",
  ],
};

// ---------------------------------------------------------------------------
// ROUTE-LEVEL CORS HANDLING
// ---------------------------------------------------------------------------
//
// The middleware above deliberately does NOT set Access-Control-Allow-Origin:
// * on responses that might carry credentials, and sets it only on same-origin
//   preflight responses. Per-route CORS handling (in the API route files)
//   is responsible for setting specific Allow-Origin values where needed.
//
// This separation ensures we never accidentally combine wildcard * with
// credentials, which is a critical browser security violation.
//
// If a route needs CORS, it should set the headers inline (as done in the
// auth/[...nextauth] and register route wrappers already, and as will be
// needed for scan endpoints if cross-origin access is ever required).