"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const qEmail = searchParams.get("email");
    const qToken = searchParams.get("token");
    if (qEmail) setEmail(qEmail);
    if (qToken) setToken(qToken);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    if (!token.trim()) {
      setError("Missing or invalid security reset token.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          token: token.trim(),
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update password.");
      } else {
        setSuccess(true);
        // Automatically redirect to login after short delay
        setTimeout(() => {
          window.location.assign("/login");
        }, 2500);
      }
    } catch {
      setError("Network error while connecting to password service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-strong rounded-2xl p-8 w-full max-w-md border border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,255,0.1)] relative z-10">
      <div className="flex flex-col items-center mb-6">
        <div className="mb-3">
          <BrandLogo size="lg" href="/" showBadge={false} />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">Set New Password</h1>
        <p className="text-sm text-cyan-400/80 font-mono mt-1 text-center">
          Configure a secure password for your operator account
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 bg-red-950/60 border border-red-500/60 text-red-300 rounded-lg text-sm flex items-start gap-2.5" role="alert">
          <span className="text-base leading-none mt-0.5">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="space-y-5">
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 rounded-xl text-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-emerald-200">
              <span className="text-lg">✓</span>
              <span>Password Successfully Reset</span>
            </div>
            <p className="text-xs text-emerald-300/90 leading-relaxed">
              Your credentials have been securely updated. Redirecting to Command Center sign in...
            </p>
          </div>

          <a
            href="/login"
            className="w-full py-3 px-4 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] transition-all flex items-center justify-center gap-2 text-sm"
          >
            <span>Proceed to Sign In Immediately</span>
            <span>→</span>
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Account Email
            </label>
            <input
              id="reset-email"
              type="email"
              placeholder="operator@threatly.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 text-sm transition-all"
            />
          </div>

          <div>
            <label htmlFor="reset-token" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Verification Token
            </label>
            <input
              id="reset-token"
              type="text"
              placeholder="Paste security reset token..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 font-mono text-xs transition-all"
            />
          </div>

          <div>
            <label htmlFor="new-password" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 pr-10 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-300 text-xs"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 text-sm transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword || !token}
            className="w-full mt-2 py-3.5 rounded-lg bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Confirm Password Reset</span>
            )}
          </button>

          <div className="mt-4 text-center">
            <Link href="/login" className="text-xs text-gray-400 hover:text-cyan-300 font-semibold transition-colors">
              ← Return to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-12 relative z-10 text-gray-200">
      <div className="fixed inset-0 z-0 grid-bg" />
      <Suspense
        fallback={
          <div className="glass-strong rounded-2xl p-8 w-full max-w-md border border-cyan-500/30 text-center text-cyan-300">
            <span className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin inline-block mb-3" />
            <p className="font-mono text-xs uppercase tracking-wider">Loading verification portal...</p>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
