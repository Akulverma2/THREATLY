import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { BackgroundEffects } from "@/components/BackgroundEffects";

export const metadata: Metadata = {
  title: "THREATLY — Unified Cybersecurity Platform",
  description: "Real-time threat detection for URLs, QR codes, messages & emails. Hybrid AI engine. Explainable verdicts. Zero friction.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#050816] text-gray-200 antialiased">
        <BackgroundEffects
          intensity="medium"
          showMatrixRain={true}
          showBinaryParticles={true}
          showParticles={true}
          showNetworkGrid={true}
          showLightning={false}
          showDataStreams={true}
          showRadialGlow={true}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}