import { describe, test, expect } from 'vitest'
import { analyzeQr, decodeQrFromImage } from '@/lib/detection/qr'
import fs from 'fs'
import path from 'path'

// Use the real QR code test assets shipped with qrcode-reader
const QR_SAMPLE_PNG = path.resolve('node_modules/qrcode-reader/test/image.png')
const QR_SAMPLE_PNG2 = path.resolve('node_modules/qrcode-reader/test/image-zxing.png')

function toDataUri(filePath: string, mime = 'image/png'): string {
  const buf = fs.readFileSync(filePath)
  return `data:${mime};base64,${buf.toString('base64')}`
}

describe('QR Code Detection Engine', () => {

  // ── Decode function ─────────────────────────────────────────────────────────
  describe('decodeQrFromImage', () => {
    test('decodes a valid PNG QR code and returns the payload string', async () => {
      const b64 = toDataUri(QR_SAMPLE_PNG)
      const result = await decodeQrFromImage(b64)
      expect(typeof result).toBe('string')
      expect(result!.length).toBeGreaterThan(0)
    })

    test('decodes the zxing-style PNG sample', async () => {
      const b64 = toDataUri(QR_SAMPLE_PNG2)
      const result = await decodeQrFromImage(b64)
      expect(result).not.toBeNull()
    })

    test('returns null for a non-QR image (plain white PNG)', async () => {
      // 1×1 white pixel PNG (smallest valid PNG)
      const whitePixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg=='
      const result = await decodeQrFromImage(whitePixel)
      expect(result).toBeNull()
    })

    test('returns null for a corrupt / empty payload', async () => {
      const result = await decodeQrFromImage('data:image/png;base64,aaaa')
      expect(result).toBeNull()
    })
  })

  // ── analyzeQr: undecodable images ───────────────────────────────────────────
  describe('analyzeQr — undecodable image', () => {
    test('returns SAFE with score 0 for a non-QR image (not flagged as SUSPICIOUS)', async () => {
      const whitePixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg=='
      const result = await analyzeQr(whitePixel)
      expect(result).toBeDefined()
      // Undecodable images should NOT be flagged as QR_UNDECODABLE SUSPICIOUS anymore
      expect(result.threatCategory).not.toBe('QR_UNDECODABLE')
      expect(result.riskScore).toBeLessThan(25)
    })
  })

  // ── analyzeQr: real QR payloads ─────────────────────────────────────────────
  describe('analyzeQr — real QR images', () => {
    test('analyzes a real QR code and returns a full DetectionResult', async () => {
      const b64 = toDataUri(QR_SAMPLE_PNG)
      const result = await analyzeQr(b64)
      expect(result).toBeDefined()
      expect(result.classification).toMatch(/^(SAFE|SUSPICIOUS|MALICIOUS)$/)
      expect(typeof result.riskScore).toBe('number')
      expect(result.reasons.length).toBeGreaterThan(0)
      expect(result.checksPerformed.length).toBeGreaterThan(0)
    })
  })

  // ── analyzeQr: URL payload simulation ───────────────────────────────────────
  describe('analyzeQr — inline URL string (legacy path)', () => {
    test('when passed a raw URL string it delegates to URL analysis', async () => {
      const result = await analyzeQr('https://example.com')
      expect(result).toBeDefined()
      expect(result.classification).toBeDefined()
    })
  })
})
