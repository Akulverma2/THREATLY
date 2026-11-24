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
  isSimulated: boolean;
}

interface ThreatRadarProps {
  size?: number;
  realThreats?: ThreatEvent[];
  showSimulated?: boolean;
  className?: string;
  title?: string;
}

const SEVERITY_COLORS = {
  low: "#0ca30c",
  medium: "#fab219",
  high: "#f59e0b",
  critical: "#d03b3b",
};

const SEVERITY_LABELS = {
  low: "LOW",
  medium: "MED",
  high: "HIGH",
  critical: "CRITICAL",
};

const THREAT_TYPES = [
  "Phishing",
  "Malware",
  "Ransomware",
  "DDoS",
  "Data Exfiltration",
  "Brute Force",
  "SQL Injection",
  "XSS",
  "MITM",
  "Zero-Day",
  "Supply Chain",
  "Insider Threat",
];

const THREAT_SOURCES = [
  "Network Monitor",
  "Endpoint Sensor",
  "Email Gateway",
  "Web Proxy",
  "DNS Analytics",
  "Threat Intel Feed",
  "User Report",
  "Honeypot",
  "Sandbox Analysis",
  "Behavioral AI",
];

function generateSimulatedThreats(count: number): ThreatEvent[] {
  const threats: ThreatEvent[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const severityRoll = Math.random();
    let severity: ThreatEvent["severity"];
    if (severityRoll < 0.4) severity = "low";
    else if (severityRoll < 0.7) severity = "medium";
    else if (severityRoll < 0.9) severity = "high";
    else severity = "critical";

    threats.push({
      id: `sim-${i}-${now}`,
      angle: Math.random() * 360,
      distance: 0.15 + Math.random() * 0.8,
      severity,
      type: THREAT_TYPES[Math.floor(Math.random() * THREAT_TYPES.length)],
      source: THREAT_SOURCES[Math.floor(Math.random() * THREAT_SOURCES.length)],
      timestamp: now - Math.random() * 3600000, // Within last hour
      label: `THREAT-${String(i + 1).padStart(3, "0")}`,
      isSimulated: true,
    });
  }

  return threats;
}

export function ThreatRadar({
  size = 400,
  realThreats = [],
  showSimulated = true,
  className = "",
  title = "THREAT RADAR",
}: ThreatRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const sweepAngleRef = useRef(0);
  const [hoveredThreat, setHoveredThreat] = useState<ThreatEvent | null>(null);
  const [simulatedThreats, setSimulatedThreats] = useState<ThreatEvent[]>([]);
  const pulsePhaseRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSimulatedThreats(showSimulated ? generateSimulatedThreats(12) : []);
    }, 0);
    return () => clearTimeout(timer);
  }, [showSimulated]);

  const threats = useMemo(() => {
    return [...realThreats, ...simulatedThreats];
  }, [realThreats, simulatedThreats]);

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

    const ctx = canvas.getContext("2d", { alpha: true })!;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const maxRadius = center - 20;

    function draw() {
      ctx.clearRect(0, 0, size, size);

      // Background gradient
      const bgGradient = ctx.createRadialGradient(center, center, 0, center, center, maxRadius);
      bgGradient.addColorStop(0, "rgba(10, 15, 30, 0.95)");
      bgGradient.addColorStop(0.5, "rgba(10, 20, 40, 0.9)");
      bgGradient.addColorStop(1, "rgba(0, 10, 20, 0.95)");
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
        ctx.setLineDash([8, 8]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Range labels
        ctx.fillStyle = `rgba(0, 255, 255, ${opacity * 2})`;
        ctx.font = `10px 'JetBrains Mono', monospace`;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`${Math.round((i / ringCount) * 100)}%`, center - radius - 8, center);
      }

      // Crosshair lines
      ctx.strokeStyle = "rgba(0, 255, 255, 0.15)";
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
        const outerR = maxRadius + 12;
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

        // Angle labels
        if (angle % 90 === 0) {
          const labelR = outerR + 8;
          const lx = center + Math.cos(rad) * labelR;
          const ly = center + Math.sin(rad) * labelR;
          ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
          ctx.font = `10px 'JetBrains Mono', monospace`;
          ctx.textAlign = angle === 90 || angle === 270 ? "center" : angle === 0 ? "left" : "right";
          ctx.textBaseline = angle === 0 || angle === 180 ? "middle" : angle === 90 ? "bottom" : "top";
          const label = angle === 0 ? "0°" : angle === 90 ? "90°" : angle === 180 ? "180°" : "270°";
          ctx.fillText(label, lx, ly);
        }
      }

      // Sweep line
      if (!prefersReducedMotion) {
        const sweepRad = (sweepAngleRef.current * Math.PI) / 180;
        const sweepLength = maxRadius;

        // Main sweep line
        const sweepGradient = ctx.createLinearGradient(
          center,
          center,
          center + Math.cos(sweepRad) * sweepLength,
          center + Math.sin(sweepRad) * sweepLength
        );
        sweepGradient.addColorStop(0, "rgba(0, 255, 255, 0)");
        sweepGradient.addColorStop(0.5, "rgba(0, 255, 255, 0.6)");
        sweepGradient.addColorStop(1, "rgba(0, 255, 255, 1)");

        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(
          center + Math.cos(sweepRad) * sweepLength,
          center + Math.sin(sweepRad) * sweepLength
        );
        ctx.strokeStyle = sweepGradient;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.stroke();

        // Sweep glow
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Trailing fade
        for (let i = 1; i <= 8; i++) {
          const trailAngle = sweepAngleRef.current - i * 3;
          if (trailAngle < 0) continue;
          const trailRad = (trailAngle * Math.PI) / 180;
          const opacity = 0.15 * (1 - i / 8);

          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.lineTo(
            center + Math.cos(trailRad) * sweepLength,
            center + Math.sin(trailRad) * sweepLength
          );
          ctx.strokeStyle = `rgba(0, 255, 255, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Draw threats
      threats.forEach((threat) => {
        const threatRad = (threat.angle * Math.PI) / 180;
        const threatR = threat.distance * maxRadius;
        const x = center + Math.cos(threatRad) * threatR;
        const y = center + Math.sin(threatRad) * threatR;

        const color = SEVERITY_COLORS[threat.severity];
        const pulse = Math.sin(pulsePhaseRef.current * 3 + threat.angle * 0.1) * 0.3 + 0.7;
        const baseSize = 6 + (["low", "medium", "high", "critical"].indexOf(threat.severity) * 3);
        const size = baseSize * pulse;

        // Check if sweep is near this threat (highlight)
        const angleDiff = Math.abs((sweepAngleRef.current - threat.angle + 180) % 360 - 180);
        const isHighlighted = angleDiff < 10 && !prefersReducedMotion;
        const highlightIntensity = isHighlighted ? 1 - angleDiff / 10 : 0;

        // Threat dot with pulse
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);

        // Outer glow
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
        glowGradient.addColorStop(0, `${color}${Math.floor(0.6 * 255).toString(16).padStart(2, "0")}`);
        glowGradient.addColorStop(0.5, `${color}${Math.floor(0.2 * 255).toString(16).padStart(2, "0")}`);
        glowGradient.addColorStop(1, `${color}00`);
        ctx.fillStyle = glowGradient;
        ctx.fillRect(x - size * 3, y - size * 3, size * 6, size * 6);

        // Main dot
        ctx.fillStyle = color;
        ctx.fill();

        // Highlight ring when sweep passes
        if (isHighlighted) {
          ctx.beginPath();
          ctx.arc(x, y, size * (1.5 + highlightIntensity), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 255, 255, ${highlightIntensity})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Expanding ring
          ctx.beginPath();
          ctx.arc(x, y, size * (2 + highlightIntensity * 2), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 255, 255, ${highlightIntensity * 0.5})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Severity indicator triangle
        const triSize = size * 0.7;
        ctx.beginPath();
        ctx.moveTo(x, y - triSize);
        ctx.lineTo(x - triSize * 0.866, y + triSize * 0.5);
        ctx.lineTo(x + triSize * 0.866, y + triSize * 0.5);
        ctx.closePath();
        ctx.fillStyle = `rgba(0, 0, 0, 0.8)`;
        ctx.fill();

        // Severity letter
        ctx.fillStyle = color;
        ctx.font = `bold ${triSize * 0.7}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(SEVERITY_LABELS[threat.severity][0], x, y + 1);
      });

      // Center marker
      ctx.beginPath();
      ctx.arc(center, center, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center pulsing ring
      const centerPulse = Math.sin(pulsePhaseRef.current) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(center, center, 10 + centerPulse * 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 * centerPulse})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [size, threats, prefersReducedMotion]);

  // Mouse interaction for hover
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const center = size / 2;
      const maxRadius = center - 20;

      let found: ThreatEvent | null = null;
      let minDist = Infinity;

      threats.forEach((threat) => {
        const threatRad = (threat.angle * Math.PI) / 180;
        const threatR = threat.distance * maxRadius;
        const x = center + Math.cos(threatRad) * threatR;
        const y = center + Math.sin(threatRad) * threatR;

        const dist = Math.hypot(mouseX - x, mouseY - y);
        const baseSize = 6 + (["low", "medium", "high", "critical"].indexOf(threat.severity) * 3);
        if (dist < baseSize * 2 && dist < minDist) {
          minDist = dist;
          found = threat;
        }
      });

      setHoveredThreat(found);
      canvas.style.cursor = found ? "pointer" : "default";
    };

    const handleMouseLeave = () => {
      setHoveredThreat(null);
      canvas.style.cursor = "default";
    };

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
    <div className={`relative ${className}`} style={{ width: size, height: size + 120 }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 text-center mb-4">
        <h3 className="font-mono text-xs text-cyan-400 uppercase tracking-wider">{title}</h3>
        <p className="text-xs text-gray-500">Real-time threat detection scope</p>
      </div>

      <div className="relative" style={{ width: size, height: size }}>
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="block"
          aria-label="Threat radar visualization"
        />
      </div>

      {/* Legend & Stats */}
      <div className="absolute bottom-[-100px] left-0 right-0 flex flex-wrap justify-center gap-4 md:gap-8 px-4">
        {(["critical", "high", "medium", "low"] as const).map((severity) => (
          <div
            key={severity}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: `rgba(${parseInt(SEVERITY_COLORS[severity].slice(1, 3), 16)}, ${parseInt(SEVERITY_COLORS[severity].slice(3, 5), 16)}, ${parseInt(SEVERITY_COLORS[severity].slice(5, 7), 16)}, 0.1)`, border: `1px solid ${SEVERITY_COLORS[severity]}40` }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: SEVERITY_COLORS[severity] }}
            />
            <span className="font-mono text-xs font-bold" style={{ color: SEVERITY_COLORS[severity] }}>
              {SEVERITY_LABELS[severity]}
            </span>
            <span className="font-mono text-xs text-gray-400 tabular-nums">{stats[severity]}</span>
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
            left: hoveredThreat.angle < 180 ? "calc(50% + 100px)" : "calc(50% - 300px)",
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
            <span className="text-white font-mono">{hoveredThreat.type}</span>
            <span>Source:</span>
            <span className="text-white font-mono">{hoveredThreat.source}</span>
            <span>Bearing:</span>
            <span className="text-white font-mono">{hoveredThreat.angle.toFixed(1)}°</span>
            <span>Range:</span>
            <span className="text-white font-mono">{(hoveredThreat.distance * 100).toFixed(0)}%</span>
            <span>Age:</span>
            <span className="text-white font-mono">Recent</span>
            <span>Status:</span>
            <span className="text-white font-mono">{hoveredThreat.isSimulated ? "SIMULATED" : "LIVE"}</span>
          </div>
        </motion.div>
      )}

      {/* Simulated data disclaimer */}
      {showSimulated && (
        <p className="absolute bottom-[-115px] left-1/2 -translate-x-1/2 text-center text-[10px] text-gray-500 font-mono">
          ⚠ Simulated threat data for demonstration — integrate with live threat intel feeds for production
        </p>
      )}
    </div>
  );
}