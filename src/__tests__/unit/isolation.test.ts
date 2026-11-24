import { describe, test, expect, afterEach } from 'vitest'
import { validateTestDatabaseUrl, maskConnectionUrl } from '@/lib/prisma'

describe('Database Isolation Safeguards', () => {
  const originalTestDbUrl = process.env.TEST_DATABASE_URL
  const originalProdDbUrl = process.env.DATABASE_URL

  afterEach(() => {
    process.env.TEST_DATABASE_URL = originalTestDbUrl
    process.env.DATABASE_URL = originalProdDbUrl
  })

  test('rejects empty or undefined TEST_DATABASE_URL', () => {
    expect(() => validateTestDatabaseUrl('', 'postgresql://user:pass@ep-prod/neondb')).toThrow(
      /TEST_DATABASE_URL must be explicitly defined/
    )
    expect(() => validateTestDatabaseUrl(undefined, 'postgresql://user:pass@ep-prod/neondb')).toThrow(
      /TEST_DATABASE_URL must be explicitly defined/
    )
  })

  test('rejects TEST_DATABASE_URL identical to production DATABASE_URL', () => {
    const prodUrl = 'postgresql://neondb_owner:pass@ep-prod.neon.tech/neondb?sslmode=require'
    expect(() => validateTestDatabaseUrl(prodUrl, prodUrl)).toThrow(
      /TEST_DATABASE_URL is identical to production DATABASE_URL/
    )
  })

  test('rejects database targets that do not contain "test" in database name', () => {
    const unsafeTarget = 'postgresql://neondb_owner:pass@ep-prod.neon.tech/neondb?sslmode=require'
    const prodUrl = 'postgresql://neondb_owner:pass@ep-prod.neon.tech/different_prod?sslmode=require'
    expect(() => validateTestDatabaseUrl(unsafeTarget, prodUrl)).toThrow(
      /does not contain 'test'/
    )
  })

  test('accepts valid, isolated test database URLs with "test" in name', () => {
    const validTestUrl = 'postgresql://neondb_owner:pass@ep-test.neon.tech/neondb_test?sslmode=require'
    const prodUrl = 'postgresql://neondb_owner:pass@ep-prod.neon.tech/neondb?sslmode=require'
    const validated = validateTestDatabaseUrl(validTestUrl, prodUrl)
    expect(validated).toBe(validTestUrl)
  })

  test('database target is verified distinguishable from production target', () => {
    // Current test configuration targets neondb_test, while production targets neondb
    const currentTestUrl = process.env.TEST_DATABASE_URL
    const currentProdUrl = process.env.DATABASE_URL
    expect(currentTestUrl).toBeDefined()
    expect(currentProdUrl).toBeDefined()
    expect(currentTestUrl).not.toEqual(currentProdUrl)
    expect(currentTestUrl).toContain('test')
  })

  test('maskConnectionUrl masks secrets and credentials', () => {
    const rawUrl = 'postgresql://sensitive_user:super_secret_password@ep-db.neon.tech:5432/neondb_test?sslmode=require'
    const masked = maskConnectionUrl(rawUrl)
    expect(masked).not.toContain('super_secret_password')
    expect(masked).not.toContain('sensitive_user')
    expect(masked).toContain('***:***@ep-db.neon.tech:5432/neondb_test')
  })

  test('maskConnectionUrl handles undefined and empty inputs gracefully', () => {
    expect(maskConnectionUrl(undefined)).toBe('<undefined>')
    expect(maskConnectionUrl('')).toBe('<undefined>')
    expect(maskConnectionUrl('not-a-valid-url')).toBe('<unparseable-url>')
  })
})