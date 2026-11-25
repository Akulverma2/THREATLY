import {
  DetectionResult,
  Indicator,
  UpiPaymentInfo,
  makeResult,
  classifyScore,
  recommendedAction,
  clamp,
} from "./base";
import { analyzeUrl } from "./url";
import jsQR from "jsqr";
import sharp from "sharp";

// ─── Image decoding ───────────────────────────────────────────────────────────

function b64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64.replace(/^data:image\/[^;]+;base64,/, ""), "base64");
}

interface RawImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

async function decodeToRGBA(buf: Buffer): Promise<RawImage | null> {
  try {
    const { data, info } = await sharp(buf)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
  } catch {
    return null;
  }
}

/** ITU-R BT.709 luma — converts coloured RGBA to greyscale RGBA */
function normalizeGrayscale(img: RawImage): RawImage {
  const out = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < img.data.length; i += 4) {
    const L = Math.round(
      0.2126 * img.data[i] +
      0.7152 * img.data[i + 1] +
      0.0722 * img.data[i + 2]
    );
    out[i] = out[i + 1] = out[i + 2] = L;
    out[i + 3] = 255;
  }
  return { data: out, width: img.width, height: img.height };
}

/** Stretch histogram min→0, max→255 to rescue low-contrast images */
function stretchContrast(img: RawImage): RawImage {
  let min = 255, max = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i] < min) min = img.data[i];
    if (img.data[i] > max) max = img.data[i];
  }
  if (max === min) return img;
  const range = max - min;
  const out = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.round(((img.data[i] - min) / range) * 255);
    out[i] = out[i + 1] = out[i + 2] = v;
    out[i + 3] = 255;
  }
  return { data: out, width: img.width, height: img.height };
}

function addQuietZone(buf: Buffer, padPx = 20): Promise<Buffer> {
  return sharp(buf)
    .extend({ top: padPx, bottom: padPx, left: padPx, right: padPx, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
}

function tryJsQR(img: RawImage): string | null {
  return jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

// ─── Multi-strategy QR decode ─────────────────────────────────────────────────

export async function decodeQrFromImage(b64: string): Promise<string | null> {
  const buf = b64ToBuffer(b64);

  // Strategy 1 — direct RGBA
  const img1 = await decodeToRGBA(buf);
  if (img1) {
    const r1 = tryJsQR(img1);           if (r1 !== null) return r1;
    const gray = normalizeGrayscale(img1);
    const r2 = tryJsQR(gray);           if (r2 !== null) return r2;
    const r3 = tryJsQR(stretchContrast(gray)); if (r3 !== null) return r3;
  }

  // Strategy 4 — add white quiet-zone border
  try {
    const padded = await addQuietZone(buf);
    const img4 = await decodeToRGBA(padded);
    if (img4) {
      const r4 = tryJsQR(img4);                              if (r4 !== null) return r4;
      const g4 = normalizeGrayscale(img4);
      const r4b = tryJsQR(g4);                               if (r4b !== null) return r4b;
      const r4c = tryJsQR(stretchContrast(g4));              if (r4c !== null) return r4c;
    }
  } catch { /* ignore */ }

  // Strategy 5 — EXIF auto-rotate
  try {
    const { data, info } = await sharp(buf).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const img5: RawImage = { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
    const r5 = tryJsQR(img5);
    if (r5 !== null) return r5;
    const r5b = tryJsQR(stretchContrast(normalizeGrayscale(img5)));
    if (r5b !== null) return r5b;
  } catch { /* ignore */ }

  return null;
}

// ─── UPI Payment URI analysis ─────────────────────────────────────────────────

/** Standard UPI Virtual Payment Address: localpart@handle */
const UPI_ID_RE = /^[a-zA-Z0-9._\-+]+@[a-zA-Z]{3,}$/;

/**
 * Sanitise a raw string extracted from a UPI parameter.
 * Removes characters that could cause HTML/script injection.
 * Values are NEVER rendered as HTML — this is defence-in-depth.
 */
function sanitizeParam(val: string | null): string | null {
  if (val === null) return null;
  // Strip control chars and common XSS vectors
  return val.replace(/[<>"'`]/g, "").slice(0, 512);
}

export function analyzeUpiPayment(uri: string): DetectionResult {
  const indicators: Indicator[] = [];
  const reasons: string[] = [];
  let score = 5; // UPI QR is not inherently suspicious

  // ── Parse the URI ───────────────────────────────────────────────────────────
  let uriObj: URL;
  try {
    uriObj = new URL(uri);
  } catch {
    return makeResult({
      riskScore: 50,
      classification: "SUSPICIOUS",
      threatCategory: "UPI_PAYMENT_QR",
      confidence: 0.7,
      reasons: ["Malformed UPI URI — could not parse payment parameters"],
      indicators: [{ name: "Malformed UPI URI", severity: "HIGH", description: "The QR payload begins with 'upi://' but could not be parsed as a valid URI. It may be corrupted or crafted to evade analysis." }],
      checksPerformed: ["UPI URI structure validation"],
      recommendedAction: "Do not make any payment. Verify the QR code with the merchant directly.",
      upiInfo: null,
    });
  }

  // ── Extract RAW params first (before sanitising) for security checks ────────
  const sp = uriObj.searchParams;
  const rawPa    = sp.get("pa");
  const rawPn    = sp.get("pn");
  const rawAm    = sp.get("am");
  const rawCu    = sp.get("cu");
  const rawMc    = sp.get("mc");
  const rawTr    = sp.get("tr");
  const rawTn    = sp.get("tn");
  const rawMode  = sp.get("mode");
  const rawOrgId = sp.get("orgid");

  const allRawValues = [rawPa, rawPn, rawAm, rawCu, rawMc, rawTr, rawTn, rawMode, rawOrgId].filter(Boolean) as string[];

  // ── Security check: script injection (checked on raw values before sanitising)
  const SCRIPT_RE = /<script|javascript:|on\w+\s*=/i;
  const scriptHit = allRawValues.some(v => SCRIPT_RE.test(v));
  if (scriptHit) {
    score += 50;
    reasons.push("Script-like injection content detected in UPI parameters");
    indicators.push({ name: "Script Injection Attempt", severity: "CRITICAL", description: "One or more UPI parameters contain script-like content (e.g. <script>, javascript:, onerror=). This is never valid in a payment QR and strongly indicates a crafted attack." });
  }

  // ── Security check: external URL embedded in params ────────────────────────
  const URL_IN_PARAM_RE = /https?:\/\//i;
  const urlHit = allRawValues.some(v => URL_IN_PARAM_RE.test(v));
  if (urlHit) {
    score += 35;
    reasons.push("Unexpected external URL embedded in UPI parameter");
    indicators.push({ name: "Embedded URL in UPI Parameter", severity: "HIGH", description: "A UPI payment parameter contains an HTTP/HTTPS URL. Valid UPI QR codes never embed external URLs in their parameters. This may be a phishing or redirect attack." });
  }

  // ── Sanitise for display / downstream use ─────────────────────────────────
  const payeeId   = sanitizeParam(rawPa);
  const payeeName = sanitizeParam(rawPn);
  const amount    = sanitizeParam(rawAm);
  const currency  = sanitizeParam(rawCu);
  const mc        = sanitizeParam(rawMc);
  const tr        = sanitizeParam(rawTr);
  const tn        = sanitizeParam(rawTn);
  const mode      = sanitizeParam(rawMode);
  const orgId     = sanitizeParam(rawOrgId);

  // ── Payee address (pa) validation ─────────────────────────────────────────
  if (!payeeId) {
    score += 40;
    reasons.push("Missing payee UPI ID (pa parameter absent)");
    indicators.push({ name: "Missing Payee Address", severity: "HIGH", description: "The UPI QR code does not contain a payee UPI Virtual Payment Address (pa). This is a mandatory field — the QR may be incomplete or forged." });
  } else if (!UPI_ID_RE.test(payeeId)) {
    score += 30;
    reasons.push(`Malformed UPI ID: ${payeeId}`);
    indicators.push({ name: "Malformed Payee UPI ID", severity: "HIGH", description: `The payee address "${payeeId}" does not conform to the standard UPI ID format (localpart@handle). This may indicate a spoofed or corrupted QR code.` });
  }

  // ── Amount validation ──────────────────────────────────────────────────────
  if (amount !== null) {
    const amNum = Number(amount);
    if (!amount.trim() || isNaN(amNum) || amNum < 0) {
      score += 25;
      reasons.push(`Invalid payment amount: "${amount}"`);
      indicators.push({ name: "Invalid Amount", severity: "MEDIUM", description: `The 'am' parameter ("${amount}") is not a valid non-negative number. This may indicate a crafted QR code.` });
    } else if (amNum > 100000) {
      score += 20;
      reasons.push(`Very large payment amount: ₹${amNum.toLocaleString("en-IN")} — verify before proceeding`);
      indicators.push({ name: "Unusually Large Amount", severity: "MEDIUM", description: `The requested amount of ₹${amNum.toLocaleString("en-IN")} is unusually large for a standard UPI QR transaction. Confirm with the merchant before making payment.` });
    }
  }

  // ── Currency check ────────────────────────────────────────────────────────
  if (currency !== null && currency.toUpperCase() !== "INR") {
    score += 20;
    reasons.push(`Non-standard currency: "${currency}" (UPI only operates in INR)`);
    indicators.push({ name: "Non-INR Currency", severity: "MEDIUM", description: `The currency parameter is "${currency}". UPI is an India-specific payment system that exclusively processes INR. A non-INR currency field is anomalous.` });
  }

  // ── Phishing keywords in payee name ───────────────────────────────────────
  const PHISHING_KW = /\b(verify|verification|urgent|suspend|kyc|reward|prize|winning|lucky|refund|cashback|helpdesk|support|gov(ernment)?|income.?tax|refund)\b/i;
  if (payeeName && PHISHING_KW.test(payeeName)) {
    score += 25;
    reasons.push(`Suspicious keywords in payee name: "${payeeName}"`);
    indicators.push({ name: "Phishing Keywords in Payee Name", severity: "MEDIUM", description: `The payee name "${payeeName}" contains terms commonly used in UPI payment scams (fake government refunds, KYC fraud, lottery phishing).` });
  }

  // ── Determine detected payment application ────────────────────────────────
  // Policy: identify Google Pay ONLY when orgid explicitly confirms it.
  // Never infer from UPI ID suffix (@okaxis, @oksbi, etc.) per spec.
  let detectedApp = "UPI QR — payment app not independently verified";
  if (orgId?.toLowerCase() === "gpay") {
    detectedApp = "Google Pay";
  }

  score = clamp(score);
  const classification = classifyScore(score);

  const upiInfo: UpiPaymentInfo = {
    payeeId,
    payeeName,
    amount,
    currency,
    merchantCategoryCode: mc,
    transactionRef: tr,
    transactionNote: tn,
    mode,
    orgId,
    detectedApp,
    rawUri: uri.slice(0, 1024), // cap raw URI stored
  };

  const finalReasons = reasons.length
    ? reasons
    : ["Valid UPI payment QR — no anomalies detected"];

  return makeResult({
    riskScore: score,
    classification,
    threatCategory: "UPI_PAYMENT_QR",
    confidence: 0.85,
    reasons: finalReasons,
    indicators,
    checksPerformed: [
      "UPI URI structure validation",
      "Payee address format check",
      "Amount & currency validation",
      "Parameter injection safety scan",
      "Phishing keyword detection",
    ],
    recommendedAction:
      classification === "MALICIOUS"
        ? "Do not scan or pay. Report this QR code as potentially fraudulent."
        : classification === "SUSPICIOUS"
        ? "Verify the payee identity through an independent channel before making any payment."
        : "Verify recipient details before making any payment. THREATLY does not guarantee payment safety.",
    upiInfo,
  });
}

// ─── Payload routing (shared by image decoder and unit tests) ────────────────

export function analyzeQrPayload(payload: string): DetectionResult {
  // ── 1. UPI payment URI ────────────────────────────────────────────────────
  if (/^upi:\/\//i.test(payload)) {
    return analyzeUpiPayment(payload);
  }

  // ── 2. HTTP/HTTPS URL → full URL heuristic engine ─────────────────────────
  if (/^https?:\/\//i.test(payload) || /^[a-z0-9.-]+\.[a-z]{2,}/i.test(payload)) {
    const urlResult = analyzeUrl(payload.startsWith("http") ? payload : "http://" + payload);
    return {
      ...urlResult,
      threatCategory: urlResult.threatCategory ?? "QUISHING",
      reasons: [`QR payload: ${payload}`, ...urlResult.reasons],
      extractedUrls: [payload],
    };
  }

  // ── 3. Non-URL payloads (WiFi, vCard, raw text) ──────────────────────────
  const reasons: string[] = [`QR payload: ${payload.slice(0, 80)}`];
  let score = 10;
  if (/wifi:/i.test(payload))                                   { score += 15; reasons.push("WiFi credential payload"); }
  if (/begin:vcard/i.test(payload))                             { score += 10; reasons.push("vCard payload"); }
  if (/javascript:/i.test(payload) || /data:/i.test(payload))   { score += 40; reasons.push("Executable/data payload in QR"); }
  score = clamp(score);
  const classification = classifyScore(score);
  return makeResult({
    riskScore: score,
    classification,
    threatCategory: classification === "SAFE" ? null : "QUISHING",
    confidence: 0.7,
    reasons,
    recommendedAction: recommendedAction(classification),
    checksPerformed: ["QR payload analysis"],
    extractedUrls: [],
  });
}

// ─── Main analysis entry-point ────────────────────────────────────────────────

export async function analyzeQr(b64: string): Promise<DetectionResult> {
  const payload = await decodeQrFromImage(b64);

  if (!payload) {
    return makeResult({
      riskScore: 0,
      classification: "SAFE",
      threatCategory: null,
      confidence: 0.5,
      reasons: ["QR code could not be decoded — image may be corrupt, too small, or not a valid QR code"],
      recommendedAction: "Ensure the uploaded image is a clear, well-lit QR code and try again.",
      checksPerformed: ["QR decode (PNG · JPEG · WEBP · TIFF · HEIF)"],
    });
  }

  return analyzeQrPayload(payload);
}
