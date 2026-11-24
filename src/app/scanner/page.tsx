import Link from "next/link";
import { ScannerTabs } from "@/components/ScannerTabs";

export default function ScannerPage() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg, #00ffff 0%, #8b5cf6 100%)" }}>
              🛡️
            </div>
            <span className="text-xl font-extrabold text-cyan-300 tracking-tight">THREATLY</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-gray-300 hover:text-cyan-300 transition-colors">Home</Link>
            <Link href="/dashboard" className="text-gray-300 hover:text-cyan-300 transition-colors hidden sm:block">Dashboard</Link>
            <Link href="/about" className="text-gray-300 hover:text-cyan-300 transition-colors">About</Link>
            <Link href="/login" className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 transition-all text-xs">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Scanner Section */}
      <main className="pt-28 pb-16 px-4 md:px-8 max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <span className="inline-block px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono uppercase tracking-wider mb-3">
            Real-Time Analysis Pipeline
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Threat Scanner
          </h1>
          <p className="mt-3 text-base text-gray-300 max-w-xl mx-auto">
            Input a URL, QR code, SMS message, or email payload to evaluate security indicators and receive explainable verdicts.
          </p>
        </div>

        <ScannerTabs />
      </main>

      {/* Footer */}
      <footer className="border-t border-cyan-500/10 py-8 px-4 text-center text-xs text-gray-500 relative z-10">
        <p>© 2025 THREATLY — Unified Cybersecurity Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
