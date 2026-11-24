import { describe, test, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'

beforeEach(async () => {
  // Clean up test users before each test with scoped filter
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test.com' } } })
})

describe('Authentication API', () => {
  test('clean slate has no test users', async () => {
    const users = await prisma.user.findMany({ where: { email: { endsWith: '@test.com' } } })
    expect(users.length).toBe(0)
  })

  test('user can be created for test environment', async () => {
    // This tests the prisma create directly
    const user = await prisma.user.create({
      data: { name: 'Test User', email: 'test@test.com', passwordHash: 'hashed', role: 'USER' },
    })
    expect(user.email).toBe('test@test.com')
    expect(user.role).toBe('USER')
  })
})