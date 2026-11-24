"use client";

import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setLoading(false);
        setError("Invalid email or password. Please verify your credentials.");
        return;
      }

      setSuccess(true);
      try {
        const session = await getSession();
        const destination = session?.user?.role === "ADMIN" ? "/admin" : "/dashboard";
        router.push(destination);
        router.refresh();
      } catch {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setLoading(false);
      setError("An unexpected authentication error occurred. Please try again.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-12 relative z-10 text-gray-200">
      <div className="glass-strong rounded-2xl p-8 w-full max-w-md border border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,255,0.1)]">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 shadow-[0_0_20px_rgba(0,255,255,0.3)]" style={{ background: "linear-gradient(135deg, #00ffff 0%, #8b5cf6 100%)" }}>
            🛡️
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Agent Sign In</h1>
          <p className="text-sm text-cyan-400/80 font-mono mt-1">Authenticate to THREATLY Command Center</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-950/60 border border-red-500/60 text-red-300 rounded-lg text-sm flex items-start gap-2.5" role="alert">
            <span className="text-base leading-none mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-3.5 bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 rounded-lg text-sm flex items-start gap-2.5" role="status">
            <span className="text-base leading-none mt-0.5">✓</span>
            <span>Authentication successful. Redirecting to workspace...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="operator@threatly.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-sm transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="login-password" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-11 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-300 text-sm focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3.5 rounded-lg bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : success ? (
              <span>Authenticated</span>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-cyan-500/10 text-center">
          <p className="text-sm text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">
              Create Account
            </Link>
          </p>
          <div className="mt-3">
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
              ← Return to THREATLY Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
