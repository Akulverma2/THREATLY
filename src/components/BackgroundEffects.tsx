"use client";

import { useEffect, useRef, useState } from "react";

interface BackgroundEffectsProps {
  intensity?: "low" | "medium" | "high";
  showMatrixRain?: boolean;
  showBinaryParticles?: boolean;
  showParticles?: boolean;
  showNetworkGrid?: boolean;
  showLightning?: boolean;
  showDataStreams?: boolean;
  showRadialGlow?: boolean;
  className?: string;
}

export function BackgroundEffects({
  intensity = "medium",
  showMatrixRain = true,
  showBinaryParticles = true,
  showParticles = true,
  showNetworkGrid = true,
  showLightning = false,
  showDataStreams = true,
  showRadialGlow = true,
  className = "",
}: BackgroundEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const cursorPosRef = useRef({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 1920, height: 1080 });

  // Matrix rain characters
  const matrixChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&*アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
  const binaryChars = "01";
  const hexChars = "0123456789ABCDEF";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      cursorPosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true })!;
    if (!ctx) return;

    canvas.width = windowSize.width;
    canvas.height = windowSize.height;

    // Configuration based on intensity
    const config = {
      low: { particleCount: 30, matrixColumns: 20, binaryCount: 15, networkNodes: 12 },
      medium: { particleCount: 60, matrixColumns: 40, binaryCount: 30, networkNodes: 20 },
      high: { particleCount: 100, matrixColumns: 60, binaryCount: 50, networkNodes: 30 },
    }[intensity];

    // Matrix rain drops
    interface MatrixDrop {
      x: number;
      y: number;
      speed: number;
      chars: string[];
      fontSize: number;
      opacity: number;
    }

    const matrixDrops: MatrixDrop[] = [];
    const columnWidth = 20;
    const columns = Math.min(config.matrixColumns, Math.floor(windowSize.width / columnWidth));

    for (let i = 0; i < columns; i++) {
      const x = i * columnWidth + Math.random() * 10;
      matrixDrops.push({
        x,
        y: Math.random() * -windowSize.height,
        speed: 1 + Math.random() * 3,
        chars: Array.from({ length: 10 + Math.random() * 20 }, () =>
          matrixChars[Math.floor(Math.random() * matrixChars.length)]
        ),
        fontSize: 14 + Math.random() * 6,
        opacity: 0.3 + Math.random() * 0.5,
      });
    }

    // Binary particles
    interface BinaryParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      char: string;
      size: number;
      opacity: number;
      life: number;
      maxLife: number;
    }

    const binaryParticles: BinaryParticle[] = [];
    for (let i = 0; i < config.binaryCount; i++) {
      binaryParticles.push({
        x: Math.random() * windowSize.width,
        y: Math.random() * windowSize.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.2 - Math.random() * 0.5,
        char: binaryChars[Math.floor(Math.random() * 2)],
        size: 10 + Math.random() * 14,
        opacity: 0.1 + Math.random() * 0.3,
        life: Math.random() * 100,
        maxLife: 100 + Math.random() * 200,
      });
    }

    // Floating particles
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;
      color: string;
      pulsePhase: number;
    }

    const particles: Particle[] = [];
    const colors = ["#00ffff", "#8b5cf6", "#ec4899", "#0ca30c", "#fab219", "#d03b3b"];
    for (let i = 0; i < config.particleCount; i++) {
      particles.push({
        x: Math.random() * windowSize.width,
        y: Math.random() * windowSize.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 1 + Math.random() * 3,
        opacity: 0.1 + Math.random() * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    // Network grid nodes
    interface NetworkNode {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;
      pulsePhase: number;
      connections: number[];
    }

    const networkNodes: NetworkNode[] = [];
    for (let i = 0; i < config.networkNodes; i++) {
      networkNodes.push({
        x: Math.random() * windowSize.width,
        y: Math.random() * windowSize.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: 2 + Math.random() * 4,
        opacity: 0.2 + Math.random() * 0.4,
        pulsePhase: Math.random() * Math.PI * 2,
        connections: [],
      });
    }

    // Build network connections
    for (let i = 0; i < networkNodes.length; i++) {
      for (let j = i + 1; j < networkNodes.length; j++) {
        const dx = networkNodes[i].x - networkNodes[j].x;
        const dy = networkNodes[i].y - networkNodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && Math.random() < 0.3) {
          networkNodes[i].connections.push(j);
          networkNodes[j].connections.push(i);
        }
      }
    }

    // Data streams
    interface DataStream {
      x: number;
      y: number;
      angle: number;
      speed: number;
      length: number;
      chars: string[];
      opacity: number;
    }

    const dataStreams: DataStream[] = [];
    for (let i = 0; i < 8; i++) {
      dataStreams.push({
        x: Math.random() * windowSize.width,
        y: Math.random() * windowSize.height,
        angle: Math.random() * Math.PI * 2,
        speed: 2 + Math.random() * 4,
        length: 50 + Math.random() * 150,
        chars: Array.from({ length: 20 }, () =>
          hexChars[Math.floor(Math.random() * hexChars.length)]
        ),
        opacity: 0.2 + Math.random() * 0.4,
      });
    }

    // Lightning bolts
    interface LightningBolt {
      x: number;
      y: number;
      segments: { x: number; y: number }[];
      life: number;
      maxLife: number;
      opacity: number;
    }

    const lightnings: LightningBolt[] = [];

    function createLightning() {
      const startX = Math.random() * windowSize.width;
      const startY = 0;
      const segments = [{ x: startX, y: startY }];
      let currentX = startX;
      let currentY = startY;

      while (currentY < windowSize.height) {
        currentX += (Math.random() - 0.5) * 60;
        currentY += 30 + Math.random() * 40;
        currentX = Math.max(50, Math.min(windowSize.width - 50, currentX));
        segments.push({ x: currentX, y: currentY });
      }

      lightnings.push({
        x: startX,
        y: startY,
        segments,
        life: 0,
        maxLife: 30 + Math.random() * 20,
        opacity: 1,
      });
    }

    let lastLightningTime = 0;

    let frameCount = 0;

    function animate() {
      if (prefersReducedMotion) return;

      ctx.clearRect(0, 0, windowSize.width, windowSize.height);
      frameCount++;

      // Radial glow at cursor position
      if (showRadialGlow) {
        const gradient = ctx.createRadialGradient(
          cursorPosRef.current.x,
          cursorPosRef.current.y,
          0,
          cursorPosRef.current.x,
          cursorPosRef.current.y,
          400
        );
        gradient.addColorStop(0, "rgba(0, 255, 255, 0.08)");
        gradient.addColorStop(0.3, "rgba(139, 92, 246, 0.04)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, windowSize.width, windowSize.height);
      }

      // Network grid connections
      if (showNetworkGrid) {
        ctx.strokeStyle = "rgba(0, 255, 255, 0.05)";
        ctx.lineWidth = 0.5;

        for (let i = 0; i < networkNodes.length; i++) {
          const node = networkNodes[i];
          for (const connIdx of node.connections) {
            const target = networkNodes[connIdx];
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
          }
        }

        // Draw nodes
        for (const node of networkNodes) {
          const pulse = Math.sin(frameCount * 0.02 + node.pulsePhase) * 0.5 + 0.5;
          const radius = node.radius * (0.8 + pulse * 0.4);
          const opacity = node.opacity * (0.5 + pulse * 0.5);

          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 255, 255, ${opacity})`;
          ctx.fill();

          // Glow
          const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 3);
          glow.addColorStop(0, `rgba(0, 255, 255, ${opacity * 0.5})`);
          glow.addColorStop(1, "rgba(0, 255, 255, 0)");
          ctx.fillStyle = glow;
          ctx.fillRect(node.x - radius * 3, node.y - radius * 3, radius * 6, radius * 6);
        }
      }

      // Matrix rain
      if (showMatrixRain) {
        for (const drop of matrixDrops) {
          ctx.font = `${drop.fontSize}px 'JetBrains Mono', monospace`;
          ctx.fillStyle = `rgba(0, 255, 65, ${drop.opacity})`;

          for (let i = 0; i < drop.chars.length; i++) {
            const y = drop.y + i * drop.fontSize;
            if (y > -drop.fontSize && y < windowSize.height + drop.fontSize) {
              // Head character (brightest)
              if (i === 0) {
                ctx.fillStyle = `rgba(180, 255, 180, ${drop.opacity})`;
              } else if (i < 3) {
                ctx.fillStyle = `rgba(100, 255, 100, ${drop.opacity * 0.8})`;
              } else {
                ctx.fillStyle = `rgba(0, 255, 65, ${drop.opacity * (1 - i / drop.chars.length)})`;
              }
              ctx.fillText(drop.chars[i], drop.x, y);
            }
          }

          drop.y += drop.speed;

          // Reset drop when it goes off screen
          if (drop.y - drop.chars.length * drop.fontSize > windowSize.height) {
            drop.y = Math.random() * -windowSize.height;
            drop.speed = 1 + Math.random() * 3;
            drop.chars = Array.from({ length: 10 + Math.random() * 20 }, () =>
              matrixChars[Math.floor(Math.random() * matrixChars.length)]
            );
          }
        }
      }

      // Binary particles
      if (showBinaryParticles) {
        ctx.font = `14px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let i = binaryParticles.length - 1; i >= 0; i--) {
          const p = binaryParticles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life++;

          const lifeRatio = p.life / p.maxLife;
          const currentOpacity = p.opacity * (1 - lifeRatio);
          const currentSize = p.size * (1 - lifeRatio * 0.5);

          ctx.font = `${currentSize}px 'JetBrains Mono', monospace`;
          ctx.fillStyle = `rgba(0, 255, 255, ${currentOpacity})`;
          ctx.fillText(p.char, p.x, p.y);

          // Occasionally flip the bit
          if (Math.random() < 0.02) {
            p.char = binaryChars[Math.floor(Math.random() * 2)];
          }

          if (p.life >= p.maxLife || p.y < -50) {
            // Respawn
            p.x = Math.random() * windowSize.width;
            p.y = windowSize.height + 50;
            p.vx = (Math.random() - 0.5) * 0.5;
            p.vy = -0.2 - Math.random() * 0.5;
            p.char = binaryChars[Math.floor(Math.random() * 2)];
            p.size = 10 + Math.random() * 14;
            p.opacity = 0.1 + Math.random() * 0.3;
            p.life = 0;
            p.maxLife = 100 + Math.random() * 200;
          }
        }
      }

      // Floating particles
      if (showParticles) {
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.pulsePhase += 0.02;

          // Bounce off edges
          if (p.x < 0 || p.x > windowSize.width) p.vx *= -1;
          if (p.y < 0 || p.y > windowSize.height) p.vy *= -1;

          const pulse = Math.sin(p.pulsePhase) * 0.5 + 0.5;
          const radius = p.radius * (0.5 + pulse * 0.5);
          const opacity = p.opacity * (0.5 + pulse * 0.5);

          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${Math.floor(opacity * 255).toString(16).padStart(2, "0")}`;
          ctx.fill();

          // Glow
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 4);
          glow.addColorStop(0, `${p.color}${Math.floor(opacity * 100).toString(16).padStart(2, "0")}`);
          glow.addColorStop(1, `${p.color}00`);
          ctx.fillStyle = glow;
          ctx.fillRect(p.x - radius * 4, p.y - radius * 4, radius * 8, radius * 8);
        }
      }

      // Data streams
      if (showDataStreams) {
        ctx.font = `12px 'JetBrains Mono', monospace`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        for (const stream of dataStreams) {
          stream.x += Math.cos(stream.angle) * stream.speed;
          stream.y += Math.sin(stream.angle) * stream.speed;

          // Wrap around
          if (stream.x < -stream.length) stream.x = windowSize.width + stream.length;
          if (stream.x > windowSize.width + stream.length) stream.x = -stream.length;
          if (stream.y < -stream.length) stream.y = windowSize.height + stream.length;
          if (stream.y > windowSize.height + stream.length) stream.y = -stream.length;

          for (let i = 0; i < stream.chars.length; i++) {
            const charX = stream.x - Math.cos(stream.angle) * i * 14;
            const charY = stream.y - Math.sin(stream.angle) * i * 14;
            const charOpacity = stream.opacity * (1 - i / stream.chars.length);

            if (charX > -20 && charX < windowSize.width + 20 && charY > -20 && charY < windowSize.height + 20) {
              ctx.fillStyle = `rgba(0, 255, 255, ${charOpacity})`;
              ctx.fillText(stream.chars[i], charX, charY);
            }
          }

          // Occasionally mutate chars
          if (Math.random() < 0.01) {
            const idx = Math.floor(Math.random() * stream.chars.length);
            stream.chars[idx] = hexChars[Math.floor(Math.random() * hexChars.length)];
          }
        }
      }

      // Lightning
      if (showLightning) {
        const now = Date.now();
        if (now - lastLightningTime > 3000 + Math.random() * 5000) {
          createLightning();
          lastLightningTime = now;
        }

        for (let i = lightnings.length - 1; i >= 0; i--) {
          const bolt = lightnings[i];
          bolt.life++;

          const lifeRatio = bolt.life / bolt.maxLife;
          bolt.opacity = 1 - lifeRatio;

          if (bolt.opacity <= 0) {
            lightnings.splice(i, 1);
            continue;
          }

          ctx.lineWidth = 2;
          ctx.strokeStyle = `rgba(0, 255, 255, ${bolt.opacity})`;
          ctx.shadowColor = `rgba(0, 255, 255, ${bolt.opacity})`;
          ctx.shadowBlur = 20;

          ctx.beginPath();
          ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
          for (let j = 1; j < bolt.segments.length; j++) {
            ctx.lineTo(bolt.segments[j].x, bolt.segments[j].y);
          }
          ctx.stroke();

          // Branches
          for (let j = 1; j < bolt.segments.length - 1; j++) {
            if (Math.random() < 0.1) {
              const branchLength = 30 + Math.random() * 50;
              const branchAngle = (Math.random() - 0.5) * Math.PI;
              const bx = bolt.segments[j].x + Math.cos(branchAngle) * branchLength;
              const by = bolt.segments[j].y + Math.sin(branchAngle) * branchLength;

              ctx.beginPath();
              ctx.moveTo(bolt.segments[j].x, bolt.segments[j].y);
              ctx.lineTo(bx, by);
              ctx.stroke();
            }
          }

          ctx.shadowBlur = 0;
        }
      }

      // Update network nodes
      if (showNetworkGrid) {
        for (const node of networkNodes) {
          node.x += node.vx;
          node.y += node.vy;
          node.pulsePhase += 0.01;

          // Bounce
          if (node.x < 50 || node.x > windowSize.width - 50) node.vx *= -1;
          if (node.y < 50 || node.y > windowSize.height - 50) node.vy *= -1;

          // Attract to cursor slightly
          const dx = cursorPosRef.current.x - node.x;
          const dy = cursorPosRef.current.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 300) {
            const force = (300 - dist) / 300 * 0.02;
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
          }

          // Dampen velocity
          node.vx *= 0.99;
          node.vy *= 0.99;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [
    prefersReducedMotion,
    windowSize,
    intensity,
    showMatrixRain,
    showBinaryParticles,
    showParticles,
    showNetworkGrid,
    showLightning,
    showDataStreams,
    showRadialGlow,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 -z-10 pointer-events-none ${className}`}
      style={{ opacity: prefersReducedMotion ? 0.3 : 1 }}
      aria-hidden="true"
    />
  );
}