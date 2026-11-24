"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ThreatRadar } from "@/components/ThreatRadar";

export default function AboutPage() {
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState({
    threatsBlocked: 0,
    usersProtected: 0,
    countries: 12,
    uptime: "99.99%",
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/public/stats")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d && typeof d.threatsBlocked === "number") {
          setStats({
            threatsBlocked: d.threatsBlocked,
            usersProtected: d.usersProtected,
            countries: Math.max(1, d.usersProtected),
            uptime: "99.99%",
          });
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const architecturePillars = [
    {
      title: "URL Heuristic Engine",
      role: "Phishing & Spoofing Defense",
      desc: "Analyzes domain age, entropy, IP address mapping, SSL certificates, redirect depth, homograph punycode spoofing, and SSRF targeting.",
      icon: "🔗",
    },
    {
      title: "Quishing & QR Decoder",
      role: "Visual Threat Extraction",
      desc: "Decodes high-density matrix barcodes, extracts embedded payloads, performs camera-frame analysis, and chains deep URL inspection.",
      icon: "📷",
    },
    {
      title: "Message & Smishing Guard",
      role: "Social Engineering Detection",
      desc: "Evaluates psychological manipulation signals, fake urgencies, OTP harvesting, lottery fraud, and obfuscated shortened URLs.",
      icon: "💬",
    },
    {
      title: "Email Forensic Engine",
      role: "BEC & Header Verification",
      desc: "Validates SPF, DKIM, and DMARC alignment, inspects sender reputation, uncovers display name spoofing, and checks attachments.",
      icon: "📧",
    },
  ];

  const values = [
    {
      icon: "🛡️",
      title: "Security First",
      desc: "Every heuristic rule, score threshold, and detection route is designed to maximize detection while preserving safe user operations.",
    },
    {
      icon: "🔍",
      title: "Explainable Verdicts",
      desc: "Zero black-box obscurity. Every scan verdict provides specific risk factors, indicators, and recommended mitigation actions.",
    },
    {
      icon: "⚡",
      title: "Real-Time Latency",
      desc: "Threat analysis executes in milliseconds using modular heuristic pipelines and asynchronous background telemetry.",
    },
    {
      icon: "🔒",
      title: "Privacy & Isolation",
      desc: "Strict data isolation. Test environments are fully sandboxed, passwords use bcrypt hashing, and user data is protected with RBAC.",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden text-gray-200">
      <div className="fixed inset-0 z-0 grid-bg" />

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-black/90 backdrop-blur-xl border-b border-cyan-500/20" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="THREATLY" width={160} height={44} className="h-10 w-auto object-contain" priority />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-gray-300 hover:text-cyan-300 font-medium transition-colors text-sm">Platform</Link>
            <Link href="#architecture" className="text-gray-300 hover:text-cyan-300 font-medium transition-colors text-sm">Architecture</Link>
            <Link href="#radar" className="text-gray-300 hover:text-cyan-300 font-medium transition-colors text-sm">Threat Radar</Link>
            <Link href="#contact" className="text-gray-300 hover:text-cyan-300 font-medium transition-colors text-sm">Contact</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="btn-secondary text-sm hidden sm:inline-flex">Sign In</Link>
            <Link href="/register" className="btn-primary text-sm">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-[60vh] flex items-center justify-center px-4 md:px-8 lg:px-12 pt-28 pb-16">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-mono mb-6">About THREATLY</span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gradient leading-tight">
              Explainable Cybersecurity Intelligence
            </h1>
            <p className="mt-6 text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Real-time threat detection for URLs, QR codes, messages, and emails.
              Combining multi-layer heuristics with explainable verdicts.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon="🚫" value={stats.threatsBlocked.toLocaleString()} label="Threats Blocked" color="red" />
            <StatCard icon="👥" value={stats.usersProtected.toLocaleString()} label="Protected Sessions" color="emerald" />
            <StatCard icon="🌍" value={String(stats.countries)} label="Monitored TLDs" color="cyan" />
            <StatCard icon="⏱️" value={stats.uptime} label="Service Target" color="purple" />
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section id="mission" className="relative z-10 py-16 px-4 md:px-8 lg:px-12 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-strong rounded-2xl p-8">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-4" style={{ background: "linear-gradient(135deg, #00ffff20, #8b5cf620)", border: "1px solid #00ffff40" }}>🎯</div>
              <h2 className="text-2xl font-bold text-white mb-4">Core Objective</h2>
              <p className="text-gray-300 leading-relaxed text-base">
                To deliver unified, explainable threat detection across communication channels. Rather than providing opaque black-box verdicts, THREATLY breaks down every risk signal with actionable indicators and remediation advice.
              </p>
            </div>

            <div className="glass-strong rounded-2xl p-8">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-4" style={{ background: "linear-gradient(135deg, #8b5cf620, #ec489920)", border: "1px solid #8b5cf640" }}>🔮</div>
              <h2 className="text-2xl font-bold text-white mb-4">Detection Approach</h2>
              <p className="text-gray-300 leading-relaxed text-base">
                Threat actors continuously evolve delivery vectors from lookalike domains to malicious QR codes (quishing) and SMS lure texts. THREATLY coordinates unified scoring weights to protect users before credentials or sessions are compromised.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Pillars */}
      <section id="architecture" className="relative z-10 py-16 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-cyan-400 font-mono text-sm uppercase tracking-wider">Engine Components</span>
            <h2 className="mt-3 text-4xl font-extrabold text-gradient">Detection Architecture</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {architecturePillars.map((p) => (
              <div key={p.title} className="glass-strong rounded-2xl p-6 hover:border-cyan-500/50 transition-all">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4" style={{ background: "rgba(0,255,255,0.1)", border: "1px solid rgba(0,255,255,0.3)" }}>{p.icon}</div>
                <h3 className="text-lg font-bold text-white mb-1">{p.title}</h3>
                <p className="text-cyan-400 text-xs font-mono mb-3">{p.role}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section id="values" className="relative z-10 py-16 px-4 md:px-8 lg:px-12 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-cyan-400 font-mono text-sm uppercase tracking-wider">Guiding Principles</span>
            <h2 className="mt-3 text-4xl font-extrabold text-gradient">Design Values</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="glass-strong rounded-2xl p-6 hover:border-cyan-500/50 transition-all">
                <div className="text-3xl mb-3">{v.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{v.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Threat Radar Showcase */}
      <section id="radar" className="relative z-10 py-16 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-cyan-400 font-mono text-sm uppercase tracking-wider">Telemetry Radar</span>
            <h2 className="mt-3 text-4xl font-extrabold text-gradient">Real-Time Threat Visualizer</h2>
            <p className="mt-3 text-gray-400 text-sm max-w-xl mx-auto">Interactive radar scope rendering threat coordinates, bearing angles, severity vectors, and live detection signals.</p>
          </div>
          <div className="flex justify-center overflow-hidden py-4">
            <ThreatRadar size={450} title="GLOBAL THREAT RADAR" />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="relative z-10 py-16 px-4 md:px-8 lg:px-12 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent">
        <div className="max-w-4xl mx-auto glass-strong rounded-3xl p-8 md:p-12 border border-cyan-500/20 text-center">
          <h2 className="text-3xl font-extrabold text-gradient mb-4">Responsible Disclosure & Support</h2>
          <p className="text-gray-300 text-sm mb-6 max-w-xl mx-auto">
            Security researchers and users can submit vulnerability reports, integration questions, or feedback directly to the THREATLY engineering team.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="mailto:security@threatly.local" className="btn-primary">Report Vulnerability</a>
            <Link href="/scanner" className="btn-secondary">Launch Scanner</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-cyan-500/10 py-10 px-4 md:px-8 lg:px-12 text-center text-sm text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <span className="font-bold text-gray-300">THREATLY</span>
            <span className="text-xs text-cyan-400 font-mono">v2.0</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/" className="hover:text-cyan-300 transition-colors">Home</Link>
            <Link href="/scanner" className="hover:text-cyan-300 transition-colors">Scanner</Link>
            <Link href="/dashboard" className="hover:text-cyan-300 transition-colors">Dashboard</Link>
            <Link href="/login" className="hover:text-cyan-300 transition-colors">Login</Link>
          </div>
          <p>© 2025 THREATLY. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  const colors: Record<string, string> = { cyan: "#00ffff", red: "#d03b3b", emerald: "#0ca30c", amber: "#fab219", purple: "#8b5cf6", pink: "#ec4899" };
  const c = colors[color] || colors.cyan;
  return (
    <div className="relative glass rounded-xl p-5 text-center">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mx-auto mb-3" style={{ background: `${c}20`, border: `1px solid ${c}40` }}>{icon}</div>
      <p className="text-3xl font-extrabold tabular-nums text-white mb-1">{value}</p>
      <p className="text-gray-400 text-xs uppercase tracking-wider">{label}</p>
    </div>
  );
}
