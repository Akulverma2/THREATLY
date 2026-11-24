"use client";

import { useState, useRef } from "react";
import { VoiceAssistant } from "@/components/VoiceAssistant";

interface Result {
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
}

export function ScannerTabs() {
  const [tab, setTab] = useState<"URL" | "QR" | "MESSAGE" | "EMAIL">("URL");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const [urlInput, setUrlInput] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [emailSender, setEmailSender] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  async function postScan(endpoint: string, payload: unknown) {
    setLoading(true);
    setError("");
    setResult(null);
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
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
    postScan("/api/scan/qr", { imageBase64: b64 });
  }

  function getVerdictBadge(c: "SAFE" | "SUSPICIOUS" | "MALICIOUS", score: number) {
    if (c === "SAFE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400">
          <span>✓</span>
          <span>SAFE ({score}/100)</span>
        </span>
      );
    }
    if (c === "SUSPICIOUS") {
      return (
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400">
          <span>⚠</span>
          <span>SUSPICIOUS ({score}/100)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-extrabold bg-red-500/20 text-red-300 border border-red-400">
        <span>✖</span>
        <span>MALICIOUS ({score}/100)</span>
      </span>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 sm:p-8 w-full max-w-3xl mx-auto border border-cyan-500/30 shadow-[0_0_40px_rgba(0,255,255,0.08)]">
      {/* Scanner Mode Tabs */}
      <div className="flex border-b border-cyan-500/20 mb-6 flex-wrap gap-2" role="tablist" aria-label="Scanner categories">
        {(["URL", "QR", "MESSAGE", "EMAIL"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => { setTab(t); setResult(null); setError(""); }}
            className={`px-5 py-3 font-bold text-sm rounded-t-lg transition-all ${
              tab === t
                ? "bg-cyan-500/20 text-cyan-300 border-b-2 border-cyan-400 shadow-[0_4px_12px_rgba(0,255,255,0.15)]"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
            }`}
          >
            {t === "URL" && "🔗 URL"}
            {t === "QR" && "📷 QR Code"}
            {t === "MESSAGE" && "💬 Message"}
            {t === "EMAIL" && "📧 Email"}
          </button>
        ))}
      </div>

      {/* URL Scanner */}
      {tab === "URL" && (
        <form onSubmit={(e) => { e.preventDefault(); if (urlInput.trim()) postScan("/api/scan/url", { url: urlInput.trim() }); }} className="space-y-4">
          <div>
            <label htmlFor="url-scan-input" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Target URL or Domain
            </label>
            <input
              id="url-scan-input"
              type="text"
              placeholder="https://example-security-check.com/login"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-sm font-mono transition-all"
            />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-gray-500">
              Heuristic checks: Domain age, homograph spoofing, IP routing, redirect chain, TLD risk
            </span>
            <button
              type="submit"
              disabled={loading || !urlInput.trim()}
              className="px-6 py-3 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? "Analyzing URL..." : "Analyze URL"}
            </button>
          </div>
        </form>
      )}

      {/* QR Scanner */}
      {tab === "QR" && (
        <div className="space-y-4">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
            QR Image Upload or Camera Stream
          </label>
          <div className="flex gap-4 flex-wrap">
            <label className="cursor-pointer px-6 py-3 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] transition-all text-sm inline-flex items-center gap-2">
              <span>📁</span>
              <span>Upload QR Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const b64 = evt.target?.result as string;
                    if (b64) postScan("/api/scan/qr", { imageBase64: b64 });
                  };
                  reader.readAsDataURL(file);
                }}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={startCamera}
              className="px-6 py-3 rounded-lg bg-purple-500/20 border border-purple-400 text-purple-300 font-bold hover:bg-purple-500/40 transition-all text-sm inline-flex items-center gap-2"
            >
              <span>📷</span>
              <span>Scan via Camera</span>
            </button>
          </div>
          {cameraActive && (
            <div className="relative mt-4 border border-cyan-500/50 rounded-xl overflow-hidden bg-black">
              <video ref={videoRef} className="w-full max-h-72 object-cover" />
              <div className="p-3 bg-black/80 flex gap-3">
                <button
                  type="button"
                  onClick={captureCameraFrame}
                  className="flex-1 py-2.5 bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-400 rounded-lg hover:bg-emerald-500/50 transition-colors text-sm"
                >
                  Capture Frame & Analyze
                </button>
                <button
                  type="button"
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
        <form onSubmit={(e) => { e.preventDefault(); if (msgInput.trim()) postScan("/api/scan/message", { text: msgInput.trim() }); }} className="space-y-4">
          <div>
            <label htmlFor="msg-scan-input" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              SMS or Chat Message Content
            </label>
            <textarea
              id="msg-scan-input"
              rows={4}
              placeholder="Paste suspicious SMS, WhatsApp message, or direct message..."
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-sm transition-all resize-y"
            />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-gray-500">
              Evaluates urgency cues, OTP requests, prize claims, and embedded shortened links
            </span>
            <button
              type="submit"
              disabled={loading || !msgInput.trim()}
              className="px-6 py-3 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? "Analyzing Message..." : "Analyze Message"}
            </button>
          </div>
        </form>
      )}

      {/* Email Scanner */}
      {tab === "EMAIL" && (
        <form onSubmit={(e) => { e.preventDefault(); if (emailBody.trim()) postScan("/api/scan/email", { sender: emailSender.trim(), subject: emailSubject.trim(), body: emailBody.trim() }); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email-sender-input" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Sender Address (Optional)
              </label>
              <input
                id="email-sender-input"
                type="text"
                placeholder="billing@paypal-support-desk.com"
                value={emailSender}
                onChange={(e) => setEmailSender(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-sm transition-all"
              />
            </div>
            <div>
              <label htmlFor="email-subject-input" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Subject Line (Optional)
              </label>
              <input
                id="email-subject-input"
                type="text"
                placeholder="Urgent: Your account has been suspended"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-sm transition-all"
              />
            </div>
          </div>
          <div>
            <label htmlFor="email-body-input" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Email Body Content
            </label>
            <textarea
              id="email-body-input"
              rows={4}
              placeholder="Paste email headers and body text for forensic evaluation..."
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-black/50 border border-cyan-500/40 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-sm transition-all resize-y"
            />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-gray-500">
              Checks SPF/DKIM/DMARC alignment, sender spoofing, and credential harvesting
            </span>
            <button
              type="submit"
              disabled={loading || !emailBody.trim()}
              className="px-6 py-3 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,255,255,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? "Analyzing Email..." : "Analyze Email"}
            </button>
          </div>
        </form>
      )}

      {/* Loading Progress Bar */}
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

      {/* Error Message */}
      {error && (
        <div className="mt-6 p-4 bg-red-950/60 border border-red-500/60 text-red-300 rounded-xl text-sm flex items-start gap-2.5" role="alert">
          <span className="text-base leading-none mt-0.5">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Detailed Result Card */}
      {result && (
        <div className="mt-6 p-6 rounded-xl bg-black/70 border border-cyan-400/50 space-y-5 shadow-[0_0_30px_rgba(0,255,255,0.1)]">
          <div className="flex justify-between items-center flex-wrap gap-3 pb-3 border-b border-cyan-500/20">
            <div>
              <h3 className="text-lg font-bold text-white">Detection Assessment</h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">Unified Threat Engine Verdict</p>
            </div>
            {getVerdictBadge(result.classification, result.riskScore)}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-white/5 p-3.5 rounded-lg border border-white/5">
            <div>
              <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Threat Category</span>
              <span className="text-white font-mono font-medium">{result.threatCategory || "None Detected"}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Confidence Rating</span>
              <span className="text-cyan-300 font-mono font-medium">{(result.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          {result.indicators && result.indicators.length > 0 && (
            <div>
              <span className="text-gray-300 text-xs font-semibold uppercase tracking-wider block mb-2">Security Indicators</span>
              <ul className="space-y-2">
                {result.indicators.map((ind, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm p-2 rounded-lg bg-black/40 border border-white/5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider shrink-0 mt-0.5 ${
                      ind.severity === "CRITICAL" || ind.severity === "HIGH"
                        ? "bg-red-500/30 text-red-300 border border-red-500/40"
                        : ind.severity === "MEDIUM"
                        ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                        : "bg-gray-500/30 text-gray-300 border border-gray-500/40"
                    }`}>
                      {ind.severity}
                    </span>
                    <span className="text-gray-200">
                      <strong className="text-white">{ind.name}:</strong> {ind.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <span className="text-gray-300 text-xs font-semibold uppercase tracking-wider block mb-2">Detection Findings</span>
            <ul className="space-y-1.5 text-sm text-gray-300">
              {result.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0">▸</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {result.checksPerformed && result.checksPerformed.length > 0 && (
            <div className="text-xs text-gray-400 pt-2 border-t border-cyan-500/10">
              <span className="font-semibold text-gray-300">Checks performed:</span> {result.checksPerformed.join(", ")}
            </div>
          )}

          {result.checksUnavailable && result.checksUnavailable.length > 0 && (
            <div className="text-xs text-amber-400/90">
              <span className="font-semibold">Checks unavailable:</span> {result.checksUnavailable.join(", ")}
            </div>
          )}

          {result.extractedUrls && result.extractedUrls.length > 0 && (
            <div className="text-xs text-cyan-300/80 break-all">
              <span className="font-semibold text-gray-300">Extracted URLs:</span> {result.extractedUrls.join(", ")}
            </div>
          )}

          <div className="p-4 bg-cyan-950/40 border border-cyan-500/40 rounded-lg text-sm text-cyan-200 flex items-start gap-3">
            <span className="text-lg leading-none shrink-0 mt-0.5">🛡️</span>
            <div>
              <strong className="text-white block mb-0.5">Recommended Action:</strong>
              <span>{result.recommendedAction}</span>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Assistant */}
      <div className="mt-4">
        <VoiceAssistant lastResult={result ? { classification: result.classification, riskScore: result.riskScore, threatCategory: result.threatCategory ?? null, reasons: result.reasons } : null} />
      </div>
    </div>
  );
}
