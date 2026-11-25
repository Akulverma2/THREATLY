import { DetectionResult, Indicator, makeResult, clamp, recommendedAction, confidenceLevel } from "./base";

const SUSPICIOUS_TLDS = new Set([
  "xyz", "top", "click", "link", "gq", "ml", "cf", "tk", "work", "zip", "mov", "buzz", "fun", "rest", "best",
  "cyou", "icu", "sbs", "cfd", "cam", "stream", "bid", "vip", "monster", "club", "live", "loan", "fit", "surf",
  "racing", "download", "accountant", "review", "country", "kim", "cricket", "science", "party", "faith"
]);

const BRANDS = [
  "paypal", "google", "microsoft", "apple", "amazon", "facebook", "instagram", "netflix",
  "chase", "wellsfargo", "bankofamerica", "citibank", "hsbc", "barclays", "santander",
  "icici", "sbi", "hdfc", "paytm", "flipkart", "ebay", "linkedin", "twitter", "whatsapp",
  "telegram", "dhl", "fedex", "ups", "usps", "outlook", "office365", "binance", "coinbase",
  "metamask", "irs", "hmrc", "dropbox", "adobe", "docusign", "steam"
];

const TOP_TRUSTED_DOMAINS = new Set([
  "google.com", "youtube.com", "apple.com", "microsoft.com", "github.com",
  "amazon.com", "cloudflare.com", "wikipedia.org", "mozilla.org", "linkedin.com",
  "twitter.com", "x.com", "facebook.com", "instagram.com", "netflix.com",
  "yahoo.com", "reddit.com", "wordpress.org", "stackoverflow.com"
]);

const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "cutt.ly", "shorturl.at", "rb.gy", "tiny.cc", "shorte.st", "adf.ly", "bl.ink", "rebrand.ly"
]);

const REDIRECT_PARAMS = new Set([
  "link", "url", "redirect", "next", "goto", "target", "dest", "destination",
  "r", "u", "to", "out", "return", "return_url", "redir", "forward", "uri",
  "continue", "ref", "relay", "view", "src", "href", "endpoint"
]);

const SUSPICIOUS_KEYWORDS = /login|signin|verify|verification|security|update|banking|password|credential|wallet|confirm|suspend|suspended|locked|unlock|otp|recover|recovery|support|helpdesk|re-activate|action-required|billing|invoice|portal|kyc|tax|refund|account|authenticate|auth/i;

const CMS_EXPLOIT_PATTERNS: { pattern: RegExp; name: string; score: number; desc: string }[] = [
  { pattern: /com_mailto/i, name: "Joomla com_mailto Open Redirect / Phishing Relay", score: 35, desc: "Exploits Joomla com_mailto component to relay victims to concealed malicious destinations." },
  { pattern: /com_users/i, name: "Joomla User Management Vector", score: 25, desc: "Targets Joomla user registration/login endpoints frequently attacked in credential stuffing." },
  { pattern: /wp-content\/(plugins|uploads|themes)\/[^/]+\/.*\.php/i, name: "Compromised WordPress PHP Script", score: 40, desc: "Targets executable PHP files inside WordPress uploads/plugins directories, common for web shells." },
  { pattern: /wp-login\.php/i, name: "WordPress Login Interface", score: 15, desc: "Direct link to WordPress admin authentication interface." },
  { pattern: /\/(alfa|wso|c99|b374k|r57|shell)\.php/i, name: "Known Web Shell / Backdoor Signature", score: 50, desc: "Signature matches well-known PHP web shell and backdoor toolkits." },
  { pattern: /\/(cpanel|webmail|roundcube)\b/i, name: "Webmail / CPanel Authentication Lure", score: 20, desc: "Path resembles a cPanel or Roundcube webmail interface used in credential harvesting." },
  { pattern: /\/owa\b/i, name: "Outlook Web Access (OWA) Phishing Target", score: 25, desc: "Path targets or impersonates Microsoft Outlook Web Access authentication." },
  { pattern: /index\.php\?option=/i, name: "CMS Component Dispatch Pattern", score: 15, desc: "CMS modular execution query commonly probed for vulnerable components." },
  { pattern: /\.(php|asp|aspx|jsp)\?[^=]+=(https?|aHR0)/i, name: "Script Parameter Relaying HTTP/Base64 Payload", score: 35, desc: "Server script parameter passing an external protocol or base64-encoded URL." },
];

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

function shannonEntropy(str: string): number {
  if (!str.length) return 0;
  const map: Record<string, number> = {};
  for (const c of str) map[c] = (map[c] || 0) + 1;
  let entropy = 0;
  for (const c in map) {
    const p = map[c] / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function tryDecodeBase64Payload(val: string): { decoded: string; isUrl: boolean } | null {
  if (!val || val.length < 8) return null;
  let raw = val;
  try { raw = decodeURIComponent(val); } catch {}
  if (!/^[A-Za-z0-9+/=_-]{8,}$/.test(raw)) return null;
  try {
    const clean = raw.replace(/-/g, "+").replace(/_/g, "/");
    const pad = clean.length % 4;
    const padded = pad ? clean + "=".repeat(4 - pad) : clean;
    const decoded = Buffer.from(padded, "base64").toString("utf8");
    if (/^https?:\/\//i.test(decoded) || /^[a-z0-9.-]+\.[a-z]{2,}/i.test(decoded)) {
      return { decoded, isUrl: true };
    }
    const match = decoded.match(/https?:\/\/[^\s"'<>]+/i);
    if (match) return { decoded: match[0], isUrl: true };
  } catch {}
  return null;
}

export function analyzeUrl(raw: string): DetectionResult {
  const indicators: Indicator[] = [];
  const reasons: string[] = [];
  const extractedUrls: string[] = [raw];
  const checksPerformed: string[] = [
    "URL structure analysis",
    "Domain analysis",
    "Phishing indicator detection",
    "Obfuscation & payload decoding",
    "CMS exploit & relay inspection"
  ];
  const checksUnavailable: string[] = [
    "External threat intelligence (configure API keys: GOOGLE_SAFE_BROWSING_API_KEY, VIRUSTOTAL_API_KEY)",
  ];
  const threatIntelSources: string[] = [];
  let score = 0;
  let url: URL;
  let normalized = raw;

  try {
    normalized = normalize(raw);
    url = new URL(normalized);
  } catch {
    const hasPunycode = /xn--/i.test(normalized);
    const malformedCategory = hasPunycode ? "HOMOGRAPH" : "INVALID_URL";
    const malformedDesc = hasPunycode
      ? "Malformed URL with punycode/IDN encoding - possible homograph attack."
      : "The supplied string is not a valid URL.";
    return makeResult({
      riskScore: 100,
      classification: "MALICIOUS",
      threatCategory: malformedCategory,
      confidence: 1,
      reasons: [hasPunycode ? "Malformed punycode URL (homograph attempt)" : "Malformed URL"],
      indicators: [{ name: hasPunycode ? "Homograph/punycode in malformed URL" : "Malformed URL", severity: "HIGH", description: malformedDesc }],
      checksPerformed,
      checksUnavailable,
      threatIntelSources,
      recommendedAction: recommendedAction("MALICIOUS"),
      domainAge: "Not available",
      domainReputation: "Invalid / Malformed Host",
    });
  }

  const host = url.hostname.toLowerCase();
  const full = url.href.toLowerCase();
  const path = url.pathname.toLowerCase();
  const tld = host.split(".").pop() || "";
  const subdomainCount = host.split(".").length;
  const registrable = host.split(".").slice(-2).join(".");

  const isTrustedDomain = TOP_TRUSTED_DOMAINS.has(host) || TOP_TRUSTED_DOMAINS.has(registrable);

  // --- 1. STRUCTURE ANALYSIS ---
  if (raw.length > 200) {
    score += 8;
    reasons.push("Unusually long URL (>200 characters)");
    indicators.push({ name: "Long URL", severity: "LOW", description: "URL length exceeds typical range, common in phishing camouflage." });
  } else if (raw.length > 120) {
    score += 5;
    reasons.push("Long URL (>120 characters)");
    indicators.push({ name: "Long URL", severity: "LOW", description: "URL is longer than average." });
  }

  if (isIP(host)) {
    if (isPrivateIP(host)) {
      score += 40;
      reasons.push("Private/reserved IP address used (SSRF risk)");
      indicators.push({ name: "Private IP host", severity: "HIGH", description: "Host is a private/reserved IP (SSRF/cloud metadata risk)." });
    } else {
      score += 30;
      reasons.push("IP-based URL (no domain)");
      indicators.push({ name: "IP-based URL", severity: "MEDIUM", description: "URL uses a raw IP address instead of a domain name." });
    }
  }

  if (host.includes("xn--")) {
    score += 30;
    reasons.push("Punycode / IDN homograph attack attempt");
    indicators.push({ name: "Punycode/IDN", severity: "HIGH", description: "Domain uses Punycode, likely spoofing a legitimate internationalized domain." });
  }

  if (SHORTENERS.has(host)) {
    score += 15;
    reasons.push("URL shortener used");
    indicators.push({ name: "URL shortener", severity: "MEDIUM", description: "Shortened URL masks final destination domain." });
  }

  if (subdomainCount > 4) {
    score += 12;
    reasons.push("Deep subdomain nesting (>4 levels)");
    indicators.push({ name: "Deep subdomains", severity: "MEDIUM", description: "Excessive subdomain depth can obscure the registrable root domain." });
  } else if (subdomainCount > 3) {
    score += 6;
    reasons.push("Multiple subdomains");
    indicators.push({ name: "Multiple subdomains", severity: "LOW", description: "More subdomains than standard web services." });
  }

  if (full.includes("@")) {
    score += 30;
    reasons.push("URL contains @ symbol (authority obfuscation)");
    indicators.push({ name: "At-sign obfuscation", severity: "HIGH", description: "The @ symbol tricks browsers into ignoring leading credentials and navigating to the real host." });
  }

  if (/%[0-9a-f]{2}/i.test(full)) {
    score += 8;
    reasons.push("Percent-encoded characters in URL");
    indicators.push({ name: "Percent-encoding", severity: "LOW", description: "Encoded characters may conceal malicious patterns or paths." });
  }

  if (/%25[0-9a-f]{2}/i.test(full)) {
    score += 12;
    reasons.push("Double percent-encoding detected");
    indicators.push({ name: "Double encoding", severity: "MEDIUM", description: "Double-encoded characters bypass basic security filters." });
  }

  if (/[<>"'{}|\\^`]/.test(raw)) {
    score += 10;
    reasons.push("Suspicious special characters in URL string");
    indicators.push({ name: "Special characters", severity: "MEDIUM", description: "Unusual or invalid URI characters detected." });
  }

  if (url.port && !["80", "443", ""].includes(url.port)) {
    score += 12;
    reasons.push(`Non-standard port (:${url.port})`);
    indicators.push({ name: "Unusual port", severity: "MEDIUM", description: `Port ${url.port} is non-standard for web traffic.` });
  }

  const searchParams = url.searchParams;
  const paramCount = [...searchParams.keys()].length;
  if (paramCount > 8) {
    score += 8;
    reasons.push("Excessive query parameters (>8)");
    indicators.push({ name: "High parameter count", severity: "LOW", description: "High volume of query parameters often used in session/token tracking or tracking pixels." });
  }

  if (url.protocol !== "https:") {
    score += 8;
    reasons.push("Not using HTTPS (unencrypted connection)");
    indicators.push({ name: "No HTTPS", severity: "LOW", description: "Connection is unencrypted HTTP, vulnerable to MITM attacks." });
  }

  // --- 2. BASE64 OBFUSCATION & EMBEDDED URL PAYLOADS ---
  let hasBase64Url = false;
  let hasOpenRedirect = false;

  for (const [key, val] of searchParams.entries()) {
    const kLower = key.toLowerCase();
    const isRedirectKey = REDIRECT_PARAMS.has(kLower);

    // Check base64 encoded URL payload
    const b64 = tryDecodeBase64Payload(val);
    if (b64 && b64.isUrl) {
      hasBase64Url = true;
      score += 35;
      extractedUrls.push(b64.decoded);
      reasons.push(`Base64-encoded destination parameter in URL ('${key}')`);
      indicators.push({
        name: "Base64 Obfuscated Destination",
        severity: "HIGH",
        description: `Query parameter '${key}' contains a base64-encoded destination URL payload (${b64.decoded.slice(0, 60)}...). Attackers use this to evade email filters and conceal malicious destinations.`
      });
      // Check if decoded URL is suspicious itself
      if (SUSPICIOUS_KEYWORDS.test(b64.decoded)) {
        score += 15;
        reasons.push("Decoded target URL contains phishing/auth keywords");
      }
    }

    // Direct open redirect
    if (isRedirectKey && /^https?:\/\//i.test(val)) {
      hasOpenRedirect = true;
      score += 25;
      extractedUrls.push(val);
      reasons.push(`Open redirect parameter ('${key}') pointing to external location`);
      indicators.push({
        name: "Open Redirect Vector",
        severity: "HIGH",
        description: `Parameter '${key}' points to external location (${val.slice(0, 50)}...). Open redirects are weaponized to abuse legitimate domain trust.`
      });
    }
  }

  // Fallback regex for redirect parameters if searchParams didn't catch it
  if (!hasOpenRedirect && /[?&](url|redirect|next|goto|target|dest|destination|link|return|forward)=/i.test(url.search)) {
    score += 10;
    reasons.push("Redirect parameter in URL query");
    indicators.push({ name: "Redirect parameter", severity: "MEDIUM", description: "URL contains a redirect/destination parameter." });
  }

  // --- 3. CMS EXPLOIT & VULNERABLE RELAY ENDPOINTS ---
  for (const exploit of CMS_EXPLOIT_PATTERNS) {
    if (exploit.pattern.test(full)) {
      score += exploit.score;
      reasons.push(exploit.name);
      indicators.push({
        name: exploit.name,
        severity: exploit.score >= 35 ? "HIGH" : "MEDIUM",
        description: exploit.desc
      });
    }
  }

  // --- 4. DOMAIN ANALYSIS & TYPOSQUATTING ---
  const tldSuspicious = SUSPICIOUS_TLDS.has(tld);
  if (tldSuspicious) {
    score += 18;
    reasons.push(`Suspicious high-abuse TLD (.${tld})`);
    indicators.push({ name: "Suspicious TLD", severity: "MEDIUM", description: `TLD .${tld} has a statistically high rate of cybercrime, phishing, and malware distribution.` });
  }

  // Brand impersonation
  for (const b of BRANDS) {
    if (host === `${b}.com` || host === `www.${b}.com` || host.endsWith(`.${b}.com`)) continue;
    if (host.includes(b)) {
      const label = registrable.split(".")[0];
      if (label !== b && levenshtein(label, b) <= 2) {
        score += 30;
        reasons.push(`Typosquatting of ${b} (edit distance <= 2)`);
        indicators.push({ name: "Brand Typosquatting", severity: "HIGH", description: `Domain label resembles ${b} with deceptive character substitution.` });
        break;
      } else {
        score += 22;
        reasons.push(`Possible ${b} impersonation in domain`);
        indicators.push({ name: "Brand Impersonation", severity: "HIGH", description: `Domain contains brand name "${b}" but is not the official registered property.` });
        break;
      }
    }
  }

  // Domain Shannon Entropy (DGA detection)
  const hostLabel = registrable.split(".")[0];
  if (hostLabel && hostLabel.length >= 10 && !isIP(host)) {
    const entropy = shannonEntropy(hostLabel);
    if (entropy > 3.8) {
      score += 18;
      reasons.push(`High domain randomness / entropy (${entropy.toFixed(2)}) - possible DGA`);
      indicators.push({ name: "Domain Generation Algorithm (DGA)", severity: "MEDIUM", description: "Domain label displays high randomness characteristic of automated malware DGA generation." });
    }
  }

  // Hyphen stuffing (e.g. paypal-security-update-verify.com)
  const hyphenCount = (hostLabel.match(/-/g) || []).length;
  if (hyphenCount >= 3) {
    score += 16;
    reasons.push(`Excessive hyphens in domain (${hyphenCount} hyphens)`);
    indicators.push({ name: "Hyphen Stuffing", severity: "MEDIUM", description: "Multiple hyphens combined to form deceptive lookalike domain names." });
  }

  // Suspicious keywords
  if (SUSPICIOUS_KEYWORDS.test(full)) {
    const kwScore = /login|signin|verify|verification|password|credential/i.test(full) ? 14 : 8;
    score += kwScore;
    reasons.push("Phishing / credential-harvesting keywords in URL");
    indicators.push({ name: "Phishing Keywords", severity: kwScore >= 14 ? "MEDIUM" : "LOW", description: "URL contains terms commonly associated with credential harvesting or urgency triggers." });
  }

  // Path-based credential harvesting
  if (/\/(login|signin|verify|account|update|secure|banking|password|auth|credential|admin)/i.test(path)) {
    score += 12;
    reasons.push("Credential-harvesting path structure");
    indicators.push({ name: "Credential harvesting path", severity: "MEDIUM", description: "URL path mimics a secure authentication/verification gate." });
  }

  // Established domain trust deduction
  if (isTrustedDomain && !hasBase64Url && !hasOpenRedirect && !host.includes("xn--")) {
    score = Math.max(0, score - 20);
  }

  score = clamp(score);

  const classification = score >= 75 ? "MALICIOUS" : score >= 25 ? "SUSPICIOUS" : "SAFE";

  // Assign specific threat categories based on the dominant threat vector detected
  let threatCategory: string | null = null;
  if (classification !== "SAFE") {
    if (isIP(host) && isPrivateIP(host)) {
      threatCategory = "SSRF";
    } else if (host.includes("xn--")) {
      threatCategory = "HOMOGRAPH";
    } else if (hasBase64Url || hasOpenRedirect || /com_mailto/i.test(full)) {
      threatCategory = "MALICIOUS_REDIRECT";
    } else if (CMS_EXPLOIT_PATTERNS.some(e => e.pattern.test(full))) {
      threatCategory = "EXPLOIT_KIT";
    } else {
      threatCategory = "PHISHING_URL";
    }
  }

  const confidence = isTrustedDomain
    ? 0.95
    : Math.min(0.98, 0.55 + score / 180);

  // Heuristic domain reputation & age defaults
  let domainReputation = "Suspicious / Unverified";
  let domainAge = "Unknown / Suspicious registration";

  if (isTrustedDomain) {
    domainReputation = "Established / High Trust Authority";
    domainAge = "Established (> 15 years)";
  } else if (isIP(host)) {
    domainReputation = isPrivateIP(host) ? "Private / Reserved Network (SSRF)" : "Raw IP Host (No Domain)";
    domainAge = "Not Applicable (IP)";
  } else if (classification === "SAFE") {
    domainReputation = "Standard / No Active Flags";
    domainAge = "Evaluated via heuristics";
  }

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
    reasons: reasons.length ? reasons : ["No suspicious indicators detected in structural analysis"],
    indicators: indicators.length ? indicators : [{ name: "No indicators", severity: "LOW", description: "No suspicious indicators detected in the checks performed." }],
    extractedUrls: Array.from(new Set(extractedUrls)),
    domainInfo,
    checksPerformed,
    checksUnavailable,
    threatIntelSources,
    recommendedAction: recommendedAction(classification),
    domainAge,
    domainReputation,
  });
}

// ─── Asynchronous Threat Intelligence & Live DNS Telemetry ───────────────────
export async function analyzeUrlAsync(raw: string): Promise<DetectionResult> {
  const baseResult = analyzeUrl(raw);

  // If already malformed, return immediately
  if (baseResult.threatCategory === "INVALID_URL" || baseResult.threatCategory === "HOMOGRAPH" && baseResult.riskScore === 100) {
    return baseResult;
  }

  const host = (baseResult.domainInfo?.host as string) || "";
  const registrable = (baseResult.domainInfo?.registrable as string) || host;
  const isHostIP = baseResult.domainInfo?.isIP as boolean;

  let riskScore = baseResult.riskScore;
  const reasons = [...baseResult.reasons];
  const indicators = [...baseResult.indicators];
  const checksPerformed = [...baseResult.checksPerformed];
  const checksUnavailable: string[] = [];
  const threatIntelSources = [...baseResult.threatIntelSources];
  let domainReputation = baseResult.domainReputation;
  let domainAge = baseResult.domainAge;
  let threatCategory = baseResult.threatCategory;

  // 1. Live DNS Verification via Cloudflare DoH (Fast, resilient, safe)
  if (host && !isHostIP) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const dohRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`, {
        headers: { Accept: "application/dns-json" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (dohRes.ok) {
        const dohData = await dohRes.json();
        checksPerformed.push("Live DNS Resolution (Cloudflare DoH)");

        if (dohData.Status === 3) {
          // NXDOMAIN: Domain does not exist or has been taken down
          riskScore += 25;
          reasons.push("Domain failed DNS resolution (NXDOMAIN / Inactive)");
          indicators.push({
            name: "Unresolvable Host (NXDOMAIN)",
            severity: "HIGH",
            description: "Domain has no active DNS A/AAAA records. Inactive, taken-down, or sinkholed domains are frequently associated with dismantled phishing campaigns or dead command-and-control nodes."
          });
          domainReputation = "NXDOMAIN — Non-Existent / Inactive Domain";
          domainAge = "Expired or Unregistered";
          if (!threatCategory) threatCategory = "MALICIOUS_INFRASTRUCTURE";
        } else if (dohData.Status === 0 && Array.isArray(dohData.Answer) && dohData.Answer.length > 0) {
          const resolvedIps = dohData.Answer.filter((a: { type: number }) => a.type === 1).map((a: { data: string }) => a.data);
          if (resolvedIps.length > 0) {
            domainReputation = `Active (Resolves to ${resolvedIps[0]})`;
          }
        }
      }
    } catch {
      // Network timeout or offline - gracefully fallback
    }
  }

  // 2. Google Safe Browsing API (if API key configured)
  const gsbKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (gsbKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const gsbRes = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${gsbKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "threatly-scanner", clientVersion: "1.0.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url: raw }],
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (gsbRes.ok) {
        const gsbData = await gsbRes.json();
        threatIntelSources.push("Google Safe Browsing v4");
        checksPerformed.push("Google Safe Browsing API");

        if (gsbData.matches && gsbData.matches.length > 0) {
          const matchType = gsbData.matches[0].threatType;
          riskScore = 100;
          threatCategory = matchType === "SOCIAL_ENGINEERING" ? "PHISHING_URL" : "MALWARE";
          reasons.push(`Flagged by Google Safe Browsing as ${matchType}`);
          indicators.push({
            name: "Google Safe Browsing Blacklist",
            severity: "CRITICAL",
            description: `URL is actively flagged on Google Safe Browsing database for ${matchType}.`
          });
        }
      }
    } catch {
      checksUnavailable.push("Google Safe Browsing API (timeout/unreachable)");
    }
  } else {
    checksUnavailable.push("Google Safe Browsing API (GOOGLE_SAFE_BROWSING_API_KEY unset)");
  }

  // 3. VirusTotal API v3 (if API key configured)
  const vtKey = process.env.VIRUSTOTAL_API_KEY;
  if (vtKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const urlId = Buffer.from(raw).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

      const vtRes = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
        headers: { "x-apikey": vtKey },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (vtRes.ok) {
        const vtData = await vtRes.json();
        threatIntelSources.push("VirusTotal v3");
        checksPerformed.push("VirusTotal URL Reputation");

        const stats = vtData.data?.attributes?.last_analysis_stats;
        if (stats) {
          const malCount = (stats.malicious || 0) + (stats.suspicious || 0);
          if (malCount > 0) {
            riskScore = Math.max(riskScore, Math.min(100, 50 + malCount * 15));
            reasons.push(`VirusTotal: Flagged malicious by ${malCount} security vendors`);
            indicators.push({
              name: "VirusTotal Detection",
              severity: malCount >= 3 ? "CRITICAL" : "HIGH",
              description: `${malCount} independent antivirus and threat intelligence engines flagged this URL as malicious.`
            });
            if (!threatCategory) threatCategory = "MALWARE";
          }
        }
      }
    } catch {
      checksUnavailable.push("VirusTotal API (timeout/unreachable)");
    }
  } else {
    checksUnavailable.push("VirusTotal API (VIRUSTOTAL_API_KEY unset)");
  }

  // 4. RDAP Domain Age Lookup (if not an IP and not already known)
  if (host && !isHostIP && !TOP_TRUSTED_DOMAINS.has(host) && !TOP_TRUSTED_DOMAINS.has(registrable)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const rdapRes = await fetch(`https://rdap.org/domain/${encodeURIComponent(registrable)}`, {
        headers: { Accept: "application/rdap+json", "User-Agent": "Threatly/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (rdapRes.ok) {
        const rdapData = await rdapRes.json();
        checksPerformed.push("RDAP Domain Age Verification");
        const events = rdapData.events || [];
        const regEvent = events.find((e: { eventAction: string }) =>
          e.eventAction === "registration" || e.eventAction === "created"
        );

        if (regEvent && regEvent.eventDate) {
          const regDate = new Date(regEvent.eventDate);
          const ageDays = Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24));

          if (ageDays >= 0) {
            if (ageDays < 30) {
              riskScore += 30;
              reasons.push(`Newly registered domain (${ageDays} days old)`);
              indicators.push({
                name: "Newly Registered Domain",
                severity: "HIGH",
                description: `Domain was created ${ageDays} days ago (${regDate.toISOString().split("T")[0]}). Newly registered domains are disproportionately used in phishing and zero-day attacks.`
              });
              domainAge = `${ageDays} days old (High Risk)`;
            } else if (ageDays < 180) {
              domainAge = `${ageDays} days old (Recent)`;
            } else {
              const years = Math.floor(ageDays / 365);
              domainAge = years >= 1 ? `${years}+ year(s) old (${regDate.getFullYear()})` : `${ageDays} days old`;
            }
          }
        }
      }
    } catch {
      // RDAP timed out or blocked - non-blocking
    }
  }

  const finalScore = clamp(riskScore);
  const finalClassification = finalScore >= 75 ? "MALICIOUS" : finalScore >= 25 ? "SUSPICIOUS" : "SAFE";
  const finalConf = Math.min(0.98, 0.55 + finalScore / 180);

  // If no indicators were detected, provide clean fallback
  const finalIndicators = indicators.filter(ind => ind.name !== "No indicators");
  const finalReasons = reasons.filter(r => !r.includes("No suspicious indicators"));

  return makeResult({
    riskScore: finalScore,
    classification: finalClassification,
    threatCategory: finalClassification === "SAFE" ? null : (threatCategory ?? "PHISHING_URL"),
    confidence: finalConf,
    confidenceLevel: confidenceLevel(finalConf),
    reasons: finalReasons.length ? finalReasons : ["No suspicious indicators detected"],
    indicators: finalIndicators.length ? finalIndicators : [{ name: "Clean Heuristics", severity: "LOW", description: "All structural, lexical, and telemetry checks passed without security anomalies." }],
    extractedUrls: baseResult.extractedUrls,
    domainInfo: baseResult.domainInfo,
    checksPerformed,
    checksUnavailable,
    threatIntelSources,
    recommendedAction: recommendedAction(finalClassification),
    domainAge,
    domainReputation,
  });
}
