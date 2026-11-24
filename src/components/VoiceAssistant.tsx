"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceAssistantProps {
  lastResult?: { classification: string; riskScore: number; threatCategory?: string | null; reasons?: string[] } | null;
}

export function VoiceAssistant({ lastResult }: VoiceAssistantProps) {
  const [open, setOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("threatly-voice-muted") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });
  const [transcript, setTranscript] = useState("");
  const [question, setQuestion] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const toggleMute = () => {
    setMuted(m => {
      localStorage.setItem("threatly-voice-muted", String(!m));
      if (!m) window.speechSynthesis?.cancel();
      return !m;
    });
  };

  const speak = (text: string) => {
    if (muted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voices.find(v => v.name === selectedVoice);
    if (v) u.voice = v;
    u.rate = 1.0;
    u.pitch = 1.0;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    setTranscript(text);
    window.speechSynthesis.speak(u);
  };

  const stop = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const announceResult = () => {
    if (!lastResult) return;
    const c = lastResult.classification;
    let text = "";
    if (c === "SAFE") text = "Scan completed. Good news! This URL has been classified as safe by THREATLY's detection engine. No malicious indicators were identified in the available analysis.";
    else if (c === "MALICIOUS") text = `Warning! Threat detected. This item has been classified as malicious with a risk score of ${lastResult.riskScore} out of 100. Do not open it or enter personal information. Please review the threat indicators.`;
    else text = `Attention. This item has been classified as suspicious with a risk score of ${lastResult.riskScore} out of 100. Some indicators require caution. Avoid sharing sensitive information until further verification.`;
    speak(text);
  };

  const answer = (q: string) => {
    const lower = q.toLowerCase();
    let text = "";
    if (lower.includes("phishing")) text = "Phishing is a cyber attack where attackers disguise themselves as trustworthy entities to steal sensitive information like passwords or credit card details.";
    else if (lower.includes("quishing")) text = "Quishing is phishing via QR codes. A malicious QR code redirects you to a fraudulent website designed to steal your data.";
    else if (lower.includes("risk score")) text = "The risk score ranges from 0 to 100. Higher scores indicate greater threat likelihood. Scores above 70 are typically malicious, 40-70 suspicious, and below 40 safe.";
    else if (lower.includes("malicious") && lastResult) text = `This item was classified as malicious because: ${(lastResult.reasons || []).join(". ") || "multiple suspicious indicators were found."}`;
    else if (lower.includes("suspicious") && lastResult) text = `This item was classified as suspicious because: ${(lastResult.reasons || []).join(". ") || "some indicators require caution."}`;
    else if (lower.includes("open") || lower.includes("should i")) text = lastResult?.classification === "SAFE" ? "Based on the analysis, this appears safe to open, but always exercise caution with unknown links." : "I recommend not opening this. It has been flagged as a potential threat.";
    else text = "I can explain scan results, phishing, quishing, risk scores, and whether it's safe to open a link. Try asking about your latest scan.";
    speak(text);
  };

  const startListening = () => {
    interface SpeechRecognitionInstance {
      lang: string;
      interimResults: boolean;
      onresult: ((event: { results: Array<Array<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    }
    type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

    const nav = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SR = nav.SpeechRecognition || nav.webkitSpeechRecognition;
    if (!SR) { setTranscript("Speech recognition not supported in this browser."); return; }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    setListening(true);
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript || "";
      setQuestion(t);
      answer(t);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all hover:scale-110"
        style={{ background: "linear-gradient(135deg, #00ffff 0%, #8b5cf6 100%)", boxShadow: "0 0 30px rgba(0,255,255,0.4)" }}
        aria-label="THREATLY AI Assistant"
      >
        🤖
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] rounded-2xl overflow-hidden"
            style={{ background: "rgba(10,15,30,0.95)", backdropFilter: "blur(30px)", border: "1px solid rgba(0,255,255,0.3)", boxShadow: "0 0 60px -15px rgba(0,255,255,0.3)" }}
          >
            <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${speaking ? "animate-pulse" : ""}`} style={{ background: "linear-gradient(135deg, #00ffff 0%, #8b5cf6 100%)" }}>🤖</div>
                <div>
                  <p className="font-bold text-white">THREATLY AI</p>
                  <p className="text-xs text-cyan-400 font-mono">{speaking ? "Speaking..." : listening ? "Listening..." : "Ready"}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <button onClick={announceResult} disabled={!lastResult} className="flex-1 px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-sm font-bold hover:bg-cyan-500/40 disabled:opacity-40">
                  🔊 Announce Result
                </button>
                <button onClick={toggleMute} className="px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-400 text-purple-300 text-sm font-bold hover:bg-purple-500/40">
                  {muted ? "🔇" : "🔊"}
                </button>
                <button onClick={stop} className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-400 text-red-300 text-sm font-bold hover:bg-red-500/40">
                  ⏹
                </button>
              </div>

              {voices.length > 0 && (
                <select
                  value={selectedVoice}
                  onChange={e => setSelectedVoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-cyan-500/40 text-gray-200 text-sm"
                >
                  <option value="">Default voice</option>
                  {voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                </select>
              )}

              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && question.trim()) { answer(question); setQuestion(""); } }}
                  placeholder="Ask THREATLY AI..."
                  className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-cyan-500/40 text-gray-200 text-sm"
                />
                <button onClick={startListening} className={`px-3 py-2 rounded-lg text-sm font-bold border ${listening ? "bg-red-500/30 border-red-400 text-red-300" : "bg-purple-500/20 border-purple-400 text-purple-300 hover:bg-purple-500/40"}`}>
                  🎤
                </button>
              </div>

              {speaking && (
                <div className="flex items-center justify-center gap-1 h-8">
                  {[6, 24, 14, 28, 12, 22, 18, 30, 16, 26, 10, 20].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, h, 4] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
                      className="w-1 bg-cyan-400 rounded-full"
                    />
                  ))}
                </div>
              )}

              {transcript && (
                <div className="max-h-32 overflow-y-auto p-3 rounded-lg bg-black/40 border border-cyan-500/20 text-sm text-gray-300">
                  {transcript}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}