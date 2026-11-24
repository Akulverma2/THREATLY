"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  href?: string;
  showBadge?: boolean;
}

export function BrandLogo({ size = "md", href = "/", showBadge = true }: BrandLogoProps) {
  const [isHovered, setIsHovered] = useState(false);

  const dimensions = {
    sm: { img: 32, text: "text-xl", badge: "text-[9px] px-1.5 py-0.5", gap: "gap-2.5" },
    md: { img: 42, text: "text-2xl sm:text-3xl", badge: "text-[10px] px-2 py-0.5", gap: "gap-3" },
    lg: { img: 56, text: "text-3xl sm:text-4xl", badge: "text-xs px-2.5 py-1", gap: "gap-4" },
  }[size];

  const content = (
    <div
      className={`group flex items-center ${dimensions.gap} select-none transition-transform duration-300 ease-out`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ perspective: "1000px" }}
    >
      {/* 3D Shield Icon Container */}
      <div
        className="relative flex items-center justify-center transition-all duration-500 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: isHovered
            ? "rotateY(-12deg) rotateX(10deg) scale(1.08)"
            : "rotateY(0deg) rotateX(0deg) scale(1)",
        }}
      >
        {/* Ambient Neon Holographic Halo Glow */}
        <div
          className="absolute inset-0 -m-2 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(0,255,255,0.6) 0%, rgba(139,92,246,0.4) 60%, transparent 80%)",
          }}
        />

        {/* 3D Shield Image */}
        <div className="relative z-10 drop-shadow-[0_0_16px_rgba(0,255,255,0.7)] group-hover:drop-shadow-[0_0_24px_rgba(0,255,255,0.95)] transition-all duration-300">
          <Image
            src="/shield-3d.png"
            alt="THREATLY 3D Shield"
            width={dimensions.img}
            height={dimensions.img}
            className="w-auto object-contain pointer-events-none"
            style={{ height: `${dimensions.img}px` }}
            priority
          />
        </div>

        {/* Orbit Ring Neon Glimmer */}
        <span
          className="absolute -inset-1 rounded-full border border-cyan-400/40 opacity-40 group-hover:opacity-80 group-hover:scale-110 transition-all duration-500 pointer-events-none animate-pulse"
        />
      </div>

      {/* 3D Typography */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span
            className={`font-black tracking-wider ${dimensions.text} uppercase transition-all duration-300`}
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #a5f3fc 25%, #00ffff 55%, #c084fc 80%, #f472b6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: isHovered
                ? "0 2px 8px rgba(0,255,255,0.8), 0 4px 16px rgba(139,92,246,0.6)"
                : "0 2px 4px rgba(0,255,255,0.4)",
              letterSpacing: "0.08em",
            }}
          >
            THREATLY
          </span>

          {showBadge && (
            <span
              className={`hidden sm:inline-flex items-center gap-1 font-mono font-bold tracking-widest uppercase rounded-full border border-cyan-400/40 bg-cyan-950/40 text-cyan-300 shadow-[0_0_10px_rgba(0,255,255,0.2)] ${dimensions.badge}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              v2.0
            </span>
          )}
        </div>

        <span className="hidden sm:block text-[9px] font-mono tracking-[0.28em] text-cyan-400/70 uppercase -mt-0.5 group-hover:text-cyan-300 transition-colors">
          CYBER DEFENSE
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
