import { describe, test, expect } from "vitest";
import { analyzeQr, decodeQrFromImage, analyzeUpiPayment, analyzeQrPayload } from "@/lib/detection/qr";
import fs from "fs";
import path from "path";

// Real QR image assets shipped with qrcode-reader
const QR_SAMPLE_PNG  = path.resolve("node_modules/qrcode-reader/test/image.png");
const QR_SAMPLE_PNG2 = path.resolve("node_modules/qrcode-reader/test/image-zxing.png");

function toDataUri(filePath: string, mime = "image/png"): string {
  return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

// ─── Helper: minimal 1×1 white PNG (not a QR) ────────────────────────────────
const WHITE_PIXEL_B64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==";

// ─── analyzeUpiPayment (synchronous unit tests) ───────────────────────────────
describe("analyzeUpiPayment — UPI URI parser & security checks", () => {

  // 1. Valid UPI payment URI
  test("1. valid UPI URI → UPI_PAYMENT_QR, SAFE, extracts all fields", () => {
    const uri = "upi://pay?pa=merchant@okaxis&pn=Example%20Store&am=500&cu=INR&mc=5411&tr=TXN001&tn=Coffee&mode=02";
    const r = analyzeUpiPayment(uri);
    expect(r.threatCategory).toBe("UPI_PAYMENT_QR");
    expect(r.classification).toBe("SAFE");
    expect(r.riskScore).toBeLessThan(25);
    expect(r.upiInfo).not.toBeNull();
    expect(r.upiInfo!.payeeId).toBe("merchant@okaxis");
    expect(r.upiInfo!.payeeName).toBe("Example Store");
    expect(r.upiInfo!.amount).toBe("500");
    expect(r.upiInfo!.currency).toBe("INR");
    expect(r.upiInfo!.merchantCategoryCode).toBe("5411");
    expect(r.upiInfo!.transactionRef).toBe("TXN001");
    expect(r.upiInfo!.transactionNote).toBe("Coffee");
    expect(r.upiInfo!.mode).toBe("02");
  });

  // 2. Google Pay-style UPI QR — app NOT verified from UPI suffix alone
  test("2. GPay-style UPI ID suffix (@okaxis) does NOT identify app as Google Pay without orgid", () => {
    const r = analyzeUpiPayment("upi://pay?pa=shop@okaxis&pn=ShopName&am=100&cu=INR");
    expect(r.upiInfo!.detectedApp).toMatch(/not independently verified/i);
    expect(r.upiInfo!.detectedApp).not.toBe("Google Pay");
  });

  // 2b. orgid=gpay DOES identify as Google Pay
  test("2b. orgid=gpay explicitly → detectedApp is 'Google Pay'", () => {
    const r = analyzeUpiPayment("upi://pay?pa=shop@okicici&pn=ShopName&am=100&cu=INR&orgid=gpay");
    expect(r.upiInfo!.detectedApp).toBe("Google Pay");
  });

  // 3. Missing payee name — optional, should not block analysis
  test("3. missing payee name (pn) → payeeName is null, still analyses OK", () => {
    const r = analyzeUpiPayment("upi://pay?pa=user@upi&am=50&cu=INR");
    expect(r.upiInfo!.payeeName).toBeNull();
    expect(r.threatCategory).toBe("UPI_PAYMENT_QR");
  });

  // 4. Missing amount — optional field
  test("4. missing amount (am) → amount is null, SAFE base score", () => {
    const r = analyzeUpiPayment("upi://pay?pa=user@upi&pn=Bob&cu=INR");
    expect(r.upiInfo!.amount).toBeNull();
    expect(r.riskScore).toBeLessThan(25);
  });

  // 5. Invalid amount (non-numeric)
  test("5. invalid amount 'abc' → SUSPICIOUS, 'Invalid Amount' indicator", () => {
    const r = analyzeUpiPayment("upi://pay?pa=user@upi&am=abc&cu=INR");
    expect(r.classification).toMatch(/SUSPICIOUS|MALICIOUS/);
    expect(r.indicators.some(i => i.name === "Invalid Amount")).toBe(true);
  });

  // 6. Invalid currency (non-INR)
  test("6. currency=USD → score increases, non-INR indicator present", () => {
    const r = analyzeUpiPayment("upi://pay?pa=user@upi&am=100&cu=USD");
    expect(r.riskScore).toBeGreaterThan(5);
    expect(r.reasons.some(r => /Non-standard currency/i.test(r))).toBe(true);
  });

  // 7. URL-encoded merchant name decoded correctly
  test("7. URL-encoded pn decoded correctly (spaces, special chars)", () => {
    const r = analyzeUpiPayment("upi://pay?pa=shop@paytm&pn=Acme%20Caf%C3%A9%20%26%20Co&cu=INR");
    expect(r.upiInfo!.payeeName).toContain("Acme");
    // No XSS concerns from URL-encoded chars
    expect(r.upiInfo!.payeeName).not.toContain("<");
  });

  // 8. Malformed URI (not parseable by URL constructor)
  test("8. malformed URI → SUSPICIOUS, upiInfo is null", () => {
    const r = analyzeUpiPayment("upi://:::bad uri:::");
    expect(r.classification).toBe("SUSPICIOUS");
    expect(r.upiInfo).toBeNull();
    expect(r.reasons[0]).toMatch(/Malformed UPI URI/i);
  });

  // 12. Unexpected external URL in a parameter
  test("12. external URL in 'tn' param → HIGH indicator, score elevated", () => {
    const r = analyzeUpiPayment("upi://pay?pa=user@upi&tn=Check%20https://evil.com/steal&cu=INR");
    expect(r.indicators.some(i => i.name === "Embedded URL in UPI Parameter")).toBe(true);
    expect(r.riskScore).toBeGreaterThan(25);
  });

  // 13. Script-like content in metadata
  test("13. <script> in pn → CRITICAL indicator, MALICIOUS or high score", () => {
    const r = analyzeUpiPayment("upi://pay?pa=user@upi&pn=%3Cscript%3Ealert(1)%3C/script%3E&cu=INR");
    expect(r.indicators.some(i => i.name === "Script Injection Attempt")).toBe(true);
    expect(r.riskScore).toBeGreaterThan(40);
  });

  // Large amount triggers warning
  test("very large amount (₹200000) → MEDIUM indicator present", () => {
    const r = analyzeUpiPayment("upi://pay?pa=user@upi&am=200000&cu=INR");
    expect(r.indicators.some(i => i.name === "Unusually Large Amount")).toBe(true);
  });

  // Phishing keywords in payee name
  test("phishing keyword in pn ('KYC Verification') → SUSPICIOUS score", () => {
    const r = analyzeUpiPayment("upi://pay?pa=gov@upi&pn=KYC%20Verification%20Department&cu=INR");
    expect(r.riskScore).toBeGreaterThan(25);
    expect(r.indicators.some(i => /phishing keywords/i.test(i.name))).toBe(true);
  });
});

// ─── analyzeQrPayload: routing tests ──────────────────────────────────────────
describe("analyzeQrPayload — routing and dispatch", () => {

  // 9. Ordinary HTTP URL passed as payload string routes to URL engine
  test("9. http:// payload → delegates to URL engine (not UPI_PAYMENT_QR)", () => {
    const r = analyzeQrPayload("https://example.com");
    expect(r.threatCategory).not.toBe("UPI_PAYMENT_QR");
    expect(r.extractedUrls).toContain("https://example.com");
  });

  // 10. WiFi QR payload
  test("10. WiFi QR payload → non-UPI path, WiFi reason present", () => {
    const r = analyzeQrPayload("WIFI:T:WPA;S:MyNetwork;P:password123;;");
    expect(r.threatCategory).not.toBe("UPI_PAYMENT_QR");
    expect(r.reasons.some(r => /wifi/i.test(r))).toBe(true);
  });

  // 11. vCard payload
  test("11. vCard QR payload → non-UPI path, vCard reason present", () => {
    const r = analyzeQrPayload("BEGIN:VCARD\nFN:John Doe\nEND:VCARD");
    expect(r.threatCategory).not.toBe("UPI_PAYMENT_QR");
    expect(r.reasons.some(r => /vcard/i.test(r))).toBe(true);
  });
});

// ─── decodeQrFromImage (image-based decoding) ─────────────────────────────────
describe("decodeQrFromImage — multi-format decoder", () => {

  test("decodes a valid PNG QR and returns a string payload", async () => {
    const r = await decodeQrFromImage(toDataUri(QR_SAMPLE_PNG));
    expect(typeof r).toBe("string");
    expect(r!.length).toBeGreaterThan(0);
  });

  test("decodes the zxing-style PNG sample", async () => {
    const r = await decodeQrFromImage(toDataUri(QR_SAMPLE_PNG2));
    expect(r).not.toBeNull();
  });

  test("returns null for a non-QR image", async () => {
    expect(await decodeQrFromImage(WHITE_PIXEL_B64)).toBeNull();
  });

  test("returns null for corrupt/empty data", async () => {
    expect(await decodeQrFromImage("data:image/png;base64,aaaa")).toBeNull();
  });
});

// ─── analyzeQr: full pipeline with real images ────────────────────────────────
describe("analyzeQr — real QR image pipeline", () => {

  // 14. Existing QR detection regression — real QR PNG still works
  test("14. real QR PNG → produces a full DetectionResult (regression)", async () => {
    const r = await analyzeQr(toDataUri(QR_SAMPLE_PNG));
    expect(r).toBeDefined();
    expect(r.classification).toMatch(/^(SAFE|SUSPICIOUS|MALICIOUS)$/);
    expect(typeof r.riskScore).toBe("number");
    expect(r.checksPerformed.length).toBeGreaterThan(0);
  });

  test("undecodable image → SAFE (score 0), no QR_UNDECODABLE SUSPICIOUS flag", async () => {
    const r = await analyzeQr(WHITE_PIXEL_B64);
    expect(r.riskScore).toBe(0);
    expect(r.classification).toBe("SAFE");
    expect(r.threatCategory).not.toBe("QR_UNDECODABLE");
  });
});
