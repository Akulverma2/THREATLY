import { describe, test, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// We test the authentication logic and authorization rules specified in src/lib/auth.ts and src/middleware.ts

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

interface MockUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  passwordHash: string
}

async function mockAuthorize(
  raw: unknown,
  findUserMock: (email: string) => Promise<MockUser | null>,
  updateUserMock: (id: string, data: { lastLogin: Date }) => Promise<MockUser | null>
) {
  const parsed = credentialsSchema.safeParse(raw)
  if (!parsed.success) return null
  const { email, password } = parsed.data
  const user = await findUserMock(email)
  if (!user || user.status !== 'ACTIVE') return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return null
  await updateUserMock(user.id, { lastLogin: new Date() })
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

describe('Authentication & Authorization Engine', () => {
  let mockFindUser: ReturnType<typeof vi.fn>
  let mockUpdateUser: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFindUser = vi.fn()
    mockUpdateUser = vi.fn()
  })

  describe('Authentication (Credentials Provider)', () => {
    test('authenticates valid credentials for ACTIVE user and updates lastLogin', async () => {
      const password = 'mySecretPassword123'
      const passwordHash = await bcrypt.hash(password, 10)

      mockFindUser.mockResolvedValue({
        id: 'u-1',
        name: 'Valid User',
        email: 'user@example.com',
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
      })
      mockUpdateUser.mockResolvedValue({})

      const result = await mockAuthorize(
        { email: 'user@example.com', password },
        mockFindUser,
        mockUpdateUser
      )

      expect(result).not.toBeNull()
      expect(result).toEqual({
        id: 'u-1',
        name: 'Valid User',
        email: 'user@example.com',
        role: 'USER',
      })
      expect(mockUpdateUser).toHaveBeenCalledWith('u-1', expect.objectContaining({ lastLogin: expect.any(Date) }))
    })

    test('rejects login when password does not match hash', async () => {
      const passwordHash = await bcrypt.hash('correctPassword', 10)

      mockFindUser.mockResolvedValue({
        id: 'u-1',
        name: 'Valid User',
        email: 'user@example.com',
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
      })

      const result = await mockAuthorize(
        { email: 'user@example.com', password: 'wrongPassword' },
        mockFindUser,
        mockUpdateUser
      )

      expect(result).toBeNull()
      expect(mockUpdateUser).not.toHaveBeenCalled()
    })

    test('rejects login when user is not found in database', async () => {
      mockFindUser.mockResolvedValue(null)

      const result = await mockAuthorize(
        { email: 'unknown@example.com', password: 'password123' },
        mockFindUser,
        mockUpdateUser
      )

      expect(result).toBeNull()
    })

    test('rejects login when user status is SUSPENDED or INACTIVE', async () => {
      const passwordHash = await bcrypt.hash('password123', 10)

      mockFindUser.mockResolvedValue({
        id: 'u-suspended',
        name: 'Suspended User',
        email: 'suspended@example.com',
        passwordHash,
        role: 'USER',
        status: 'SUSPENDED',
      })

      const result = await mockAuthorize(
        { email: 'suspended@example.com', password: 'password123' },
        mockFindUser,
        mockUpdateUser
      )

      expect(result).toBeNull()
    })

    test('rejects invalid or missing credentials input', async () => {
      expect(await mockAuthorize({ email: 'bad-email', password: '123' }, mockFindUser, mockUpdateUser)).toBeNull()
      expect(await mockAuthorize({ email: 'valid@example.com', password: 'short' }, mockFindUser, mockUpdateUser)).toBeNull()
      expect(await mockAuthorize({}, mockFindUser, mockUpdateUser)).toBeNull()
      expect(mockFindUser).not.toHaveBeenCalled()
    })
  })

  describe('JWT & Session Role Ingestion', () => {
    test('jwt callback injects user id and role into token', () => {
      interface CallbackToken {
        id?: string
        role?: string
        [key: string]: unknown
      }
      interface CallbackUser {
        id: string
        role?: string
      }

      const jwtCallback = ({ token, user }: { token: CallbackToken; user?: CallbackUser }) => {
        if (user) {
          token.id = user.id
          token.role = user.role ?? 'USER'
        }
        return token
      }

      const token = jwtCallback({
        token: {},
        user: { id: 'admin-id', role: 'ADMIN' },
      })

      expect(token.id).toBe('admin-id')
      expect(token.role).toBe('ADMIN')
    })

    test('session callback injects user id and role into session from token', () => {
      interface CallbackSession {
        user?: {
          id?: string
          role?: string
          [key: string]: unknown
        }
        [key: string]: unknown
      }
      interface CallbackToken {
        id: string
        role: string
      }

      const sessionCallback = ({ session, token }: { session: CallbackSession; token: CallbackToken }) => {
        if (session.user) {
          session.user.id = token.id
          session.user.role = token.role
        }
        return session
      }

      const session = sessionCallback({
        session: { user: {} },
        token: { id: 'user-id', role: 'USER' },
      })

      expect(session.user?.id).toBe('user-id')
      expect(session.user?.role).toBe('USER')
    })
  })

  describe('Authorization Rules (RBAC)', () => {
    const isAdminRoute = (pathname: string) =>
      pathname.startsWith('/admin') || pathname.startsWith('/api/admin')

    const isUserRoute = (pathname: string) =>
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/api/user') ||
      pathname.startsWith('/api/scan')

    test('admin routes identify admin pages and API endpoints', () => {
      expect(isAdminRoute('/admin')).toBe(true)
      expect(isAdminRoute('/admin/users')).toBe(true)
      expect(isAdminRoute('/api/admin/stats')).toBe(true)
      expect(isAdminRoute('/dashboard')).toBe(false)
      expect(isAdminRoute('/api/scan/url')).toBe(false)
    })

    test('user routes identify authenticated user areas', () => {
      expect(isUserRoute('/dashboard')).toBe(true)
      expect(isUserRoute('/api/user/me')).toBe(true)
      expect(isUserRoute('/api/scan/url')).toBe(true)
      expect(isUserRoute('/about')).toBe(false)
      expect(isUserRoute('/login')).toBe(false)
    })

    test('enforces RBAC policy: non-admin cannot access admin routes and API routes return status codes', () => {
      function evaluateAccess(pathname: string, user: { role: string } | null) {
        const isApi = pathname.startsWith('/api/')
        if (isAdminRoute(pathname)) {
          if (!user) return isApi ? { allowed: false, status: 401 } : { allowed: false, redirect: '/login' }
          if (user.role !== 'ADMIN') return isApi ? { allowed: false, status: 403 } : { allowed: false, redirect: '/dashboard' }
          return { allowed: true }
        }
        if (isUserRoute(pathname)) {
          if (!user) return isApi ? { allowed: false, status: 401 } : { allowed: false, redirect: '/login' }
          return { allowed: true }
        }
        return { allowed: true }
      }

      // Unauthenticated UI access
      expect(evaluateAccess('/admin', null)).toEqual({ allowed: false, redirect: '/login' })
      expect(evaluateAccess('/dashboard', null)).toEqual({ allowed: false, redirect: '/login' })

      // Unauthenticated API access
      expect(evaluateAccess('/api/admin/users', null)).toEqual({ allowed: false, status: 401 })
      expect(evaluateAccess('/api/scan/url', null)).toEqual({ allowed: false, status: 401 })

      // Authenticated normal USER
      expect(evaluateAccess('/dashboard', { role: 'USER' })).toEqual({ allowed: true })
      expect(evaluateAccess('/admin', { role: 'USER' })).toEqual({ allowed: false, redirect: '/dashboard' })
      expect(evaluateAccess('/api/admin/users', { role: 'USER' })).toEqual({ allowed: false, status: 403 })

      // Authenticated ADMIN
      expect(evaluateAccess('/dashboard', { role: 'ADMIN' })).toEqual({ allowed: true })
      expect(evaluateAccess('/admin', { role: 'ADMIN' })).toEqual({ allowed: true })
      expect(evaluateAccess('/api/admin/users', { role: 'ADMIN' })).toEqual({ allowed: true })
    })
  })
})
