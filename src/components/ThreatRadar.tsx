"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";

export interface ThreatEvent {
  id: string;
  angle: number; // 0-360 degrees
  distance: number; // 0-1 (normalized radius)
  severity: "low" | "medium" | "high" | "critical";
  type: string;
  source: string;
  timestamp: number;
  label: string;
  isSimulated?: boolean;
}

interface ThreatRadarProps {
  size?: number;
  realThreats?: ThreatEvent[];
  className?: string;
  title?: string;
}

const SEVERITY_COLORS = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const SEVERITY_LABELS = {
  low: "LOW",
  medium: "MED",
  high: "HIGH",
  critical: "CRITICAL",
};

export function ThreatRadar({
  size = 400,
  realThreats = [],
  className = "",
  title = "THREAT RADAR",
}: ThreatRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const sweepAngleRef = useRef(0);
  const [hoveredThreat, setHoveredThreat] = useState<ThreatEvent | null>(null);
  const pulsePhaseRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const threats = useMemo(() => realThreats, [realThreats]);

  // Sweep animation
  useEffect(() => {
    if (prefersReducedMotion) return;
    let start: number;

    function animate(timestamp: number) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const speed = 0.025; // degrees per ms = ~14.4 sec per revolution
      sweepAngleRef.current = (elapsed * speed) % 360;
      pulsePhaseRef.current = (elapsed * 0.003) % (Math.PI * 2);
      animationRef.current = requestAnimationFrame(animate);
    }

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [prefersReducedMotion]);

  // Draw radar on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const maxRadius = center - 20;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);

      // Background gradient
      const bgGradient = ctx.createRadialGradient(center, center, 0, center, center, maxRadius);
      bgGradient.addColorStop(0, "rgba(8, 14, 28, 0.95)");
      bgGradient.addColorStop(0.6, "rgba(6, 12, 24, 0.9)");
      bgGradient.addColorStop(1, "rgba(3, 7, 18, 0.98)");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, size, size);

      // Concentric circles (range rings)
      const ringCount = 4;
      for (let i = 1; i <= ringCount; i++) {
        const radius = (maxRadius / ringCount) * i;
        const opacity = 0.08 + (i / ringCount) * 0.12;

        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 255, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Range labels
        ctx.fillStyle = `rgba(0, 255, 255, ${opacity * 1.8})`;
        ctx.font = `9px 'JetBrains Mono', monospace`;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`${Math.round((i / ringCount) * 100)}%`, center - radius - 6, center);
      }

      // Crosshair lines
      ctx.strokeStyle = "rgba(0, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(center, 0);
      ctx.lineTo(center, size);
      ctx.moveTo(0, center);
      ctx.lineTo(size, center);
      ctx.stroke();

      // Diagonal crosshairs
      ctx.beginPath();
      ctx.moveTo(20, 20);
      ctx.lineTo(size - 20, size - 20);
      ctx.moveTo(size - 20, 20);
      ctx.lineTo(20, size - 20);
      ctx.stroke();

      // Angle markers (every 30 degrees)
      for (let angle = 0; angle < 360; angle += 30) {
        const rad = (angle * Math.PI) / 180;
        const innerR = maxRadius;
        const outerR = maxRadius + 10;
        const x1 = center + Math.cos(rad) * innerR;
        const y1 = center + Math.sin(rad) * innerR;
        const x2 = center + Math.cos(rad) * outerR;
        const y2 = center + Math.sin(rad) * outerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = "rgba(0, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cardinal angle labels
        if (angle % 90 === 0) {
          const labelR = outerR + 6;
          const lx = center + Math.cos(rad) * labelR;
          const ly = center + Math.sin(rad) * labelR;
          ctx.fillStyle = "rgba(0, 255, 255, 0.4)";
          ctx.font = `9px 'JetBrains Mono', monospace`;
          ctx.textAlign = angle === 90 || angle === 270 ? "center" : angle === 0 ? "left" : "right";
          ctx.textBaseline = angle === 0 || angle === 180 ? "middle" : angle === 90 ? "bottom" : "top";
          const label = angle === 0 ? "0°" : angle === 90 ? "90°" : angle === 180 ? "180°" : "270°";
          ctx.fillText(label, lx, ly);
        }
      }

      // Sweep line & beam gradient
      if (!prefersReducedMotion) {
        const sweepRad = (sweepAngleRef.current * Math.PI) / 180;
        const sweepX = center + Math.cos(sweepRad) * maxRadius;
        const sweepY = center + Math.sin(sweepRad) * maxRadius;

        // Sweep cone trail
        const trailAngle = 45; // degrees of trail
        const trailRad = (trailAngle * Math.PI) / 180;
        const startRad = sweepRad - trailRad;

        const sweepGradient = ctx.createRadialGradient(center, center, 0, center, center, maxRadius);
        sweepGradient.addColorStop(0, "rgba(0, 255, 255, 0.25)");
        sweepGradient.addColorStop(0.5, "rgba(0, 255, 255, 0.08)");
        sweepGradient.addColorStop(1, "rgba(0, 255, 255, 0)");

        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, maxRadius, startRad, sweepRad);
        ctx.closePath();
        ctx.fillStyle = sweepGradient;
        ctx.fill();

        // Leading sweep line
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(sweepX, sweepY);
        ctx.strokeStyle = "rgba(0, 255, 255, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Center radar ping
      const centerPulse = Math.sin(pulsePhaseRef.current * 2) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(center, center, 3 + centerPulse * 2, 0, Math.PI * 2);
      ctx.fillStyle = "#00ffff";
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw real threat blips
      threats.forEach((threat) => {
        const rad = (threat.angle * Math.PI) / 180;
        const dist = threat.distance * maxRadius;
        const x = center + Math.cos(rad) * dist;
        const y = center + Math.sin(rad) * dist;

        const color = SEVERITY_COLORS[threat.severity];
        const isHovered = hoveredThreat?.id === threat.id;

        // Angle difference from sweep line
        let angleDiff = Math.abs(threat.angle - sweepAngleRef.current);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        // Sweep illumination boost
        const sweepBoost = Math.max(0, 1 - angleDiff / 45);
        const baseOpacity = 0.65;
        const opacity = Math.min(1, baseOpacity + sweepBoost * 0.35);

        // Outer pulse ring
        const pulse = Math.sin(pulsePhaseRef.current + threat.timestamp) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(x, y, (isHovered ? 12 : 7) + pulse * 4, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}${Math.floor(opacity * 0.4 * 255).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner solid dot
        ctx.beginPath();
        ctx.arc(x, y, isHovered ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isHovered ? 15 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Threat label on hover
        if (isHovered) {
          ctx.font = "bold 10px 'JetBrains Mono', monospace";
          ctx.fillStyle = "#ffffff";
          ctx.fillText(threat.label, x + 8, y - 8);
        }
      });
    }

    let frameId: number;
    function renderLoop() {
      draw();
      frameId = requestAnimationFrame(renderLoop);
    }
    renderLoop();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [threats, size, prefersReducedMotion, hoveredThreat]);

  // Handle mouse hover over blips
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const center = size / 2;
    const maxRadius = center - 20;

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let found: ThreatEvent | null = null;
      for (const threat of threats) {
        const rad = (threat.angle * Math.PI) / 180;
        const dist = threat.distance * maxRadius;
        const x = center + Math.cos(rad) * dist;
        const y = center + Math.sin(rad) * dist;

        const dx = mouseX - x;
        const dy = mouseY - y;
        if (Math.sqrt(dx * dx + dy * dy) < 14) {
          found = threat;
          break;
        }
      }
      setHoveredThreat(found);
    }

    function handleMouseLeave() {
      setHoveredThreat(null);
    }

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [threats, size]);

  // Stats calculation
  const stats = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    threats.forEach((t) => counts[t.severity]++);
    return counts;
  }, [threats]);

  return (
    <div className={`flex flex-col items-center ${className}`} style={{ width: size, maxWidth: "100%" }}>
      {/* Scope Header */}
      <div className="text-center mb-3">
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-widest">{title}</h3>
        </div>
        <p className="text-[11px] text-gray-400 font-mono mt-0.5">Real-time threat detection telemetry</p>
      </div>

      {/* Radar Canvas with border */}
      <div
        className="relative rounded-2xl overflow-hidden p-1 border border-cyan-500/20 bg-black/60 shadow-[0_0_30px_rgba(0,255,255,0.06)]"
        style={{ width: size, height: size }}
      >
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="block w-full h-full cursor-crosshair"
          aria-label="Threat radar visualization"
        />

        {threats.length === 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
              STATUS: ALL CLEAR • 0 ACTIVE THREATS
            </span>
          </div>
        )}
      </div>

      {/* Natural Flow Legend & Counts (No negative absolute positioning) */}
      <div className="mt-4 flex flex-wrap justify-center gap-2.5 w-full">
        {(["critical", "high", "medium", "low"] as const).map((severity) => (
          <div
            key={severity}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
            style={{
              background: `rgba(${parseInt(SEVERITY_COLORS[severity].slice(1, 3), 16)}, ${parseInt(SEVERITY_COLORS[severity].slice(3, 5), 16)}, ${parseInt(SEVERITY_COLORS[severity].slice(5, 7), 16)}, 0.08)`,
              borderColor: `${SEVERITY_COLORS[severity]}30`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: SEVERITY_COLORS[severity] }}
            />
            <span className="font-mono text-[11px] font-bold" style={{ color: SEVERITY_COLORS[severity] }}>
              {SEVERITY_LABELS[severity]}
            </span>
            <span className="font-mono text-[11px] text-gray-300 font-bold tabular-nums">
              {stats[severity]}
            </span>
          </div>
        ))}
      </div>

      {/* Hover tooltip */}
      {hoveredThreat && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed z-50 pointer-events-none px-4 py-3 rounded-lg text-xs"
          style={{
            background: "rgba(10, 15, 30, 0.98)",
            backdropFilter: "blur(20px)",
            border: `1px solid ${SEVERITY_COLORS[hoveredThreat.severity]}60`,
            boxShadow: `0 0 30px ${SEVERITY_COLORS[hoveredThreat.severity]}40`,
            left: hoveredThreat.angle < 180 ? "calc(50% + 80px)" : "calc(50% - 280px)",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: SEVERITY_COLORS[hoveredThreat.severity] }}
            />
            <span className="font-bold text-white">{hoveredThreat.label}</span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
              style={{ background: SEVERITY_COLORS[hoveredThreat.severity], color: "#000" }}
            >
              {SEVERITY_LABELS[hoveredThreat.severity]}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-gray-400">
            <span>Type:</span>
            <span className="text-white font-mono">{threats.find(t => t.id === hoveredThreat.id)?.type}</span>
            <span>Source:</span>
            <span className="text-white font-mono">{threats.find(t => t.id === hoveredThreat.id)?.source}</span>
            <span>Bearing:</span>
            <span className="text-white font-mono">{hoveredThreat.angle.toFixed(1)}°</span>
            <span>Range:</span>
            <span className="text-white font-mono">{(hoveredThreat.distance * 100).toFixed(0)}%</span>
            <span>Status:</span>
            <span className="text-emerald-400 font-mono font-bold">DETECTED</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
