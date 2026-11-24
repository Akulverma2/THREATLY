import { DetectionResult, makeResult, classifyScore, recommendedAction, clamp } from "./base";
import { analyzeUrl } from "./url";
import jsQR from "jsqr";

// Decode a base64 PNG/JPEG into RGBA pixels using a canvas-less approach is not possible in Node.
// We use a lightweight PNG decoder (pngjs) to get raw pixels, then jsQR.
import { PNG } from "pngjs";

function decodeBase64Image(b64: string): { data: Uint8ClampedArray; width: number; height: number } | null {
  const buf = Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  try {
    const png = PNG.sync.read(buf);
    return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
  } catch {
    return null;
  }
}

export function decodeQrFromImage(b64: string): string | null {
  const img = decodeBase64Image(b64);
  if (!img) return null;
  const code = jsQR(img.data, img.width, img.height);
  return code?.data ?? null;
}

export function analyzeQr(b64: string): DetectionResult {
  const payload = decodeQrFromImage(b64);
  if (!payload) {
    return makeResult({ riskScore: 60, classification: "SUSPICIOUS", threatCategory: "QR_UNDECODABLE", confidence: 0.6, reasons: ["Could not decode QR code"], recommendedAction: "Verify source before scanning.", checksPerformed: ["QR decode"] });
  }
  // If payload is a URL, run URL detector
  if (/^https?:\/\//i.test(payload) || /^[a-z0-9.-]+\.[a-z]{2,}/i.test(payload)) {
    const urlResult = analyzeUrl(payload.startsWith("http") ? payload : "http://" + payload);
    return { ...urlResult, threatCategory: urlResult.threatCategory ?? "QUISHING", reasons: [`QR payload: ${payload}`, ...urlResult.reasons], extractedUrls: [payload] };
  }
  // Non-URL payloads (WiFi, vCard, etc.)
  const reasons: string[] = [`QR payload: ${payload.slice(0, 80)}`];
  let score = 10;
  if (/wifi:/i.test(payload)) { score += 15; reasons.push("WiFi credential payload"); }
  if (/begin:vcard/i.test(payload)) { score += 10; reasons.push("vCard payload"); }
  if (/javascript:/i.test(payload) || /data:/i.test(payload)) { score += 40; reasons.push("Executable/data payload in QR"); }
  score = clamp(score);
  const classification = classifyScore(score);
  return makeResult({ riskScore: score, classification, threatCategory: classification === "SAFE" ? null : "QUISHING", confidence: 0.7, reasons, recommendedAction: recommendedAction(classification), checksPerformed: ["QR payload analysis"], extractedUrls: [] });
}
