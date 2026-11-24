// Test database isolation setup
// This file runs before each test file in Vitest.

import dotenv from 'dotenv';
import path from 'path';

// Explicitly configure test environment
if (!process.env.NODE_ENV) {
  (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
}

// Load .env.test explicitly into process.env if present
const testEnvPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: testEnvPath });

import { prisma } from './src/lib/prisma';

// Re-export prisma as testPrisma for backward compatibility
export const testPrisma = prisma;