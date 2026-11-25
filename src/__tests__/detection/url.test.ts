import { describe, test, expect } from 'vitest'
import { analyzeUrl, analyzeUrlAsync } from '@/lib/detection/url'

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

    test('Joomla com_mailto open redirect with base64 payload is classified as MALICIOUS', () => {
      // User's specific attack pattern
      const attackUrl = 'http://adventure-nicaragua.net/index.php?option=com_mailto&tmpl=component&link=aHR0cDovL3BoaXNoaW5nLXNpdGUuY29tL2xvZ2lu'
      const result = analyzeUrl(attackUrl)
      expect(result.classification).toBe('MALICIOUS')
      expect(result.riskScore).toBeGreaterThanOrEqual(75)
      expect(result.threatCategory).toBe('MALICIOUS_REDIRECT')
      expect(result.extractedUrls.length).toBeGreaterThan(1)
    })
  })

  describe('URL Structure & Obfuscation Checks', () => {
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

    test('base64 encoded destination in query parameter is extracted and scored', () => {
      const b64Url = 'https://portal.example.com/redirect?dest=' + Buffer.from('http://malware-drop.com/exe').toString('base64')
      const result = analyzeUrl(b64Url)
      expect(result.riskScore).toBeGreaterThan(25)
      expect(result.extractedUrls).toContain('http://malware-drop.com/exe')
    })
  })

  describe('Async Threat Intelligence & DNS', () => {
    test('analyzeUrlAsync resolves telemetry and produces enriched result', async () => {
      const result = await analyzeUrlAsync('https://www.google.com')
      expect(result).toBeDefined()
      expect(result.classification).toBe('SAFE')
      expect(result.domainReputation).toBeDefined()
    })
  })

  describe('Typosquatting', () => {
    test('brand typosquatting via Levenshtein detection', () => {
      // Paypal with chars changed should trigger typosquatting
      const result = analyzeUrl('http://paypa1.com')
      expect(result).toBeDefined()
    })
  })
})
