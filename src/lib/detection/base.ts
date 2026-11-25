export type Classification = "SAFE" | "SUSPICIOUS" | "MALICIOUS";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Indicator {
  name: string;
  severity: Severity;
  description: string;
}

export interface DetectionResult {
  scanId?: string;
  scanType?: string;
  verdict: Classification;
  classification: Classification;
  riskScore: number;
  confidence: number;
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
  threatCategory: string | null;
  indicators: Indicator[];
  reasons: string[];
  detectedIndicators: string[];
  detailedExplanations: string[];
  extractedUrls: string[];
  domainInfo: Record<string, unknown> | null;
  checksPerformed: string[];
  checksUnavailable: string[];
  threatIntelSources: string[];
  recommendedAction: string;
  timestamp: string;
  domainAge?: string | null;
  domainReputation?: string | null;
  redirectChain?: string[];
  suspiciousIndicators?: string[];
}

export function classifyScore(score: number): Classification {
  if (score >= 75) return "MALICIOUS";
  if (score >= 25) return "SUSPICIOUS";
  return "SAFE";
}

export function recommendedAction(c: Classification): string {
  if (c === "MALICIOUS") return "Do not interact. Block and report to your security team.";
  if (c === "SUSPICIOUS") return "Proceed with caution. Verify the source through an independent channel.";
  return "No action required, but stay vigilant.";
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function confidenceLevel(c: number): "LOW" | "MEDIUM" | "HIGH" {
  if (c >= 0.75) return "HIGH";
  if (c >= 0.45) return "MEDIUM";
  return "LOW";
}

export function makeResult(partial: Partial<DetectionResult> & { riskScore: number; classification: Classification }): DetectionResult {
  const score = partial.riskScore;
  const conf = partial.confidence ?? Math.min(1, 0.4 + score / 200);
  return {
    verdict: partial.classification,
    classification: partial.classification,
    riskScore: score,
    confidence: conf,
    confidenceLevel: confidenceLevel(conf),
    threatCategory: partial.threatCategory ?? null,
    indicators: partial.indicators ?? [],
    reasons: partial.reasons ?? [],
    detectedIndicators: partial.detectedIndicators ?? (partial.reasons ?? []),
    detailedExplanations: partial.detailedExplanations ?? (partial.reasons ?? []),
    extractedUrls: partial.extractedUrls ?? [],
    domainInfo: partial.domainInfo ?? null,
    checksPerformed: partial.checksPerformed ?? [],
    checksUnavailable: partial.checksUnavailable ?? [],
    threatIntelSources: partial.threatIntelSources ?? [],
    recommendedAction: partial.recommendedAction ?? recommendedAction(partial.classification),
    timestamp: new Date().toISOString(),
    domainAge: partial.domainAge ?? null,
    domainReputation: partial.domainReputation ?? null,
    redirectChain: partial.redirectChain ?? [],
    suspiciousIndicators: partial.suspiciousIndicators ?? [],
  };
}