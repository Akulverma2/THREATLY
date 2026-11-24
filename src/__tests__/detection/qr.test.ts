import { describe, test, expect } from 'vitest'
import { analyzeQr } from '@/lib/detection/qr'

describe('QR Code Detection Engine', () => {
  test('analyzeQr function runs without throwing', () => {
    // The function attempts to decode base64 PNG using jsQR and pngjs.
    // Without a valid image, it should return a result object, not throw.
    const result = analyzeQr('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAABCA...')
    expect(result).toBeDefined()
    expect(result.classification).toBeDefined()
  })

  test('analyzeQr with URL payload', () => {
    // When payload is a URL, it should delegate to analyzeUrl
    // This tests the function doesn't crash on URL-type payloads
    const result = analyzeQr('https://example.com')
    expect(result).toBeDefined()
  })
})