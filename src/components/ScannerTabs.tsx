"use client";

import { useState, useRef, useCallback } from "react";
import { VoiceAssistant } from "@/components/VoiceAssistant";

export interface ScanResult {
  scanId?: string;
  riskScore: number;
  verdict?: string;
  classification: "SAFE" | "SUSPICIOUS" | "MALICIOUS";
  threatCategory?: string | null;
  confidence: number;
  confidenceLevel?: string;
  reasons: string[];
  indicators?: { name: string; severity: string; description: string }[];
  checksPerformed?: string[];
  checksUnavailable?: string[];
  extractedUrls?: string[];
  recommendedAction: string;
  // intel fields (may be present for URL scans)
  domainAge?: string | null;
  domainReputation?: string | null;
  redirectChain?: string[];
  suspiciousIndicators?: string[];
}

// ─── Risk Score Gauge ────────────────────────────────────────────────────────
function RiskGauge({ score, classification }: { score: number; classification: string }) {
  const color =
    classification === "SAFE"
      ? "#10b981"
      : classification === "SUSPICIOUS"
      ? "#f59e0b"
      : "#ef4444";

  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const offset = circ * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="#1f2937" strokeWidth="12" />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tabular-nums" style={{ color }}>{score}</span>
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">/ 100</span>
        </div>
      </div>
      <span
        className="px-3 py-1 rounded-full text-xs font-extrabold tracking-widest uppercase border"
        style={{ color, borderColor: color, background: `${color}18` }}
      >
        {classification}
      </span>
    </div>
  );
}

// ─── Threat Intelligence Panel ────────────────────────────────────────────────
function ThreatIntelPanel({ result }: { result: ScanResult }) {
  const intelItems = [
    {
      label: "Domain Reputation",
      value: result.domainReputation ?? null,
      icon: "🌐",
      fallback: "Not available",
    },
    {
      label: "Domain Age",
      value: result.domainAge ?? null,
      icon: "📅",
      fallback: "Not available",
    },
    {
      label: "Threat Category",
      value: result.threatCategory ?? null,
      icon: "🎯",
      fallback: "None detected",
    },
    {
      label: "Confidence Level",
      value: result.confidenceLevel ?? `${(result.confidence * 100).toFixed(0)}%`,
      icon: "📊",
      fallback: null,
    },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
        <span>🔍</span> Threat Intelligence Panel
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {intelItems.map((item) => (
          <div key={item.label} className="p-3 rounded-xl bg-black/40 border border-white/5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs">{item.icon}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">{item.label}</span>
            </div>
            <span className={`text-sm font-semibold ${item.value ? "text-cyan-300" : "text-gray-600 italic"}`}>
              {item.value ?? item.fallback}
            </span>
          </div>
        ))}
      </div>

      {/* Redirect Chain */}
      {result.redirectChain && result.redirectChain.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <p className="text-[10px] text-amber-400 uppercase tracking-wider font-mono mb-2">Redirect Chain ({result.redirectChain.length} hops)</p>
          <div className="space-y-1">
            {result.redirectChain.map((url, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-mono text-amber-200/80 truncate">
                <span className="text-amber-500 shrink-0">{i + 1}.</span>
                <span className="truncate">{url}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted URLs */}
      {result.extractedUrls && result.extractedUrls.length > 0 && (
        <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
          <p className="text-[10px] text-purple-400 uppercase tracking-wider font-mono mb-2">Extracted URLs</p>
          <div className="space-y-1">
            {result.extractedUrls.map((url, i) => (
              <p key={i} className="text-xs font-mono text-purple-200/80 truncate">{url}</p>
            ))}
          </div>
        </div>
      )}

      {/* Checks Performed / Unavailable */}
      <div className="flex flex-wrap gap-1.5">
        {result.checksPerformed?.map((c) => (
          <span key={c} className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ✓ {c}
          </span>
        ))}
        {result.checksUnavailable?.map((c) => (
          <span key={c} className="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-500/10 text-gray-500 border border-gray-500/20">
            — {c}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Explainable Detection Panel ──────────────────────────────────────────────
function ExplainableDetection({ result }: { result: ScanResult }) {
  const sevColor = (s: string) => {
    if (s === "CRITICAL") return { bg: "bg-red-900/40", text: "text-red-300", border: "border-red-500/40", dot: "#ef4444" };
    if (s === "HIGH") return { bg: "bg-orange-900/40", text: "text-orange-300", border: "border-orange-500/40", dot: "#f97316" };
    if (s === "MEDIUM") return { bg: "bg-amber-900/40", text: "text-amber-300", border: "border-amber-500/40", dot: "#f59e0b" };
    return { bg: "bg-gray-900/40", text: "text-gray-300", border: "border-gray-500/40", dot: "#6b7280" };
  };

  if (!result.indicators?.length && !result.reasons.length) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
        <span>⚡</span> Explainable Detection — Why this verdict?
      </h4>

      {/* Structured indicators */}
      {result.indicators && result.indicators.length > 0 && (
        <div className="space-y-2">
          {result.indicators.map((ind, i) => {
            const c = sevColor(ind.severity);
            return (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${c.bg} ${c.border}`}>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-widest ${c.text} border ${c.border}`}>
                    {ind.severity}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{ind.name}</p>
                  <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{ind.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reason list */}
      {result.reasons.length > 0 && (
        <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Detection Findings</p>
          <ul className="space-y-1.5">
            {result.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-cyan-400 shrink-0 mt-0.5">▸</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
async function exportPDF(result: ScanResult, scanType: string, input: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  let y = 15;

  const addLine = (text: string, size = 10, bold = false, color: [number, number, number] = [220, 220, 220]) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, W - 30);
    doc.text(lines, 15, y);
    y += lines.length * (size * 0.45) + 2;
    if (y > 270) { doc.addPage(); y = 15; }
  };

  const addHRule = () => {
    doc.setDrawColor(0, 180, 180);
    doc.line(15, y, W - 15, y);
    y += 4;
  };

  // Header
  doc.setFillColor(10, 15, 30);
  doc.rect(0, 0, W, 40, "F");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 255, 255);
  doc.text("THREATLY", 15, 18);
  doc.setFontSize(10);
  doc.setTextColor(100, 160, 180);
  doc.text("Security Analysis Report", 15, 26);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 33);
  y = 50;

  // Classification badge
  const clsColor: [number, number, number] =
    result.classification === "SAFE" ? [16, 185, 129] :
    result.classification === "SUSPICIOUS" ? [245, 158, 11] :
    [239, 68, 68];
  addLine("SCAN SUMMARY", 12, true, [0, 220, 220]);
  addHRule();
  addLine(`Classification: ${result.classification}`, 14, true, clsColor);
  addLine(`Risk Score: ${result.riskScore}/100`, 12, true, clsColor);
  addLine(`Confidence: ${(result.confidence * 100).toFixed(0)}%`, 10);
  addLine(`Scan Type: ${scanType}`, 10);
  addLine(`Input: ${input.slice(0, 120)}${input.length > 120 ? "..." : ""}`, 10);
  addLine(`Threat Category: ${result.threatCategory ?? "None"}`, 10);
  y += 4;

  // Recommended Action
  addLine("RECOMMENDED ACTION", 12, true, [0, 220, 220]);
  addHRule();
  addLine(result.recommendedAction, 10, false, [200, 240, 240]);
  y += 4;

  // Explainable Detection
  if (result.indicators?.length) {
    addLine("SECURITY INDICATORS", 12, true, [0, 220, 220]);
    addHRule();
    result.indicators.forEach((ind) => {
      const c: [number, number, number] =
        ind.severity === "CRITICAL" || ind.severity === "HIGH" ? [239, 68, 68] :
        ind.severity === "MEDIUM" ? [245, 158, 11] : [150, 150, 150];
      addLine(`[${ind.severity}] ${ind.name}`, 10, true, c);
      addLine(ind.description, 9, false, [180, 180, 180]);
      y += 1;
    });
    y += 2;
  }

  // Detection Findings
  if (result.reasons.length) {
    addLine("DETECTION FINDINGS", 12, true, [0, 220, 220]);
    addHRule();
    result.reasons.forEach((r) => addLine(`• ${r}`, 9));
    y += 4;
  }

  // Intel
  if (result.domainReputation || result.domainAge) {
    addLine("THREAT INTELLIGENCE", 12, true, [0, 220, 220]);
    addHRule();
    if (result.domainReputation) addLine(`Domain Reputation: ${result.domainReputation}`, 9);
    if (result.domainAge) addLine(`Domain Age: ${result.domainAge}`, 9);
    y += 4;
  }

  // Checks
  if (result.checksPerformed?.length) {
    addLine("CHECKS PERFORMED", 12, true, [0, 220, 220]);
    addHRule();
    addLine(result.checksPerformed.join(", "), 9, false, [100, 220, 150]);
    y += 2;
  }
  if (result.checksUnavailable?.length) {
    addLine("CHECKS UNAVAILABLE", 11, true, [180, 130, 50]);
    addLine(result.checksUnavailable.join(", "), 9, false, [160, 120, 60]);
    y += 2;
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("THREATLY — Unified Cybersecurity Intelligence Platform | threatly-tawny.vercel.app", 15, 285);

  doc.save(`THREATLY_Report_${result.classification}_${Date.now()}.pdf`);
}

// ─── Verdict Badge ────────────────────────────────────────────────────────────
function VerdictBadge({ c, score }: { c: "SAFE" | "SUSPICIOUS" | "MALICIOUS"; score: number }) {
  const cfg = {
    SAFE: { icon: "✓", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-400" },
    SUSPICIOUS: { icon: "⚠", cls: "bg-amber-500/20 text-amber-300 border-amber-400" },
    MALICIOUS: { icon: "✖", cls: "bg-red-500/20 text-red-300 border-red-400" },
  }[c];
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-extrabold border ${cfg.cls}`}>
      {cfg.icon} {c} ({score}/100)
    </span>
  );
}

// ─── Full Result Card ─────────────────────────────────────────────────────────
function ResultCard({ result, scanType, input }: { result: ScanResult; scanType: string; input: string }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportPDF(result, scanType, input);
    } finally {
      setExporting(false);
    }
  }, [result, scanType, input]);

  return (
    <div className="mt-6 rounded-2xl bg-black/70 border border-cyan-400/50 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.1)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-black/40">
        <div>
          <h3 className="text-lg font-bold text-white">Detection Assessment</h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">Unified Threat Engine • {new Date().toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <VerdictBadge c={result.classification} score={result.riskScore} />
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-400/50 text-purple-300 text-xs font-bold hover:bg-purple-500/30 hover:border-purple-400 transition-all disabled:opacity-50"
            title="Export PDF report"
          >
            {exporting ? (
              <>⏳ Exporting...</>
            ) : (
              <>📄 Export PDF</>
            )}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Score + Intel 2-col layout */}
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-start">
          {/* Gauge */}
          <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-black/40 border border-white/5">
            <RiskGauge score={result.riskScore} classification={result.classification} />
            <div className="text-center">
              <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">Confidence</p>
              <p className="text-xl font-extrabold text-cyan-300 tabular-nums">{(result.confidence * 100).toFixed(0)}%</p>
            </div>
            {result.threatCategory && (
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-300 border border-red-500/20 text-center">
                {result.threatCategory}
              </span>
            )}
          </div>

          {/* Intel Panel */}
          <ThreatIntelPanel result={result} />
        </div>

        {/* Explainable Detection */}
        <ExplainableDetection result={result} />

        {/* Recommended Action */}
        <div className="p-4 bg-cyan-950/40 border border-cyan-500/40 rounded-xl flex items-start gap-3">
          <span className="text-2xl shrink-0">🛡️</span>
          <div>
            <strong className="text-white text-sm block mb-1">Recommended Action</strong>
            <span className="text-cyan-200 text-sm leading-relaxed">{result.recommendedAction}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ScannerTabs ─────────────────────────────────────────────────────────
export function ScannerTabs() {
  const [tab, setTab] = useState<"URL" | "QR" | "MESSAGE" | "EMAIL">("URL");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [lastInput, setLastInput] = useState("");

  const [urlInput, setUrlInput] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [emailSender, setEmailSender] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  async function postScan(endpoint: string, payload: unknown, inputLabel: string) {
    setLoading(true);
    setError("");
    setResult(null);
    setLastInput(inputLabel);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Scan request failed. Please check input.");
      else setResult(data);
    } catch {
      setError("Network error while connecting to scan endpoint.");
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch {
      setError("Camera access denied or camera device unavailable.");
      setCameraActive(false);
    }
  }

  function captureCameraFrame() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const b64 = canvas.toDataURL("image/png");
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
    postScan("/api/scan/qr", { imageBase64: b64 }, "QR Camera Capture");
  }

  const tabs = [
    { id: "URL" as const, label: "URL", icon: "🔗" },
    { id: "QR" as const, label: "QR Code", icon: "📷" },
    { id: "MESSAGE" as const, label: "Message", icon: "💬" },
    { id: "EMAIL" as const, label: "Email", icon: "📧" },
  ];

  return (
    <div className="glass rounded-2xl p-6 sm:p-8 w-full max-w-3xl mx-auto border border-cyan-500/30 shadow-[0_0_40px_rgba(0,255,255,0.08)]">
      {/* Tabs */}
      <div className="flex border-b border-cyan-500/20 mb-6 flex-wrap gap-1" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => { setTab(t.id); setResult(null); setError(""); }}
            className={`px-5 py-3 font-bold text-sm rounded-t-lg transition-all ${
              tab === t.id
                ? "bg-cyan-500/20 text-cyan-300 border-b-2 border-cyan-400 shadow-[0_4px_12px_rgba(0,255,255,0.15)]"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* URL Scanner */}
      {tab === "URL" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (urlInput.trim()) postScan("/api/scan/url", { url: urlInput.trim() }, urlInput.trim());
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="url-input" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Target URL or Domain
            </label>
            <input
              id="url-input"
              type="text"
              placeholder="https://example-security-check.com/login"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-sm font-mono transition-all"
            />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-gray-500">Checks: Domain age · Homograph spoofing · Redirect chains · TLD risk · SSL</span>
            <button
              type="submit"
              disabled={loading || !urlInput.trim()}
              className="px-6 py-3 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] transition-all disabled:opacity-50 text-sm"
            >
              {loading ? "Analyzing..." : "Analyze URL"}
            </button>
          </div>
        </form>
      )}

      {/* QR Scanner */}
      {tab === "QR" && (
        <div className="space-y-4">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
            QR Image Upload or Camera
          </label>
          <div className="flex gap-4 flex-wrap">
            <label className="cursor-pointer px-6 py-3 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 transition-all text-sm inline-flex items-center gap-2">
              📁 Upload QR Image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const b64 = evt.target?.result as string;
                    if (b64) postScan("/api/scan/qr", { imageBase64: b64 }, file.name);
                  };
                  reader.readAsDataURL(file);
                }}
                className="hidden"
              />
            </label>
            <button
              onClick={startCamera}
              className="px-6 py-3 rounded-lg bg-purple-500/20 border border-purple-400 text-purple-300 font-bold hover:bg-purple-500/40 transition-all text-sm inline-flex items-center gap-2"
            >
              📷 Scan via Camera
            </button>
          </div>
          {cameraActive && (
            <div className="relative mt-4 border border-cyan-500/50 rounded-xl overflow-hidden bg-black">
              <video ref={videoRef} className="w-full max-h-72 object-cover" />
              <div className="p-3 bg-black/80 flex gap-3">
                <button
                  onClick={captureCameraFrame}
                  className="flex-1 py-2.5 bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-400 rounded-lg hover:bg-emerald-500/50 text-sm"
                >
                  Capture & Analyze
                </button>
                <button
                  onClick={() => {
                    const stream = videoRef.current?.srcObject as MediaStream;
                    stream?.getTracks().forEach((t) => t.stop());
                    setCameraActive(false);
                  }}
                  className="px-4 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message Scanner */}
      {tab === "MESSAGE" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (msgInput.trim()) postScan("/api/scan/message", { text: msgInput.trim() }, msgInput.slice(0, 60));
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="msg-input" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              SMS or Chat Message Content
            </label>
            <textarea
              id="msg-input"
              rows={4}
              placeholder="Paste suspicious SMS, WhatsApp message, or direct message..."
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-sm transition-all resize-y"
            />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-gray-500">Checks: Urgency cues · OTP harvesting · Prize scams · Shortened links</span>
            <button
              type="submit"
              disabled={loading || !msgInput.trim()}
              className="px-6 py-3 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] transition-all disabled:opacity-50 text-sm"
            >
              {loading ? "Analyzing..." : "Analyze Message"}
            </button>
          </div>
        </form>
      )}

      {/* Email Scanner */}
      {tab === "EMAIL" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (emailBody.trim()) postScan("/api/scan/email", { sender: emailSender.trim(), subject: emailSubject.trim(), body: emailBody.trim() }, emailSender || emailSubject || "Email");
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email-sender" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Sender (Optional)</label>
              <input
                id="email-sender"
                type="text"
                placeholder="billing@paypal-support-desk.com"
                value={emailSender}
                onChange={(e) => setEmailSender(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 text-sm"
              />
            </div>
            <div>
              <label htmlFor="email-subject" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Subject (Optional)</label>
              <input
                id="email-subject"
                type="text"
                placeholder="Urgent: Account suspended"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="email-body" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Email Body</label>
            <textarea
              id="email-body"
              rows={4}
              placeholder="Paste email headers and body for forensic evaluation..."
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 text-sm resize-y"
            />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-gray-500">Checks: SPF/DKIM/DMARC · Sender spoofing · BEC · Credential harvesting</span>
            <button
              type="submit"
              disabled={loading || !emailBody.trim()}
              className="px-6 py-3 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] transition-all disabled:opacity-50 text-sm"
            >
              {loading ? "Analyzing..." : "Analyze Email"}
            </button>
          </div>
        </form>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-6 p-4 rounded-xl bg-black/40 border border-cyan-500/30 space-y-2">
          <div className="flex justify-between text-xs font-mono text-cyan-300">
            <span>Executing Heuristic Evaluation Pipeline...</span>
            <span className="animate-pulse">Active</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 p-4 bg-red-950/60 border border-red-500/60 text-red-300 rounded-xl text-sm flex items-start gap-2.5" role="alert">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <ResultCard result={result} scanType={tab} input={lastInput} />
      )}

      {/* Voice Assistant */}
      <div className="mt-4">
        <VoiceAssistant
          lastResult={result ? { classification: result.classification, riskScore: result.riskScore, threatCategory: result.threatCategory ?? null, reasons: result.reasons } : null}
        />
      </div>
    </div>
  );
}
