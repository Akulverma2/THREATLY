import { DetectionResult, Indicator, makeResult, clamp, recommendedAction } from "./base";
import { analyzeUrl } from "./url";

export interface EmailInput {
  sender?: string;
  subject?: string;
  body: string;
  attachments?: string[];
  rawHeaders?: string;
}

const RISKY_EXT = [".exe", ".scr", ".js", ".vbs", ".bat", ".cmd", ".zip", ".iso", ".msi", ".ps1", ".hta"];
const BRANDS = ["paypal", "google", "microsoft", "apple", "amazon", "facebook", "bank", "office365", "outlook", "chase", "wellsfargo", "paytm", "flipkart"];

function extractUrls(text: string): string[] {
  const re = /https?:\/\/[^\s<>"')]+/gi;
  const found: string[] = text.match(re) || [] as string[];
  // also href="..."
  const hrefRe = /href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = hrefRe.exec(text)) !== null) found.push(m[1]);
  return Array.from(new Set(found));
}

function parseHeaders(raw?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const k = line.slice(0, idx).trim().toLowerCase();
      const v = line.slice(idx + 1).trim();
      if (k) out[k] = v;
    }
  }
  return out;
}

export function analyzeEmail(raw: EmailInput): DetectionResult {
  const indicators: Indicator[] = [];
  const reasons: string[] = [];
  const checksPerformed: string[] = ["Email content analysis"];
  const checksUnavailable: string[] = [];
  const threatIntelSources: string[] = [];
  let score = 0;

  const sender = (raw.sender || "").trim();
  const subject = (raw.subject || "").trim();
  const body = raw.body || "";
  const lowerSender = sender.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  const lowerBody = body.toLowerCase();

  const headers = parseHeaders(raw.rawHeaders);
  const hasHeaders = Object.keys(headers).length > 0;
  if (hasHeaders) checksPerformed.push("Header analysis");

  // --- Sender authenticity ---
  if (!sender || !sender.includes("@")) {
    score += 15; reasons.push("Missing/invalid sender"); indicators.push({ name: "Invalid sender", severity: "MEDIUM", description: "Sender address missing or malformed." });
  }

  // Display name spoofing
  const nameMatch = sender.match(/^(.+?)\s*<(.+)>$/);
  if (nameMatch) {
    const displayName = nameMatch[1].trim();
    const addr = nameMatch[2].trim().toLowerCase();
    const firstToken = displayName.toLowerCase().split(/\s+/)[0];
    if (firstToken && !addr.includes(firstToken) && firstToken.length > 2) {
      score += 18; reasons.push("Display name mismatch with address");
      indicators.push({ name: "Display-name spoofing", severity: "HIGH", description: "Display name does not match sender address domain." });
    }
    // brand in display name but domain not brand
    for (const b of BRANDS) {
      if (displayName.toLowerCase().includes(b) && !addr.includes(b)) {
        score += 22; reasons.push(`Display name impersonates ${b}`);
        indicators.push({ name: "Brand impersonation in display name", severity: "HIGH", description: `Display name claims ${b} but address domain differs.` });
        break;
      }
    }
  }

  // Reply-to mismatch (from headers)
  if (hasHeaders && headers["reply-to"]) {
    const replyTo = headers["reply-to"].toLowerCase();
    const fromDomain = (sender.match(/@([^\s>]+)/)?.[1] || "").toLowerCase();
    const replyDomain = replyTo.match(/@([^\s>]+)/)?.[1] || "";
    if (fromDomain && replyDomain && fromDomain !== replyDomain) {
      score += 20; reasons.push("Reply-To domain mismatch");
      indicators.push({ name: "Reply-To mismatch", severity: "HIGH", description: "Reply-To domain differs from From domain." });
    }
    checksPerformed.push("Reply-To analysis");
  } else if (raw.rawHeaders) {
    checksPerformed.push("Reply-To analysis");
  }

  // SPF/DKIM/DMARC only if headers present
  if (hasHeaders) {
    const authResults = headers["authentication-results"] || headers["received-spf"] || "";
    if (authResults) {
      if (/spf=fail/i.test(authResults)) { score += 15; reasons.push("SPF fail"); indicators.push({ name: "SPF failure", severity: "HIGH", description: "SPF authentication failed." }); }
      if (/dkim=fail/i.test(authResults)) { score += 15; reasons.push("DKIM fail"); indicators.push({ name: "DKIM failure", severity: "HIGH", description: "DKIM signature failed." }); }
      if (/dmarc=fail/i.test(authResults)) { score += 20; reasons.push("DMARC fail"); indicators.push({ name: "DMARC failure", severity: "HIGH", description: "DMARC policy failed." }); }
      checksPerformed.push("SPF/DKIM/DMARC analysis");
    } else {
      checksUnavailable.push("SPF/DKIM/DMARC (no authentication-results header)");
    }
  } else {
    checksUnavailable.push("SPF/DKIM/DMARC (no raw headers provided)");
  }

  // --- Subject analysis ---
  if (/urgent|immediately|suspended|locked|action required|verify now|account (closed|suspended)/i.test(lowerSubject)) {
    score += 15; reasons.push("Urgent/threatening subject");
    indicators.push({ name: "Urgent subject", severity: "MEDIUM", description: "Subject uses urgency or threat language." });
  }
  if (/password|login|credentials|otp|one.?time/i.test(lowerSubject)) {
    score += 15; reasons.push("Credential-related subject");
    indicators.push({ name: "Credential subject", severity: "MEDIUM", description: "Subject references credentials." });
  }

  // --- Body content analysis ---
  if (/click (here|below|the link)|verify (your )?(account|identity|email)/i.test(lowerBody)) {
    score += 20; reasons.push("Credential harvesting phrasing");
    indicators.push({ name: "Credential harvesting phrasing", severity: "HIGH", description: "Body asks user to verify account." });
  }
  if (/password|login|credentials/i.test(lowerBody)) {
    score += 20; reasons.push("Credential request");
    indicators.push({ name: "Credential request", severity: "HIGH", description: "Body requests password/login info." });
    // Composite: credential request + action link = strong phishing
    if (/click (here|below|the link)|reset your password|enter your (current )?(password|credentials)/i.test(lowerBody)) {
      score += 20; reasons.push("Credential harvesting with action prompt (strong phishing signal)");
      indicators.push({ name: "Credential+action combo", severity: "CRITICAL", description: "Credential request combined with an action prompt is a strong phishing signal." });
    }
  }
  if (/otp|one.?time (password|code|pin)/i.test(lowerBody)) {
    score += 45; reasons.push("OTP request");
    indicators.push({ name: "OTP harvesting", severity: "CRITICAL", description: "Body requests a one-time code - high-confidence phishing indicator." });
    // Composite signal: OTP + verification phrasing = definitive phishing
    if (/verify (your )?(account|identity|email)|click (here|below|the link)/i.test(lowerBody)) {
      score += 15; reasons.push("OTP combined with verification request (definitive phishing)");
      indicators.push({ name: "OTP+verify combo", severity: "CRITICAL", description: "OTP request combined with account verification is a definitive phishing pattern." });
    }
  }
  if (/bank (account|details)|ifsc|upi|transfer|wire transfer|routing number/i.test(lowerBody)) {
    score += 18; reasons.push("Banking fraud indicators");
    indicators.push({ name: "Banking fraud indicators", severity: "HIGH", description: "Body references banking details." });
  }
  if (/congratulations|you (won|have won)|lottery|prize|gift card/i.test(lowerBody)) {
    score += 25; reasons.push("Lottery/prize scam");
    indicators.push({ name: "Prize/lottery scam", severity: "HIGH", description: "Body promises a prize or lottery win." });
  }
  if (/invoice|payment (due|overdue|failed)|unpaid/i.test(lowerBody)) {
    score += 12; reasons.push("Fake invoice/payment demand");
    indicators.push({ name: "Invoice/payment lure", severity: "MEDIUM", description: "Body references invoices or payments." });
  }
  if (/package|delivery|shipment|tracking/i.test(lowerBody) && /click|verify|confirm/i.test(lowerBody)) {
    score += 15; reasons.push("Fake delivery notification");
    indicators.push({ name: "Delivery scam", severity: "MEDIUM", description: "Delivery-themed phishing lure." });
  }
  if (/urgent|immediately|within \d+ (hours|minutes|days)/i.test(lowerBody)) {
    score += 10; reasons.push("Urgency language");
    indicators.push({ name: "Urgency language", severity: "LOW", description: "Body pressures immediate action." });
  }
  if (/noreply|no-reply/i.test(lowerSender) && /urgent|verify|password/i.test(lowerBody)) {
    score += 8; reasons.push("Noreply sender with urgent request");
    indicators.push({ name: "Noreply + urgent", severity: "LOW", description: "Noreply sender combined with urgent request." });
  }

  // --- Attachments ---
  for (const a of raw.attachments || []) {
    if (RISKY_EXT.some((e) => a.toLowerCase().endsWith(e))) {
      score += 25; reasons.push(`Risky attachment: ${a}`);
      indicators.push({ name: "Risky attachment", severity: "HIGH", description: `Attachment ${a} has a risky extension.` });
    }
  }

  // --- Link extraction & analysis ---
  const urls = extractUrls(body);
  const extractedUrls = urls;
  if (urls.length) {
    score += Math.min(20, 6 * urls.length);
    reasons.push(`${urls.length} link(s) in body`);
    indicators.push({ name: "Embedded links", severity: urls.length > 3 ? "MEDIUM" : "LOW", description: `${urls.length} link(s) found in email body.` });
  }

  // Visible text vs href mismatch
  const linkTextRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let lm;
  while ((lm = linkTextRe.exec(body)) !== null) {
    const text = lm[1].toLowerCase();
    const href = lm[2].toLowerCase();
    // if text looks like a domain/url but differs from href domain
    const textDomain = text.match(/([a-z0-9.-]+\.[a-z]{2,})/)?.[1];
    const hrefHost = (() => { try { return new URL(href).hostname; } catch { return ""; } })();
    if (textDomain && hrefHost && !hrefHost.includes(textDomain) && !textDomain.includes(hrefHost)) {
      score += 25; reasons.push("Link text/domain mismatch");
      indicators.push({ name: "Link text mismatch", severity: "HIGH", description: `Visible link text "${textDomain}" differs from destination "${hrefHost}".` });
    }
  }

  // Analyze each extracted URL with URL engine (cap to avoid heavy work)
  const urlResults: { url: string; score: number; classification: string }[] = [];
  for (const u of urls.slice(0, 5)) {
    try {
      const r = analyzeUrl(u);
      urlResults.push({ url: u, score: r.riskScore, classification: r.classification });
      if (r.classification === "MALICIOUS") { score += 30; reasons.push(`Malicious link: ${u}`); indicators.push({ name: "Malicious embedded URL", severity: "CRITICAL", description: `Embedded URL classified as malicious (score ${r.riskScore}).` }); }
      else if (r.classification === "SUSPICIOUS") { score += 12; reasons.push(`Suspicious link: ${u}`); indicators.push({ name: "Suspicious embedded URL", severity: "MEDIUM", description: `Embedded URL classified as suspicious (score ${r.riskScore}).` }); }
    } catch { /* skip */ }
  }
  checksPerformed.push("Embedded URL analysis");

  score = clamp(score);

  const classification = score >= 75 ? "MALICIOUS" : score >= 25 ? "SUSPICIOUS" : "SAFE";
  const threatCategory = classification === "SAFE" ? null : "PHISHING_EMAIL";
  const confidence = Math.min(1, 0.45 + score / 180);

  const domainInfo = {
    sender,
    subject,
    urlCount: urls.length,
    urlResults,
    hasHeaders,
    hasAttachments: (raw.attachments || []).length > 0,
  };

  return makeResult({
    riskScore: score,
    classification,
    threatCategory,
    confidence,
    reasons: reasons.length ? reasons : ["No phishing indicators detected"],
    indicators: indicators.length ? indicators : [{ name: "No indicators", severity: "LOW", description: "No phishing indicators detected in the checks performed." }],
    extractedUrls,
    domainInfo,
    checksPerformed,
    checksUnavailable,
    threatIntelSources,
    recommendedAction: recommendedAction(classification),
  });
}