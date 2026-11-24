"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordLengthValid = password.length >= 6;
  const passwordHasNumber = /\d/.test(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordLengthValid) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      setLoading(false);

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Registration failed. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/login");
      }, 1000);
    } catch {
      setLoading(false);
      setError("Network or server error during registration.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-12 relative z-10 text-gray-200">
      <div className="glass-strong rounded-2xl p-8 w-full max-w-md border border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,255,0.1)]">
        <div className="flex flex-col items-center mb-6">
          <div className="mb-3">
            <BrandLogo size="lg" href="/" showBadge={false} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">Create Account</h1>
          <p className="text-sm text-cyan-400/80 font-mono mt-1">Join the THREATLY Threat Defense Network</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-950/60 border border-red-500/60 text-red-300 rounded-lg text-sm flex items-start gap-2.5" role="alert">
            <span className="text-base leading-none mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-3.5 bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 rounded-lg text-sm flex flex-col gap-2" role="status">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">✓</span>
              <span>Account created successfully! Redirecting to sign in...</span>
            </div>
            <Link href="/login" className="text-xs text-cyan-300 underline font-semibold hover:text-cyan-200">
              Click here if not redirected automatically →
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Vance"
              required
              autoComplete="name"
              className="w-full px-4 py-3 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-sm transition-all"
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@domain.com"
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-sm transition-all"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                autoComplete="new-password"
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

            {password && (
              <div className="mt-2 text-xs flex gap-3 text-gray-400">
                <span className={passwordLengthValid ? "text-emerald-400" : "text-gray-500"}>
                  {passwordLengthValid ? "✓" : "○"} 6+ characters
                </span>
                <span className={passwordHasNumber ? "text-emerald-400" : "text-gray-500"}>
                  {passwordHasNumber ? "✓" : "○"} contains number
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3.5 rounded-lg bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-cyan-500/10 text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">
              Sign In
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
