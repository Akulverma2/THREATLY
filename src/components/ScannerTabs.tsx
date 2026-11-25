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

// ─── High-Contrast Executive Cybersecurity PDF Export ────────────────────────
async function exportPDF(result: ScanResult, scanType: string, input: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 14; // margin
  const contentW = W - M * 2; // 182mm

  // Colors
  const bgDark: [number, number, number] = [10, 15, 28];
  const cardBg: [number, number, number] = [17, 24, 43];
  const cardBorder: [number, number, number] = [30, 48, 77];
  const cyanPrimary: [number, number, number] = [0, 240, 255];
  const textWhite: [number, number, number] = [255, 255, 255];
  const textMuted: [number, number, number] = [203, 213, 225];
  const textSubtle: [number, number, number] = [148, 163, 184];

  const clsColor: [number, number, number] =
    result.classification === "SAFE"
      ? [16, 185, 129] // Emerald green
      : result.classification === "SUSPICIOUS"
      ? [245, 158, 11] // Amber orange
      : [239, 68, 68]; // Crimson red

  const clsBg: [number, number, number] =
    result.classification === "SAFE"
      ? [6, 78, 59]
      : result.classification === "SUSPICIOUS"
      ? [120, 53, 15]
      : [127, 29, 29];

  let currentPage = 1;

  function renderPageTemplate(isFirstPage: boolean) {
    // 1. Full Page Dark Background
    doc.setFillColor(...bgDark);
    doc.rect(0, 0, W, H, "F");

    // 2. Top Header
    if (isFirstPage) {
      // Top Neon Cyan Accent Strip
      doc.setFillColor(...cyanPrimary);
      doc.rect(0, 0, W, 2.5, "F");

      // Header Container
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 2.5, W, 34, "F");
      doc.setDrawColor(...cardBorder);
      doc.setLineWidth(0.4);
      doc.line(0, 36.5, W, 36.5);

      // Logo & Title
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...cyanPrimary);
      doc.text("THREATLY", M, 16);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(147, 197, 253);
      doc.text("UNIFIED CYBERSECURITY THREAT INTELLIGENCE PLATFORM", M, 22);

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textSubtle);
      doc.text("SECURITY ASSESSMENT DOSSIER • AUTONOMOUS HEURISTIC AUDIT", M, 27);

      // Top Right Meta Info
      const reportId = `TL-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textWhite);
      doc.text("CONFIDENTIAL SECURITY REPORT", W - M, 14, { align: "right" });

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textSubtle);
      doc.text(`Report ID: ${reportId}`, W - M, 19, { align: "right" });
      doc.text(`Generated: ${new Date().toLocaleString()}`, W - M, 24, { align: "right" });

      // Security Pill
      doc.setFillColor(23, 37, 84);
      doc.roundedRect(W - M - 40, 27, 40, 5, 1, 1, "F");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(147, 197, 253);
      doc.text("TLP:CLEAR // AUDIT LOG", W - M - 20, 30.5, { align: "center" });
    } else {
      // Sub-page compact header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, W, 14, "F");
      doc.setDrawColor(...cardBorder);
      doc.line(0, 14, W, 14);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...cyanPrimary);
      doc.text("THREATLY — Security Analysis Report (Cont.)", M, 9);
    }

    // 3. Footer on every page
    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.3);
    doc.line(M, 286, W - M, 286);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textSubtle);
    doc.text("THREATLY Security Engine • threatly-tawny.vercel.app", M, 291);
    doc.text(`Page ${currentPage}`, W - M, 291, { align: "right" });
  }

  // Draw Page 1
  renderPageTemplate(true);
  let y = 43;

  function checkPageBreak(requiredHeight: number) {
    if (y + requiredHeight > 275) {
      doc.addPage();
      currentPage++;
      renderPageTemplate(false);
      y = 20;
    }
  }

  // ─── CARD 1: Executive Verdict & Risk Score Summary ───────────────
  const summaryCardHeight = 44;
  checkPageBreak(summaryCardHeight);

  doc.setFillColor(...cardBg);
  doc.setDrawColor(...cardBorder);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, y, contentW, summaryCardHeight, 2.5, 2.5, "FD");

  // Left Column: Verdict Badge & Score Bar
  // Verdict Pill
  doc.setFillColor(...clsBg);
  doc.setDrawColor(...clsColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(M + 6, y + 6, 48, 8, 2, 2, "FD");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textWhite);
  doc.text(result.classification, M + 30, y + 11.5, { align: "center" });

  // Score Numeric
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...clsColor);
  doc.text(`${result.riskScore}`, M + 6, y + 25);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textSubtle);
  doc.text("/ 100 Risk Score", M + 24, y + 25);

  // Score Progress Bar
  const meterW = 76;
  const meterH = 3.5;
  const meterX = M + 6;
  const meterY = y + 28;
  doc.setFillColor(30, 41, 59); // Track
  doc.roundedRect(meterX, meterY, meterW, meterH, 1, 1, "F");

  const fillW = Math.max(2, (Math.min(100, Math.max(0, result.riskScore)) / 100) * meterW);
  doc.setFillColor(...clsColor);
  doc.roundedRect(meterX, meterY, fillW, meterH, 1, 1, "F");

  // Meter Labels
  doc.setFontSize(6);
  doc.setTextColor(...textSubtle);
  doc.text("0 (SAFE)", meterX, meterY + 7);
  doc.text("50", meterX + meterW / 2, meterY + 7, { align: "center" });
  doc.text("100 (MALICIOUS)", meterX + meterW, meterY + 7, { align: "right" });

  // Divider inside summary card
  doc.setDrawColor(25, 38, 64);
  doc.line(M + 92, y + 5, M + 92, y + summaryCardHeight - 5);

  // Right Column: Target & Telemetry Metrics
  const rightX = M + 98;
  const colW = contentW - 104;

  // Scan Target (formatted, wrapped)
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...cyanPrimary);
  doc.text("SCAN TARGET INPUT:", rightX, y + 9);

  doc.setFontSize(8);
  doc.setFont("courier", "normal");
  doc.setTextColor(...textWhite);
  const truncatedInput = input.length > 180 ? input.slice(0, 180) + "..." : input;
  const inputLines = doc.splitTextToSize(truncatedInput, colW);
  doc.text(inputLines.slice(0, 2), rightX, y + 14);

  // Metadata Grid
  const metaY = y + 24;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textSubtle);
  doc.text("SCAN TYPE:", rightX, metaY);
  doc.setTextColor(...textWhite);
  doc.text(scanType, rightX + 22, metaY);

  doc.setTextColor(...textSubtle);
  doc.text("CONFIDENCE:", rightX + 46, metaY);
  doc.setTextColor(...cyanPrimary);
  doc.text(`${(result.confidence * 100).toFixed(0)}%`, rightX + 68, metaY);

  doc.setTextColor(...textSubtle);
  doc.text("THREAT CATEGORY:", rightX, metaY + 6);
  doc.setTextColor(244, 114, 182); // Pink accent
  doc.text(result.threatCategory || "NONE DETECTED", rightX + 30, metaY + 6);

  y += summaryCardHeight + 6;

  // ─── CARD 2: Recommended Mitigation Action ───────────────────────
  const recLines = doc.splitTextToSize(result.recommendedAction, contentW - 14);
  const recCardHeight = 12 + recLines.length * 4.5;
  checkPageBreak(recCardHeight);

  doc.setFillColor(15, 27, 45); // Subtle cyan card tint
  doc.setDrawColor(...cardBorder);
  doc.roundedRect(M, y, contentW, recCardHeight, 2.5, 2.5, "FD");

  // Left accent indicator strip
  doc.setFillColor(...cyanPrimary);
  doc.rect(M, y, 2.5, recCardHeight, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...cyanPrimary);
  doc.text("RECOMMENDED MITIGATION ACTION", M + 7, y + 6);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textWhite);
  doc.text(recLines, M + 7, y + 11.5);

  y += recCardHeight + 6;

  // ─── CARD 3: Explainable Detection (Security Indicators) ──────────
  if (result.indicators && result.indicators.length > 0) {
    checkPageBreak(25);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...cyanPrimary);
    doc.text("SECURITY INDICATORS (EXPLAINABLE DETECTION)", M, y);
    y += 4;

    result.indicators.forEach((ind) => {
      const descLines = doc.splitTextToSize(ind.description, contentW - 32);
      const indHeight = 10 + descLines.length * 4;
      checkPageBreak(indHeight);

      // Indicator item box
      doc.setFillColor(14, 21, 37);
      doc.setDrawColor(...cardBorder);
      doc.roundedRect(M, y, contentW, indHeight, 2, 2, "FD");

      // Severity badge
      const isCritical = ind.severity === "CRITICAL" || ind.severity === "HIGH";
      const isMed = ind.severity === "MEDIUM";
      const sevBg: [number, number, number] = isCritical
        ? [127, 29, 29]
        : isMed
        ? [120, 53, 15]
        : [30, 41, 59];
      const sevColor: [number, number, number] = isCritical
        ? [248, 113, 113]
        : isMed
        ? [251, 191, 36]
        : [148, 163, 184];

      doc.setFillColor(...sevBg);
      doc.roundedRect(M + 3, y + 3, 20, 4.5, 1, 1, "F");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...sevColor);
      doc.text(ind.severity, M + 13, y + 6.2, { align: "center" });

      // Indicator Name
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textWhite);
      doc.text(ind.name, M + 26, y + 6.5);

      // Indicator Description
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textMuted);
      doc.text(descLines, M + 26, y + 11.5);

      y += indHeight + 3;
    });

    y += 3;
  }

  // ─── CARD 4: Detection Findings (Reasons List) ────────────────────
  if (result.reasons && result.reasons.length > 0) {
    checkPageBreak(25);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...cyanPrimary);
    doc.text("DETECTION FINDINGS & EVIDENCE", M, y);
    y += 4;

    const findingsHeight = 8 + result.reasons.length * 5;
    checkPageBreak(findingsHeight);

    doc.setFillColor(...cardBg);
    doc.setDrawColor(...cardBorder);
    doc.roundedRect(M, y, contentW, findingsHeight, 2.5, 2.5, "FD");

    let findingY = y + 6;
    result.reasons.forEach((reason) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...cyanPrimary);
      doc.text(">", M + 5, findingY);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textWhite);
      const rLines = doc.splitTextToSize(reason, contentW - 16);
      doc.text(rLines[0] || reason, M + 9, findingY);
      findingY += 5;
    });

    y += findingsHeight + 6;
  }

  // ─── CARD 5: Threat Intelligence & Checks Performed ───────────────
  const hasIntel =
    result.domainReputation ||
    result.domainAge ||
    (result.checksPerformed && result.checksPerformed.length > 0) ||
    (result.checksUnavailable && result.checksUnavailable.length > 0);

  if (hasIntel) {
    checkPageBreak(28);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...cyanPrimary);
    doc.text("TELEMETRY & CHECKS AUDIT", M, y);
    y += 4;

    doc.setFillColor(...cardBg);
    doc.setDrawColor(...cardBorder);
    doc.roundedRect(M, y, contentW, 22, 2.5, 2.5, "FD");

    // Grid item 1
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textSubtle);
    doc.text("DOMAIN REPUTATION:", M + 6, y + 6);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textWhite);
    doc.text(result.domainReputation || "Evaluation Not Applicable", M + 6, y + 10);

    // Grid item 2
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textSubtle);
    doc.text("DOMAIN AGE:", M + 96, y + 6);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textWhite);
    doc.text(result.domainAge || "Evaluation Not Applicable", M + 96, y + 10);

    // Checks summary line
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(52, 211, 153); // Emerald
    const performedTxt = `Checks Performed: ${result.checksPerformed?.join(", ") || "Heuristic Analysis"}`;
    doc.text(performedTxt.slice(0, 110), M + 6, y + 16);

    if (result.checksUnavailable && result.checksUnavailable.length > 0) {
      doc.setFontSize(6.5);
      doc.setTextColor(251, 191, 36); // Amber
      const unavailTxt = `Checks Unavailable: ${result.checksUnavailable.join(", ")}`;
      doc.text(unavailTxt.slice(0, 110), M + 6, y + 19.5);
    }

    y += 26;
  }

  // Save the professional PDF
  const safeFilename = `THREATLY_Security_Report_${result.classification}_${Date.now()}.pdf`;
  doc.save(safeFilename);
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
