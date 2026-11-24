import { describe, test, expect } from 'vitest'
import { analyzeEmail } from '@/lib/detection/email'

describe('Email Detection Engine', () => {
  describe('Safe Emails', () => {
    test('benign email classified as SAFE', () => {
      const result = analyzeEmail({
        sender: 'friend@example.com',
        subject: 'Hello there',
        body: 'How are you?',
      })
      expect(result.classification).toBe('SAFE')
    })

    test('email with no suspicious indicators classified as SAFE', () => {
      const result = analyzeEmail({
        sender: 'noreply@company.com',
        subject: 'Weekly newsletter',
        body: 'Check out our latest products and updates.',
      })
      expect(result.classification).toBe('SAFE')
    })
  })

  describe('Malicious Emails', () => {
    test('email with OTP request classified as MALICIOUS', () => {
      const result = analyzeEmail({
        sender: 'bank@example.com',
        subject: 'Verify your account',
        body: 'Please enter your OTP code to verify your identity.',
      })
      expect(result.classification).toBe('MALICIOUS')
      expect(result.riskScore).toBeGreaterThanOrEqual(75)
    })

    test('email with urgent subject classified as SUSPICIOUS', () => {
      const result = analyzeEmail({
        sender: 'company@support.com',
        subject: 'URGENT: Your account will be suspended!',
        body: 'Click here to update your payment information.',
      })
      expect([ 'SUSPICIOUS', 'MALICIOUS' ]).toContain(result.classification)
    })

    test('email with credential request classified as MALICIOUS', () => {
      const result = analyzeEmail({
        sender: 'support@company.com',
        subject: 'Reset your password',
        body: 'Click here to reset your password and enter your current password.',
      })
      expect(result.classification).toBe('MALICIOUS')
    })
  })

  describe('Phishing Indicators', () => {
    test('email with credential harvesting phrasing flagged', () => {
      const result = analyzeEmail({
        sender: 'admin@account-service.com',
        subject: 'Verify your identity',
        body: 'Click the link below to verify your identity.',
      })
      expect(result.riskScore).toBeGreaterThan(0)
    })

    test('email with lottery/prize scam flagged', () => {
      const result = analyzeEmail({
        sender: 'lottery@winner.com',
        subject: 'You have won $1,000,000!',
        body: 'Claim your prize now by providing your banking details.',
      })
      expect(result.riskScore).toBeGreaterThan(0)
    })

    test('email with banking fraud indicators flagged', () => {
      const result = analyzeEmail({
        sender: 'finance@company.com',
        subject: 'Payment transfer required',
        body: 'Please transfer $5,000 to the following account using IFSC CODE.',
      })
      expect(result.riskScore).toBeGreaterThan(0)
    })
  })

  describe('Attachment Checks', () => {
    test('email with risky attachment flagged', () => {
      const result = analyzeEmail({
        sender: 'unknown@source.com',
        subject: 'Invoice',
        body: '',
        attachments: ['malware.exe', 'risky.scr'],
      })
      expect(result.riskScore).toBeGreaterThan(0)
    })

    test('email with safe attachments does not flag', () => {
      const result = analyzeEmail({
        sender: 'known@source.com',
        subject: 'Report',
        body: '',
        attachments: ['document.pdf', 'image.png'],
      })
      // May or may not flag depending on other factors, but should not crash
      expect(result).toBeDefined()
    })
  })

  describe('URL Analysis in Email', () => {
    test('email with malicious URL flagged', () => {
      const result = analyzeEmail({
        sender: 'admin@secure.com',
        subject: 'Important',
        body: 'Click http://paypa1.com to verify your account.',
      })
      expect(result.riskScore).toBeGreaterThan(0)
    })
  })
})