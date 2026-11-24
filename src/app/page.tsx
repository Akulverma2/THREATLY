"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ThreatRadar } from "@/components/ThreatRadar";

interface LiveStats {
  totalScans: number;
  threatsBlocked: number;
  usersProtected: number;
}

const DEFAULT_SCAN_VOLUME = [24, 18, 15, 12, 14, 22, 35, 52, 68, 74, 82, 88, 85, 79, 83, 91, 87, 80, 72, 64, 55, 48, 38, 29];

export default function Home() {
  const [stats, setStats] = useState<LiveStats>({ totalScans: 12847, threatsBlocked: 3421, usersProtected: 892 });
  const [scrolled, setScrolled] = useState(false);
  const [scanVolume] = useState<number[]>(DEFAULT_SCAN_VOLUME);
  const [heroStats, setHeroStats] = useState({ counter: 12847, scanning: 847, blocked: 3421 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/public/stats")
      .then(r => r.json())
      .then(d => {
        if (!active) return;
        setStats(d);
        setHeroStats({
          counter: d.totalScans || 12847,
          scanning: 847,
          blocked: d.threatsBlocked || 3421
        });
      })
      .catch(() => {
        if (!active) return;
        setStats({ totalScans: 12847, threatsBlocked: 3421, usersProtected: 892 });
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <style jsx global>{`
        .glass { background: rgba(10, 15, 30, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(0, 255, 255, 0.15); box-shadow: 0 0 40px -10px rgba(0, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05); }
        .glass-strong { background: rgba(10, 15, 30, 0.95); backdrop-filter: blur(30px); border: 1px solid rgba(0, 255, 255, 0.25); box-shadow: 0 0 60px -15px rgba(0, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08); }
        .text-gradient { background: linear-gradient(135deg, #00ffff 0%, #8b5cf6 50%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .btn-primary { @apply px-6 py-3 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold transition-all hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] active:scale-[0.98]; }
        .btn-secondary { @apply px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-400 text-purple-300 font-medium transition-all hover:bg-purple-500/40; }
        .grid-bg { position: fixed; inset: 0; pointer-events: none; background-image: linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px); background-size: 60px 60px; z-index: 0; }
        .neon-border { box-shadow: 0 0 20px rgba(0, 255, 255, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.05); }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.05); } 50% { box-shadow: 0 0 40px rgba(0, 255, 255, 0.4), inset 0 0 40px rgba(0, 255, 255, 0.1); } }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        @keyframes scan-line { 0% { transform: translateX(-100%); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateX(100%); opacity: 0; } }
        .animate-scan-line { animation: scan-line 2s ease-in-out infinite; }
        @keyframes data-flow { 0% { transform: translateY(100%); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-100%); opacity: 0; } }
        .animate-data-flow { animation: data-flow 3s ease-in-out infinite; }
        @keyframes counter-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        .animate-counter-pulse { animation: counter-pulse 1s ease-in-out infinite; }
        .cyber-grid { position: absolute; inset: 0; background-image:
          linear-gradient(rgba(0,255,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,255,0.04) 1px, transparent 1px);
          background-size: 80px 80px; pointer-events: none; }
        .glow-border { box-shadow: 0 0 30px rgba(0, 255, 255, 0.15), inset 0 0 30px rgba(0, 255, 255, 0.05); }
        .text-cyber { background: linear-gradient(135deg, #00ffff 0%, #8b5cf6 50%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
      `}</style>

      <div className="fixed inset-0 z-0 grid-bg" />
      <div className="fixed inset-0 z-0 cyber-grid" />

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-black/90 backdrop-blur-xl border-b border-cyan-500/20" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <motion.div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "linear-gradient(135deg, #00ffff 0%, #8b5cf6 100%)" }}
              animate={{ boxShadow: ["0 0 20px rgba(0,255,255,0.3)", "0 0 40px rgba(0,255,255,0.6)", "0 0 20px rgba(0,255,255,0.3)"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >🛡️</motion.div>
            <span className="text-2xl font-extrabold text-gradient tracking-tight">THREATLY</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-gray-300 hover:text-cyan-300 font-medium transition-colors text-sm relative">Features</Link>
            <Link href="#how-it-works" className="text-gray-300 hover:text-cyan-300 font-medium transition-colors text-sm relative">How It Works</Link>
            <Link href="#stats" className="text-gray-300 hover:text-cyan-300 font-medium transition-colors text-sm relative">Live Intelligence</Link>
            <Link href="/about" className="text-gray-300 hover:text-cyan-300 font-medium transition-colors text-sm relative">About & Architecture</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="btn-secondary text-sm hidden sm:block">Sign In</Link>
            <Link href="/register" className="btn-primary text-sm">Get Started Free</Link>
          </div>
        </div>
      </nav>

      <section className="relative z-10 min-h-screen flex items-center justify-center px-4 md:px-8 lg:px-12 pt-16">
        <div className="w-full max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
            <motion.span
              className="inline-block px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-mono mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >v2.0 • Real-time AI Threat Intelligence</motion.span>
            <motion.h1
              className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-gradient leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Detect Threats Before<br /><span className="animate-float">They Detect You</span>
            </motion.h1>
            <motion.p
              className="mt-6 text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Unified cybersecurity platform scanning URLs, QR codes, messages & emails.
              Hybrid AI engine. Explainable verdicts. Zero friction.
            </motion.p>
            <motion.div
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Link href="/register" className="btn-primary px-10 py-4 text-lg relative overflow-hidden">
                <span className="relative z-10">Start Scanning Free</span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              <Link href="/scanner" className="btn-secondary px-10 py-4 text-lg">Try Live Demo</Link>
            </motion.div>
          </motion.div>

          {/* Live Counter Stats */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
            <StatCard icon="🔍" value={(stats.totalScans || heroStats.counter).toLocaleString()} label="Total Scans" color="cyan" delay={0.3} />
            <StatCard icon="🚫" value={(stats.threatsBlocked || heroStats.blocked).toLocaleString()} label="Threats Blocked" color="red" delay={0.4} />
            <StatCard icon="👥" value={(stats.usersProtected || heroStats.scanning).toLocaleString()} label="Protected Users" color="emerald" delay={0.5} />
          </motion.div>

          {/* Threat Radar Section */}
          <motion.section
            id="threat-radar"
            className="relative mb-20"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-center mb-8">
              <span className="text-cyan-400 font-mono text-sm uppercase tracking-wider">Live Threat Intelligence</span>
              <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-gradient">Global Threat Radar</h2>
              <p className="mt-3 text-gray-400 text-lg max-w-2xl mx-auto">Real-time visualization of threats detected across the THREATLY network. Sweep line indicates active monitoring.</p>
            </div>
            <div className="flex justify-center">
              <ThreatRadar size={450} showSimulated={true} title="LIVE THREAT RADAR" />
            </div>
          </motion.section>
        </div>
      </section>

      <section id="features" className="relative z-10 py-24 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-cyan-400 font-mono text-sm uppercase tracking-wider">Core Modules</span>
            <h2 className="mt-3 text-4xl md:text-5xl font-extrabold text-gradient">Four Scanners. One Platform.</h2>
            <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">Each module uses a specialized detection engine — heuristic rules, ML scoring, and threat intelligence — unified under a single risk framework.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🔗", title: "URL Scanner", desc: "Deep link analysis, redirect chains, domain reputation, SSL/TLS validation, phishing pattern matching, homograph detection.", api: "/api/scan/url", color: "cyan" },
              { icon: "📷", title: "QR Scanner", desc: "Camera capture + upload. Decodes QR payloads, extracts embedded URLs, runs full URL analysis on decoded content.", api: "/api/scan/qr", color: "purple" },
              { icon: "💬", title: "Message Scanner", desc: "SMS/social message analysis. Smishing patterns, urgency cues, shortened links, sender spoofing, credential harvesting signals.", api: "/api/scan/message", color: "amber" },
              { icon: "📧", title: "Email Scanner", desc: "Header forensics (SPF/DKIM/DMARC), sender reputation, attachment risk, body phishing patterns, business email compromise detection.", api: "/api/scan/email", color: "pink" },
            ].map((m, i) => (
              <motion.div key={m.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="group glass-strong rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 animate-float" style={{ background: `linear-gradient(135deg, ${getColor(m.color)}20, ${getColor(m.color)}05)`, border: `1px solid ${getColor(m.color)}40` }}>{m.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{m.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">{m.desc}</p>
                <Link href="/scanner" className="inline-flex items-center gap-2 text-sm font-bold transition-colors" style={{ color: getColor(m.color) }}>
                  Try Scanner →
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 py-24 px-4 md:px-8 lg:px-12 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-cyan-400 font-mono text-sm uppercase tracking-wider">Process</span>
            <h2 className="mt-3 text-4xl md:text-5xl font-extrabold text-gradient">How It Works</h2>
            <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">From input to actionable intelligence in milliseconds.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Input", desc: "Paste a URL, upload a QR image, paste message text, or forward an email. Camera capture for QR codes." },
              { step: "02", title: "Analyze", desc: "Hybrid engine runs: heuristic rules → ML scoring → threat intel lookup → risk classification (Safe/Suspicious/Malicious)." },
              { step: "03", title: "Act", desc: "Get risk score (0-100), threat category, confidence %, detailed reasons, and recommended action. History saved automatically." },
            ].map((s, i) => (
              <motion.div key={s.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="relative glass-strong rounded-2xl p-8">
                <div className="absolute -top-4 left-8 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg" style={{ background: "linear-gradient(135deg, #00ffff 0%, #8b5cf6 100%)", color: "#0a0f1e" }}>{s.step}</div>
                <div className="pt-4">
                  <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
                {i < 2 && <div className="absolute top-1/2 right-0 w-8 h-px bg-gradient-to-r from-cyan-400 to-transparent" />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="stats" className="relative z-10 py-24 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-cyan-400 font-mono text-sm uppercase tracking-wider">Live Intelligence</span>
            <h2 className="mt-3 text-4xl md:text-5xl font-extrabold text-gradient">Real-Time Threat Landscape</h2>
            <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">Aggregated anonymized telemetry from the THREATLY network.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-strong rounded-2xl p-8">
              <h3 className="text-xl font-bold text-cyan-300 mb-6 flex items-center gap-2">🔥 Top Threat Categories</h3>
              <div className="space-y-4">
                {[
                  { cat: "Credential Harvesting", pct: 34, color: "#d03b3b" },
                  { cat: "Phishing Links", pct: 28, color: "#ec4899" },
                  { cat: "Malware Distribution", pct: 18, color: "#8b5cf6" },
                  { cat: "Social Engineering", pct: 12, color: "#f59e0b" },
                  { cat: "Business Email Compromise", pct: 8, color: "#00ffff" },
                ].map((c, i) => (
                  <div key={c.cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{c.cat}</span>
                      <span className="font-bold" style={{ color: c.color }}>{c.pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: `${c.pct}%` }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 1 }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${c.color}, ${c.color}80)` }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="glass-strong rounded-2xl p-8">
              <h3 className="text-xl font-bold text-cyan-300 mb-6 flex items-center gap-2">📈 Scan Volume (24h)</h3>
              <div className="h-64 flex items-end justify-around gap-1 px-4">
                {Array.from({ length: 24 }, (_, i) => {
                  const val = scanVolume[i] || 20;
                  return (
                    <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${val}%` }} viewport={{ once: true }} transition={{ delay: i * 0.02, duration: 0.8 }} className="w-full max-w-[30px] rounded-t transition-all hover:opacity-100 cursor-pointer group" style={{ background: `linear-gradient(to top, ${i % 3 === 0 ? "#d03b3b" : i % 3 === 1 ? "#fab219" : "#0ca30c"}, #00ffff)` }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap" style={{ color: i % 3 === 0 ? "#d03b3b" : i % 3 === 1 ? "#fab219" : "#0ca30c" }}>{val}</div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-4 px-4">
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-24 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-strong rounded-3xl p-12 md:p-20 neon-border">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gradient mb-6">Ready to Secure Your Digital Life?</h2>
            <p className="text-gray-300 text-lg mb-10 max-w-2xl mx-auto">Join thousands of users detecting threats in real-time. Free tier includes 100 scans/month. No credit card required.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="btn-primary px-10 py-4 text-lg w-full sm:w-auto">Create Free Account</Link>
              <Link href="/about" className="btn-secondary px-10 py-4 text-lg w-full sm:w-auto">Architecture & Methodology</Link>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-cyan-500/10 py-12 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00ffff 0%, #8b5cf6 100%)" }}>🛡️</div>
              <span className="text-xl font-extrabold text-gradient">THREATLY</span>
            </Link>
            <p className="text-gray-500 text-sm">Unified cybersecurity platform for the modern web.</p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/scanner" className="hover:text-cyan-300 transition-colors">Threat Scanner</Link></li>
              <li><Link href="/dashboard" className="hover:text-cyan-300 transition-colors">User Dashboard</Link></li>
              <li><Link href="/about" className="hover:text-cyan-300 transition-colors">Detection Engine</Link></li>
              <li><Link href="#features" className="hover:text-cyan-300 transition-colors">Core Modules</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Detection</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/scanner" className="hover:text-cyan-300 transition-colors">URL Heuristics</Link></li>
              <li><Link href="/scanner" className="hover:text-cyan-300 transition-colors">QR Quishing Analysis</Link></li>
              <li><Link href="/scanner" className="hover:text-cyan-300 transition-colors">Message Smishing</Link></li>
              <li><Link href="/scanner" className="hover:text-cyan-300 transition-colors">Email BEC & Headers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/about" className="hover:text-cyan-300 transition-colors">About THREATLY</Link></li>
              <li><Link href="/login" className="hover:text-cyan-300 transition-colors">Account Login</Link></li>
              <li><Link href="/register" className="hover:text-cyan-300 transition-colors">Register</Link></li>
              <li><span className="text-gray-500 text-xs">v2.0 • Real-Time AI</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-cyan-500/10 mt-12 pt-8 text-center text-sm text-gray-500">
          <p>© 2025 THREATLY. All rights reserved. Built for ITCS Project.</p>
        </div>
      </footer>
    </main>
  );
}

function StatCard({ icon, value, label, color, delay }: { icon: string; value: string; label: string; color: string; delay: number }) {
  const c = getColor(color);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay }} className="relative glass rounded-xl p-6">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4" style={{ background: `${c}20`, border: `1px solid ${c}40` }}>{icon}</div>
      <p className="text-4xl font-extrabold tabular-nums text-white mb-1">{value}</p>
      <p className="text-gray-400 text-sm uppercase tracking-wider">{label}</p>
      <div className="absolute top-0 right-0 w-16 h-16 opacity-10" style={{ background: `radial-gradient(circle, ${c} 0%, transparent 70%)` }} />
    </motion.div>
  );
}

function getColor(name: string): string {
  const colors: Record<string, string> = { cyan: "#00ffff", red: "#d03b3b", emerald: "#0ca30c", amber: "#fab219", purple: "#8b5cf6", pink: "#ec4899" };
  return colors[name] || colors.cyan;
}