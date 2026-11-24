import { describe, test, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'

beforeEach(async () => {
  // Clean up test users before each test with scoped filter
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test.com' } } })
})

describe('Authorization', () => {
  test('test user can be created and verified', async () => {
    const user = await prisma.user.create({
      data: { name: 'Test User', email: 'authz-test@test.com', passwordHash: 'hashed', role: 'USER' },
    })
    expect(user.email).toBe('authz-test@test.com')
    expect(user.role).toBe('USER')
  })

  test('admin role can be assigned', async () => {
    const admin = await prisma.user.create({
      data: { name: 'Admin User', email: 'adminz-test@test.com', passwordHash: 'hashed', role: 'ADMIN' },
    })
    expect(admin.role).toBe('ADMIN')
  })
})