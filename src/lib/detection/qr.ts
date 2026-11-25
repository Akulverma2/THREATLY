import {
  DetectionResult,
  makeResult,
  classifyScore,
  recommendedAction,
  clamp,
} from "./base";
import { analyzeUrl } from "./url";
import jsQR from "jsqr";
import sharp from "sharp";

// ─── Image decoding ───────────────────────────────────────────────────────────
// strip the data-URI prefix and return raw binary buffer
function b64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64.replace(/^data:image\/[^;]+;base64,/, ""), "base64");
}

interface RawImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

// Decode any browser-supported image format (PNG, JPEG, WEBP, GIF, TIFF, HEIF…)
// into raw RGBA using sharp.  Falls back to null on error.
async function decodeToRGBA(buf: Buffer): Promise<RawImage | null> {
  try {
    const { data, info } = await sharp(buf)
      .ensureAlpha()          // guarantee 4-channel RGBA output
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
  } catch {
    return null;
  }
}

// Return a grayscale-normalised RGBA image (all R=G=B=luminance) so jsQR's
// adaptive thresholder works even on colored QR codes (yellow, cyan, etc.).
function normalizeGrayscale(img: RawImage): RawImage {
  const out = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < img.data.length; i += 4) {
    // ITU-R BT.709 luma coefficients – same as sharp/jsQR default grayscale
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

// Stretch histogram so that the darkest pixel → 0 and brightest → 255.
// This rescues very low-contrast or washed-out images.
function stretchContrast(img: RawImage): RawImage {
  // Work on the first channel only (gray after normalizeGrayscale)
  let min = 255;
  let max = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i] < min) min = img.data[i];
    if (img.data[i] > max) max = img.data[i];
  }
  if (max === min) return img; // solid color – nothing to stretch
  const range = max - min;
  const out = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.round(((img.data[i] - min) / range) * 255);
    out[i] = out[i + 1] = out[i + 2] = v;
    out[i + 3] = 255;
  }
  return { data: out, width: img.width, height: img.height };
}

// Add a white quiet-zone border (4 modules wide by default).
// Tight crops without a quiet zone confuse jsQR's finder-pattern locator.
function addQuietZone(buf: Buffer, padPx: number = 20): Promise<Buffer> {
  return sharp(buf)
    .extend({
      top: padPx,
      bottom: padPx,
      left: padPx,
      right: padPx,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();
}

// Try jsQR with both normal and inverted modes for each image variant
function tryJsQR(img: RawImage): string | null {
  const a = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
  return a?.data ?? null;
}

// ─── Main decode function ─────────────────────────────────────────────────────
export async function decodeQrFromImage(b64: string): Promise<string | null> {
  const buf = b64ToBuffer(b64);

  // ── Strategy 1: direct RGBA from sharp ──────────────────────────────────────
  const img1 = await decodeToRGBA(buf);
  if (img1) {
    const r1 = tryJsQR(img1);
    if (r1 !== null) return r1;

    // ── Strategy 2: greyscale normalisation ───────────────────────────────────
    const gray = normalizeGrayscale(img1);
    const r2 = tryJsQR(gray);
    if (r2 !== null) return r2;

    // ── Strategy 3: greyscale + contrast stretch ───────────────────────────────
    const stretched = stretchContrast(gray);
    const r3 = tryJsQR(stretched);
    if (r3 !== null) return r3;
  }

  // ── Strategy 4: add white quiet-zone border then re-decode ──────────────────
  try {
    const padded = await addQuietZone(buf);
    const img4 = await decodeToRGBA(padded);
    if (img4) {
      const r4 = tryJsQR(img4);
      if (r4 !== null) return r4;

      const gray4 = normalizeGrayscale(img4);
      const r4b = tryJsQR(gray4);
      if (r4b !== null) return r4b;

      const r4c = tryJsQR(stretchContrast(gray4));
      if (r4c !== null) return r4c;
    }
  } catch {
    // quiet-zone padding failed – ignore and fall through
  }

  // ── Strategy 5: auto-rotate then re-decode (sharp can read EXIF orientation)
  try {
    const rotated = await sharp(buf).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const img5: RawImage = { data: new Uint8ClampedArray(rotated.data), width: rotated.info.width, height: rotated.info.height };
    const r5 = tryJsQR(img5);
    if (r5 !== null) return r5;
    const r5b = tryJsQR(stretchContrast(normalizeGrayscale(img5)));
    if (r5b !== null) return r5b;
  } catch {
    // rotation failed
  }

  return null;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────
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

  // ── URL payload → full URL analysis ─────────────────────────────────────────
  if (/^https?:\/\//i.test(payload) || /^[a-z0-9.-]+\.[a-z]{2,}/i.test(payload)) {
    const urlResult = analyzeUrl(payload.startsWith("http") ? payload : "http://" + payload);
    return {
      ...urlResult,
      threatCategory: urlResult.threatCategory ?? "QUISHING",
      reasons: [`QR payload: ${payload}`, ...urlResult.reasons],
      extractedUrls: [payload],
    };
  }

  // ── Non-URL payload (WiFi, vCard, raw text, etc.) ───────────────────────────
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
