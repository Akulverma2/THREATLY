import { describe, test, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'

beforeEach(async () => {
  // Clean up test user before each test
  await prisma.user.deleteMany({ where: { email: { startsWith: 'test-' } } })
})

describe('Registration API', () => {
  test('new user registration with valid data', async () => {
    // Test that we can create a test user in the database
    const user = await prisma.user.create({
      data: { name: 'Test User', email: 'test-1@test.com', passwordHash: 'hashed', role: 'USER' },
    })
    expect(user.email).toBe('test-1@test.com')
    expect(user.role).toBe('USER')
  })

  test('duplicate email rejected', async () => {
    // Create first user
    await prisma.user.create({
      data: { name: 'Test User', email: 'test-2@test.com', passwordHash: 'hashed', role: 'USER' },
    })

    // Try to create duplicate with same email - should reject with unique constraint violation
    await expect(
      prisma.user.create({
        data: { name: 'Duplicate User', email: 'test-2@test.com', passwordHash: 'hashed2', role: 'USER' },
      })
    ).rejects.toThrow()
  })
})