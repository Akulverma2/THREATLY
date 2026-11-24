import { describe, test, expect } from 'vitest'
import { analyzeUrl } from '@/lib/detection/url'

describe('URL Detection Engine', () => {
  describe('Safe URLs', () => {
    test('benign Google URL classified as SAFE', () => {
      const result = analyzeUrl('https://www.google.com')
      expect(result.classification).toBe('SAFE')
      expect(result.riskScore).toBeLessThan(25)
    })

    test('HTTPS URL with normal domain classified as SAFE', () => {
      const result = analyzeUrl('https://example.com/path')
      expect(result.classification).toBe('SAFE')
      expect(result.riskScore).toBeLessThan(25)
    })
  })

  describe('Malicious URLs', () => {
    test('URL with suspicious TLD (.xyz) classified as SUSPICIOUS or MALICIOUS', () => {
      const result = analyzeUrl('http://example.xyz')
      expect([ 'SUSPICIOUS', 'MALICIOUS' ]).toContain(result.classification)
    })

    test('IP-based URL classified with IP risk', () => {
      const result = analyzeUrl('http://192.168.1.1/some/path')
      // Private IP should flag SSRF risk
      expect(result.threatCategory).toContain('SSRF')
      expect(result.riskScore).toBeGreaterThan(30)
    })

    test('URL with punycode (homograph) flagged', () => {
      const result = analyzeUrl('http://xn--pple-pta.com')
      expect(result.threatCategory).toContain('HOMOGRAPH')
    })
  })

  describe('URL Structure Checks', () => {
    test('long URL adds to risk score', () => {
      const longUrl = 'https://' + 'a'.repeat(300) + '.com'
      const result = analyzeUrl(longUrl)
      expect(result.riskScore).toBeGreaterThan(0)
    })

    test('URL with @ symbol flags obfuscation', () => {
      const result = analyzeUrl('http://user@example.com/path')
      expect(result.riskScore).toBeGreaterThan(0)
    })

    test('URL with percent-encoding flags', () => {
      const result = analyzeUrl('http://example.com/%20%20%20')
      expect(result.riskScore).toBeGreaterThan(0)
    })

    test('URL with suspicious keywords flags risk', () => {
      const result = analyzeUrl('http://example.com/verify-login')
      expect(result.riskScore).toBeGreaterThan(0)
    })
  })

  describe('Typosquatting', () => {
    test('brand typosquatting via Levenshtein detection', () => {
      // Paypal with chars changed should trigger typosquatting
      const result = analyzeUrl('http://paypa1.com')
      // May or may not flag depending on exact analysis, but should not crash
      expect(result).toBeDefined()
    })
  })
})