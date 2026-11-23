export type Classification = "SAFE" | "SUSPICIOUS" | "MALICIOUS";

export interface DetectionResult {
  riskScore: number;
  classification: Classification;
  threatCategory: string | null;
  confidence: number;
  reasons: string[];
  recommendedAction: string;
}

export function classifyScore(score: number): Classification {
  if (score >= 75) return "MALICIOUS";
  if (score >= 25) return "SUSPICIOUS";
  return "SAFE";
}

export function recommendedAction(c: Classification): string {
  if (c === "MALICIOUS") return "Do not interact. Block and report.";
  if (c === "SUSPICIOUS") return "Proceed with caution. Verify source.";
  return "No action required.";
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}
EOF
