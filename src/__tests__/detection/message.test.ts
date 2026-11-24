import { describe, test, expect } from 'vitest'
import { analyzeMessage } from '@/lib/detection/message'

describe('SMS/Message Detection Engine', () => {
  describe('Safe Messages', () => {
    test('benign message classified as SAFE', () => {
      const result = analyzeMessage('Hello friend, how are you?')
      expect(result.classification).toBe('SAFE')
    })

    test('benign message with greeting classified as SAFE', () => {
      const result = analyzeMessage('Hey there, what is up?')
      expect(result.classification).toBe('SAFE')
    })
  })

  describe('Malicious Messages', () => {
    test('message with OTP request classified as MALICIOUS', () => {
      const result = analyzeMessage('Send me the OTP code now')
      expect(result.classification).toBe('MALICIOUS')
    })

    test('message with urgency classified as SUSPICIOUS', () => {
      const result = analyzeMessage('Urgent: immediate action required')
      expect([ 'SUSPICIOUS', 'MALICIOUS' ]).toContain(result.classification)
    })

    test('message with lottery/prize classified as MALICIOUS', () => {
      const result = analyzeMessage('You have won a $1000 gift card!')
      expect(result.classification).toBe('MALICIOUS')
    })

    test('message with banking keywords flagged', () => {
      const result = analyzeMessage('Transfer $5000 to this account using IFSC')
      expect(result.riskScore).toBeGreaterThan(0)
    })

    test('message with password request flagged', () => {
      const result = analyzeMessage('Please send me your password')
      expect(result.riskScore).toBeGreaterThan(0)
    })
  })

  describe('URL in Message', () => {
    test('message with suspicious URL flagged', () => {
      const result = analyzeMessage('Click this link http://paypa1.com')
      expect(result.riskScore).toBeGreaterThan(0)
    })

    test('message with multiple URLs flagged', () => {
      const result = analyzeMessage('Check out http://example1.com and http://example2.com')
      expect(result.riskScore).toBeGreaterThan(0)
    })
  })
})
