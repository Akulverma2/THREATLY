import { DetectionResult, makeResult, classifyScore, recommendedAction, clamp } from "./base";

const SCAM_PATTERNS: { re: RegExp; weight: number; reason: string }[] = [
  { re: /otp|one.?time.?password/i, weight: 75, reason: "OTP request" },
  { re: /congratulations|you (won|have won)|lottery|prize/i, weight: 55, reason: "Lottery/prize scam" },
  { re: /urgent|immediately|within \d+ (hours|minutes)/i, weight: 25, reason: "Urgency language" },
  { re: /click (here|the link)|verify (your )?account/i, weight: 20, reason: "Credential harvesting phrasing" },
  { re: /bank (account|details)|ifsc|upi|transfer/i, weight: 18, reason: "Banking fraud indicators" },
  { re: /password|credentials|your (account |login )?(details|info)|send me your/i, weight: 20, reason: "Credential/password request" },
  { re: /http[s]?:\/\//i, weight: 12, reason: "Embedded link" },
  { re: /gift card|bitcoin|crypto/i, weight: 20, reason: "Unusual payment method" },
];

export function analyzeMessage(raw: string): DetectionResult {
  const reasons: string[] = [];
  let score = 0;
  for (const p of SCAM_PATTERNS) {
    if (p.re.test(raw)) { score += p.weight; reasons.push(p.reason); }
  }
  // URL extraction delegated
  const urls = raw.match(/https?:\/\/[^\s]+/gi) || [];
  if (urls.length > 0) { score += 5 * urls.length; reasons.push(`${urls.length} embedded URL(s)`); }
  score = clamp(score);
  const classification = classifyScore(score);
  const threatCategory = classification === "SAFE" ? null : "SMS_SCAM";
  const confidence = Math.min(1, 0.4 + score / 150);
  return makeResult({ riskScore: score, classification, threatCategory, confidence, reasons: reasons.length ? reasons : ["No scam indicators"], recommendedAction: recommendedAction(classification), checksPerformed: ["Message pattern analysis"], extractedUrls: urls });
}
