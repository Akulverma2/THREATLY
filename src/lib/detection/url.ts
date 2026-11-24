import { DetectionResult, Indicator, makeResult, clamp, recommendedAction } from "./base";

const SUSPICIOUS_TLDS = new Set(["xyz", "top", "click", "link", "gq", "ml", "cf", "tk", "work", "zip", "mov", "buzz", "fun", "rest", "best"]);
const BRANDS = ["paypal", "google", "microsoft", "apple", "amazon", "facebook", "instagram", "netflix", "bank", "office365", "outlook", "chase", "wellsfargo", "bankofamerica", "hsbc", "icici", "sbi", "paytm", "flipkart", "ebay", "linkedin", "twitter", "whatsapp", "telegram"];
const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly", "shorturl.at", "rb.gy", "tiny.cc", "shorte.st", "adf.ly"]);
const SUSPICIOUS_KEYWORDS = /login|verify|account|update|secure|banking|password|signin|credential|wallet|confirm|suspend|locked|unlock|otp/i;

function normalize(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = "http://" + u;
  return u;
}

function isIP(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function isPrivateIP(host: string): boolean {
  if (!isIP(host)) return false;
  const parts = host.split(".").map(Number);
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true; // metadata
  if (parts[0] === 0) return true;
  return false;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

export function analyzeUrl(raw: string): DetectionResult {
  const indicators: Indicator[] = [];
  const reasons: string[] = [];
  const checksPerformed: string[] = ["URL structure analysis", "Domain analysis", "Phishing indicator detection"];
  const checksUnavailable: string[] = [];
  const threatIntelSources: string[] = [];
  let score = 0;
  let url: URL;
  let normalized = raw;
  try {
    normalized = normalize(raw);
    url = new URL(normalized);
  } catch {
    // Check if the malformed URL contains punycode - still a homograph attack attempt
    const hasPunycode = /xn--/i.test(normalized);
    const malformedCategory = hasPunycode ? "HOMOGRAPH" : "INVALID_URL";
    const malformedDesc = hasPunycode
      ? "Malformed URL with punycode/IDN encoding - possible homograph attack."
      : "The supplied string is not a valid URL.";
    return makeResult({ riskScore: 100, classification: "MALICIOUS", threatCategory: malformedCategory, confidence: 1, reasons: [hasPunycode ? "Malformed punycode URL (homograph attempt)" : "Malformed URL"], indicators: [{ name: hasPunycode ? "Homograph/punycode in malformed URL" : "Malformed URL", severity: "HIGH", description: malformedDesc }], checksPerformed, recommendedAction: recommendedAction("MALICIOUS") });
  }

  const host = url.hostname.toLowerCase();
  const full = url.href.toLowerCase();
  const path = url.pathname.toLowerCase();
  const tld = host.split(".").pop() || "";
  const subdomainCount = host.split(".").length;

  // --- STRUCTURE ANALYSIS ---
  if (raw.length > 200) { score += 8; reasons.push("Unusually long URL"); indicators.push({ name: "Long URL", severity: "LOW", description: "URL length exceeds typical range, common in phishing." }); }
  else if (raw.length > 120) { score += 5; reasons.push("Long URL"); indicators.push({ name: "Long URL", severity: "LOW", description: "URL is longer than average." }); }

  if (isIP(host)) {
    if (isPrivateIP(host)) { score += 40; reasons.push("Private/reserved IP address used"); indicators.push({ name: "Private IP host", severity: "HIGH", description: "Host is a private/reserved IP (SSRF/metadata risk)." }); }
    else { score += 30; reasons.push("IP-based URL (no domain)"); indicators.push({ name: "IP-based URL", severity: "MEDIUM", description: "URL uses a raw IP address instead of a domain name." }); }
  }

  if (host.includes("xn--")) { score += 30; reasons.push("Punycode (possible homograph)"); indicators.push({ name: "Punycode/IDN", severity: "HIGH", description: "Domain uses Punycode, possible homograph attack." }); }

  if (SHORTENERS.has(host)) { score += 15; reasons.push("URL shortener used"); indicators.push({ name: "URL shortener", severity: "MEDIUM", description: "Shortened URL hides final destination." }); }

  if (subdomainCount > 4) { score += 12; reasons.push("Deep subdomain nesting"); indicators.push({ name: "Deep subdomains", severity: "MEDIUM", description: "Excessive subdomain depth can obscure the registrable domain." }); }
  else if (subdomainCount > 3) { score += 6; reasons.push("Multiple subdomains"); indicators.push({ name: "Multiple subdomains", severity: "LOW", description: "More subdomains than typical." }); }

  if (full.includes("@")) { score += 30; reasons.push("URL contains @ (obfuscation)"); indicators.push({ name: "At-sign obfuscation", severity: "HIGH", description: "The @ symbol can mask the real host." }); }

  if (/%[0-9a-f]{2}/i.test(full)) { score += 8; reasons.push("Percent-encoded characters"); indicators.push({ name: "Percent-encoding", severity: "LOW", description: "Encoded characters may hide content." }); }
  // Double encoding
  if (/%25[0-9a-f]{2}/i.test(full)) { score += 12; reasons.push("Double percent-encoding"); indicators.push({ name: "Double encoding", severity: "MEDIUM", description: "Double-encoded URL may bypass filters." }); }

  // Suspicious special chars
  if (/[<>"'{}|\\^`]/.test(raw)) { score += 10; reasons.push("Suspicious special characters"); indicators.push({ name: "Special characters", severity: "MEDIUM", description: "Unusual characters in URL." }); }

  // Unusual port
  if (url.port && !["80", "443", ""].includes(url.port)) { score += 12; reasons.push(`Unusual port :${url.port}`); indicators.push({ name: "Unusual port", severity: "MEDIUM", description: `Non-standard port ${url.port} used.` }); }

  // Query params count
  const paramCount = [...url.searchParams.keys()].length;
  if (paramCount > 8) { score += 8; reasons.push("Excessive query parameters"); indicators.push({ name: "Many query params", severity: "LOW", description: "Large number of query parameters." }); }

  // HTTPS
  if (url.protocol !== "https:") { score += 8; reasons.push("Not using HTTPS"); indicators.push({ name: "No HTTPS", severity: "LOW", description: "Connection is not encrypted." }); }

  // --- DOMAIN ANALYSIS ---
  const tldSuspicious = SUSPICIOUS_TLDS.has(tld);
  if (tldSuspicious) { score += 18; reasons.push(`Suspicious TLD (.${tld})`); indicators.push({ name: "Suspicious TLD", severity: "MEDIUM", description: `TLD .${tld} is frequently abused in phishing and malware campaigns.` }); }

  // Brand impersonation / typosquatting
  const registrable = host.split(".").slice(-2).join(".");
  for (const b of BRANDS) {
    if (host === `${b}.com` || host === `www.${b}.com` || host.endsWith(`.${b}.com`)) continue;
    // exact brand substring in a non-brand domain
    if (host.includes(b)) {
      // check typosquatting via levenshtein on the registrable label
      const label = registrable.split(".")[0];
      if (label !== b && levenshtein(label, b) <= 2) {
        score += 25; reasons.push(`Typosquatting of ${b}`); indicators.push({ name: "Typosquatting", severity: "HIGH", description: `Domain label resembles ${b} (edit distance <=2).` }); break;
      } else {
        score += 18; reasons.push(`Possible ${b} impersonation`); indicators.push({ name: "Brand impersonation", severity: "HIGH", description: `Domain contains brand name "${b}" but is not the official domain.` }); break;
      }
    }
  }

  // Suspicious keywords
  if (SUSPICIOUS_KEYWORDS.test(full)) {
    // only score if also other signals OR path contains login-like
    const kwScore = /login|signin|verify|password|credential/i.test(full) ? 12 : 6;
    score += kwScore; reasons.push("Suspicious keywords in URL");
    indicators.push({ name: "Suspicious keywords", severity: kwScore >= 12 ? "MEDIUM" : "LOW", description: "URL contains phishing-related keywords." });
  }

  // Path-based credential harvesting
  if (/\/(login|signin|verify|account|update|secure|banking|password|auth|credential)/i.test(path)) {
    score += 10; reasons.push("Credential-harvesting path");
    indicators.push({ name: "Credential harvesting path", severity: "MEDIUM", description: "Path resembles a login/verification page." });
  }

  // Multiple redirects not inspectable here (no fetch); note
  // Obfuscation via redirect-like query
  if (/[?&](url|redirect|next|goto|target|dest|destination)=/i.test(url.search)) {
    score += 10; reasons.push("Redirect parameter in URL");
    indicators.push({ name: "Redirect parameter", severity: "MEDIUM", description: "URL contains a redirect/destination parameter." });
  }

  score = clamp(score);

  // Classification with UNKNOWN handling: if no threat intel and very low info, keep verdicts based on score
  const classification = score >= 75 ? "MALICIOUS" : score >= 25 ? "SUSPICIOUS" : "SAFE";
  // Assign specific threat categories based on the dominant threat vector detected
  let threatCategory: string | null = null;
  if (classification !== "SAFE") {
    if (isIP(host) && isPrivateIP(host)) {
      threatCategory = "SSRF";
    } else if (host.includes("xn--")) {
      threatCategory = "HOMOGRAPH";
    } else {
      threatCategory = "PHISHING_URL";
    }
  }
  const confidence = Math.min(1, 0.5 + score / 200);

  // domain info
  const domainInfo = {
    host,
    registrable,
    tld,
    subdomainCount,
    isIP: isIP(host),
    isPrivateIP: isIP(host) && isPrivateIP(host),
    isShortener: SHORTENERS.has(host),
    isPunycode: host.includes("xn--"),
    hasSuspiciousTld: tldSuspicious,
    protocol: url.protocol,
    port: url.port || null,
    paramCount,
  };

  return makeResult({
    riskScore: score,
    classification,
    threatCategory,
    confidence,
    reasons: reasons.length ? reasons : ["No suspicious indicators found in structural analysis"],
    indicators: indicators.length ? indicators : [{ name: "No indicators", severity: "LOW", description: "No suspicious indicators detected in the checks performed." }],
    extractedUrls: [raw],
    domainInfo,
    checksPerformed: [...checksPerformed, "Redirect parameter inspection"],
    checksUnavailable: [...checksUnavailable, "External threat intelligence (configure API keys)", "Live redirect resolution (not performed for safety)", "DNS/certificate lookup"],
    threatIntelSources,
    recommendedAction: recommendedAction(classification),
  });
}