"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    resetUrl?: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessInfo(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to process password reset request.");
      } else {
        setSuccessInfo({
          message: data.message || "Password reset authorization generated.",
          resetUrl: data.resetUrl,
        });
      }
    } catch {
      setError("Network error while connecting to security verification service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-12 relative z-10 text-gray-200">
      <div className="fixed inset-0 z-0 grid-bg" />
      <div className="glass-strong rounded-2xl p-8 w-full max-w-md border border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,255,0.1)] relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="mb-3">
            <BrandLogo size="lg" href="/" showBadge={false} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">Reset Password</h1>
          <p className="text-sm text-cyan-400/80 font-mono mt-1 text-center">
            Recover access to your THREATLY Command Center
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-950/60 border border-red-500/60 text-red-300 rounded-lg text-sm flex items-start gap-2.5" role="alert">
            <span className="text-base leading-none mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {successInfo ? (
          <div className="space-y-5">
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 rounded-xl text-sm flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold text-emerald-200">
                <span className="text-lg">✓</span>
                <span>Reset Authorization Ready</span>
              </div>
              <p className="text-xs text-emerald-300/90 leading-relaxed">
                {successInfo.message}
              </p>
            </div>

            {successInfo.resetUrl && (
              <div className="p-4 rounded-xl bg-black/60 border border-cyan-500/30 space-y-3">
                <p className="text-xs text-gray-400 font-mono">
                  Direct Verification Link:
                </p>
                <Link
                  href={successInfo.resetUrl}
                  className="w-full py-3 px-4 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <span>Set New Password Now</span>
                  <span>→</span>
                </Link>
              </div>
            )}

            <div className="pt-3 text-center">
              <Link href="/login" className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                ← Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="reset-email" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Account Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                placeholder="operator@threatly.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-sm transition-all"
              />
              <p className="text-[11px] text-gray-500 mt-2 font-mono">
                Enter the email associated with your THREATLY account to authorize a password change.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3.5 rounded-lg bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Generate Reset Authorization</span>
              )}
            </button>

            <div className="mt-6 pt-6 border-t border-cyan-500/10 text-center flex flex-col gap-2">
              <Link href="/login" className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                ← Remember your password? Sign In
              </Link>
              <Link href="/" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
                Return to Home
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
