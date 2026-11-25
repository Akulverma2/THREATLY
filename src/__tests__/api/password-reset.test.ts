import { describe, test, expect, vi, beforeEach } from 'vitest'
import { POST as forgotPasswordHandler } from '@/app/api/auth/forgot-password/route'
import { POST as resetPasswordHandler } from '@/app/api/auth/reset-password/route'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}))

describe('Password Reset API Route Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/auth/forgot-password', () => {
    test('generates token for existing user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-reset-1',
        name: 'Agent Tester',
        email: 'operator@threatly.local',
        passwordHash: 'hashed',
        role: 'USER',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        totalScans: 0,
      })
      vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 0 })
      vi.mocked(prisma.verificationToken.create).mockResolvedValue({
        identifier: 'operator@threatly.local',
        token: 'mock-token',
        expires: new Date(Date.now() + 3600 * 1000),
      })
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: 'log-1',
        userId: 'user-reset-1',
        action: 'PASSWORD_RESET_REQUESTED',
        metadata: null,
        ip: null,
        createdAt: new Date(),
      })

      const req = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'operator@threatly.local' }),
      })

      const res = await forgotPasswordHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.token).toBeDefined()
      expect(data.resetUrl).toContain('/reset-password?token=')
      expect(prisma.verificationToken.create).toHaveBeenCalledOnce()
    })

    test('rejects invalid email address', async () => {
      const req = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      })

      const res = await forgotPasswordHandler(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBeDefined()
    })
  })

  describe('POST /api/auth/reset-password', () => {
    test('successfully resets password with valid token', async () => {
      const email = 'operator@threatly.local'
      const token = 'valid-secure-token-1234567890'
      const newPassword = 'NewSecretPassword123!'

      vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
        identifier: email,
        token,
        expires: new Date(Date.now() + 3600 * 1000), // Active
      })

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-reset-1',
        name: 'Agent Tester',
        email,
        passwordHash: 'old-hash',
        role: 'USER',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        totalScans: 0,
      })

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'user-reset-1',
        name: 'Agent Tester',
        email,
        passwordHash: 'new-hash',
        role: 'USER',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        totalScans: 0,
      })

      vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 1 })

      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
          newPassword,
        }),
      })

      const res = await resetPasswordHandler(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(prisma.user.update).toHaveBeenCalledOnce()
    })

    test('rejects expired token', async () => {
      const email = 'operator@threatly.local'
      const token = 'expired-token-1234567890'

      vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
        identifier: email,
        token,
        expires: new Date(Date.now() - 60 * 1000), // Expired 1 min ago
      })

      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
          newPassword: 'NewSecretPassword123!',
        }),
      })

      const res = await resetPasswordHandler(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('expired')
    })

    test('rejects password shorter than 8 characters', async () => {
      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'operator@threatly.local',
          token: 'some-token-1234567890',
          newPassword: 'short',
        }),
      })

      const res = await resetPasswordHandler(req)
      expect(res.status).toBe(400)
    })
  })
})
