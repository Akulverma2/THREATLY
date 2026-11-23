import { DetectionResult, classifyScore, recommendedAction, clamp } from "./base";

const SUSPICIOUS_TLDS = new Set(["xyz", "top", "click", "link", "gq", "ml", "cf", "tk", "work", "zip", "mov"]);
const BRANDS = ["paypal", "google", "microsoft", "apple", "amazon", "facebook", "instagram", "netflix", "bank", "office365"];
const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly"]);

function normalize(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = "http://" + u;
  return u;
}

export function analyzeUrl(raw: string): DetectionResult {
  const reasons: string[] = [];
  let score = 0;
  let url: URL;
  try {
    url = new URL(normalize(raw));
  } catch {
    return { riskScore: 100, classification: "MALICIOUS", threatCategory: "INVALID_URL", confidence: 1, reasons: ["Malformed URL"], recommendedAction: "Do not open." };
  }

  const host = url.hostname.toLowerCase();
  const full = url.href.toLowerCase();

  // IP-based
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) { score += 35; reasons.push("IP-based URL"); }
  // Punycode / homograph
  if (host.includes("xn--")) { score += 30; reasons.push("Punycode (possible homograph)"); }
  // Suspicious TLD
  const tld = host.split(".").pop() || "";
  if (SUSPICIOUS_TLDS.has(tld)) { score += 15; reasons.push(`Suspicious TLD (.${tld})`); }
  // Shortener
  if (SHORTENERS.has(host)) { score += 10; reasons.push("URL shortener used"); }
  // Brand typosquatting
  for (const b of BRANDS) {
    if (host.includes(b) && host !== `${b}.com` && !host.endsWith(`.${b}.com`)) {
      // crude: brand present but not exact brand domain
      if (!host.endsWith(b + ".com")) { score += 20; reasons.push(`Possible ${b} impersonation`); break; }
    }
  }
  // Obfuscation: @, double slash, encoded
  if (full.includes("@")) { score += 25; reasons.push("URL contains @ (obfuscation)"); }
  if (/%[0-9a-f]{2}/i.test(full)) { score += 10; reasons.push("Percent-encoded characters"); }
  // Long URL
  if (raw.length > 120) { score += 8; reasons.push("Unusually long URL"); }
  // Subdomain depth
  if (host.split(".").length > 4) { score += 10; reasons.push("Deep subdomain nesting"); }
  // HTTPS
  if (url.protocol !== "https:") { score += 8; reasons.push("Not using HTTPS"); }
  // Query with suspicious keywords
  if (/login|verify|account|update|secure|banking|password/i.test(full)) { score += 12; reasons.push("Suspicious keywords in URL"); }

  score = clamp(score);
  const classification = classifyScore(score);
  const threatCategory = classification === "SAFE" ? null : "PHISHING_URL";
  const confidence = Math.min(1, 0.5 + score / 200);
  return { riskScore: score, classification, threatCategory, confidence, reasons: reasons.length ? reasons : ["No suspicious indicators"], recommendedAction: recommendedAction(classification) };
}
EOF
