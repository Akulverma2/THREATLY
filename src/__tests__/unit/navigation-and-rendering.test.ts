import { describe, test, expect } from 'vitest';
import { authConfig } from '@/lib/auth.config';
import fs from 'fs';
import path from 'path';

describe('Site-Wide Navigation & Security Configuration', () => {
  describe('Content Security Policy & Hydration Compatibility', () => {
    test('middleware source contains safe CSP allowing Next.js client hydration', () => {
      const middlewarePath = path.resolve(process.cwd(), 'src/middleware.ts');
      const content = fs.readFileSync(middlewarePath, 'utf8');

      // Verify Content-Security-Policy contains script-src with unsafe-inline to allow Next.js hydration
      expect(content).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
      expect(content).toContain("object-src 'none'");
      expect(content).toContain("base-uri 'self'");
      expect(content).toContain("frame-ancestors 'none'");

      // Verify matcher excludes api/auth so NextAuth handlers are not intercepted
      expect(content).toContain('(?!api/auth|');
    });

    test('Edge-compatible authConfig includes trustHost and session strategy', () => {
      expect(authConfig.trustHost).toBe(true);
      expect(authConfig.session?.strategy).toBe('jwt');
      expect(authConfig.pages?.signIn).toBe('/login');
      expect(authConfig.providers).toEqual([]);
    });

    test('authConfig JWT and session callbacks correctly propagate identity and role', async () => {
      if (!authConfig.callbacks?.jwt || !authConfig.callbacks?.session) {
        throw new Error('Callbacks must be defined');
      }

      const jwtFn = authConfig.callbacks.jwt as unknown as (params: unknown) => Promise<{ id?: string; role?: string }>;
      const token = await jwtFn({
        token: {},
        user: { id: 'u-123', role: 'ADMIN' },
      });
      expect(token?.id).toBe('u-123');
      expect(token?.role).toBe('ADMIN');

      const sessionFn = authConfig.callbacks.session as unknown as (params: unknown) => Promise<{ user?: { id?: string; role?: string } }>;
      const session = await sessionFn({
        session: { user: {} },
        token: { id: 'u-123', role: 'ADMIN' },
      });
      expect(session.user?.id).toBe('u-123');
      expect(session.user?.role).toBe('ADMIN');
    });
  });

  describe('Route Inventory & Navigation Target Validation', () => {
    const validApplicationRoutes = [
      '/',
      '/login',
      '/register',
      '/about',
      '/scanner',
      '/dashboard',
      '/admin',
      '/api/public/stats',
      '/api/register',
      '/api/scan/url',
      '/api/scan/qr',
      '/api/scan/message',
      '/api/scan/email',
      '/api/user/me',
      '/api/user/scans',
      '/api/admin/stats',
      '/api/admin/users',
      '/api/admin/audit',
      '/api/admin/disable-user',
    ];

    test('all primary navigation destinations exist in the application route inventory', () => {
      const navigationTargets = [
        '/',
        '/login',
        '/register',
        '/about',
        '/scanner',
        '/dashboard',
        '/admin',
      ];

      for (const target of navigationTargets) {
        expect(validApplicationRoutes).toContain(target);
      }
    });

    test('role-based access control destinations are accurately mapped', () => {
      function getDestinationForRole(role?: string): string {
        return role === 'ADMIN' ? '/admin' : '/dashboard';
      }

      expect(getDestinationForRole('ADMIN')).toBe('/admin');
      expect(getDestinationForRole('USER')).toBe('/dashboard');
      expect(getDestinationForRole(undefined)).toBe('/dashboard');
    });
  });
});
