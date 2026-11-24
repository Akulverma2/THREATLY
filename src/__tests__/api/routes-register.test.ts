import { describe, test, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/register/route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

describe('Registration API Route Handler (POST /api/register)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('valid registration returns 201 with created user data and hashed password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-123',
      name: 'Alice Smith',
      email: 'alice@example.com',
      passwordHash: '$2b$12$hashedpassword',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
      totalScans: 0,
    })

    const req = new Request('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'securePassword123!',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json).toEqual({
      id: 'user-123',
      name: 'Alice Smith',
      email: 'alice@example.com',
    })
    expect(json.passwordHash).toBeUndefined()
    expect(prisma.user.create).toHaveBeenCalledOnce()
  })

  test('rejects registration with missing name', async () => {
    const req = new Request('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@example.com',
        password: 'securePassword123!',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid input')
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  test('rejects registration with invalid characters in name', async () => {
    const req = new Request('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '<script>alert(1)</script>',
        email: 'alice@example.com',
        password: 'securePassword123!',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid input')
  })

  test('rejects registration with invalid email format', async () => {
    const req = new Request('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid Name',
        email: 'not-an-email',
        password: 'securePassword123!',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid input')
  })

  test('rejects registration with password shorter than 6 characters', async () => {
    const req = new Request('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid Name',
        email: 'alice@example.com',
        password: '12345',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid input')
  })

  test('rejects registration with password longer than 128 characters (DoS prevention)', async () => {
    const req = new Request('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid Name',
        email: 'alice@example.com',
        password: 'A'.repeat(129),
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid input')
  })

  test('rejects registration with name longer than 100 characters', async () => {
    const req = new Request('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A'.repeat(101),
        email: 'alice@example.com',
        password: 'securePassword123!',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid input')
  })

  test('rejects duplicate email with 409 Conflict', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'existing-id',
      name: 'Existing User',
      email: 'alice@example.com',
      passwordHash: 'hash',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
      totalScans: 0,
    })

    const req = new Request('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'securePassword123!',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('Email already registered')
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  test('handles database error gracefully with 500 status', async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database connection failed'))

    const req = new Request('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'securePassword123!',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Server error')
  })
})
