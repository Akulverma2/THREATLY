import { describe, test, expect } from 'vitest'
import { rateLimit, scanRateLimit } from '@/middleware/rate-limit'

describe('Rate Limiter Middleware', () => {
  test('allows requests within limit and sets RateLimit headers', () => {
    const limiter = rateLimit({ windowMs: 60000, max: 2 })
    const req1 = new Request('http://localhost:3000/api/test', {
      headers: { 'x-real-ip': '192.168.1.100' },
    })

    const res1 = limiter(req1)
    expect(res1).toBeNull()

    const req2 = new Request('http://localhost:3000/api/test', {
      headers: { 'x-real-ip': '192.168.1.100' },
    })
    const res2 = limiter(req2)
    expect(res2).toBeNull()
  })

  test('blocks requests exceeding limit with 429 status and Retry-After header', () => {
    const limiter = rateLimit({ windowMs: 60000, max: 2 })
    const req = new Request('http://localhost:3000/api/test', {
      headers: { 'x-real-ip': '192.168.1.101' },
    })

    limiter(req)
    limiter(req)
    const blockedRes = limiter(req)

    expect(blockedRes).not.toBeNull()
    expect(blockedRes?.status).toBe(429)
    expect(blockedRes?.headers.get('Retry-After')).toBeDefined()
    expect(blockedRes?.headers.get('X-RateLimit-Limit')).toBe('2')
    expect(blockedRes?.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  test('scanRateLimit helper enforces scan window and max limits', () => {
    const ip = '10.0.0.99'
    let lastRes = null
    for (let i = 0; i < 31; i++) {
      const req = new Request('http://localhost:3000/api/scan/url', {
        headers: { 'x-real-ip': ip },
      })
      lastRes = scanRateLimit(req)
    }

    expect(lastRes).not.toBeNull()
    expect(lastRes?.status).toBe(429)
  })
})
