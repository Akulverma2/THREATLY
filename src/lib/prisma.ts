import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Validates that the provided connection string is demonstrably an isolated test database.
 * Throws a descriptive error if any safeguard is violated.
 */
export function validateTestDatabaseUrl(testUrl?: string, prodUrl?: string): string {
  if (!testUrl || testUrl.trim() === "") {
    throw new Error(
      "[DATABASE_ISOLATION_VIOLATION] In test mode, TEST_DATABASE_URL must be explicitly defined. Refusing to connect to protect production data."
    );
  }

  if (prodUrl && testUrl.trim() === prodUrl.trim()) {
    throw new Error(
      "[DATABASE_ISOLATION_VIOLATION] TEST_DATABASE_URL is identical to production DATABASE_URL! Refusing to connect to production database during tests."
    );
  }

  // Extract database name from connection URL
  let dbName = "";
  try {
    const parsed = new URL(testUrl);
    dbName = parsed.pathname.replace(/^\//, "");
  } catch {
    const match = testUrl.match(/\/([^/?]+)(?:\?|$)/);
    dbName = match ? match[1] : "";
  }

  if (!dbName || !dbName.toLowerCase().includes("test")) {
    throw new Error(
      `[DATABASE_ISOLATION_VIOLATION] TEST_DATABASE_URL target database '${dbName}' does not contain 'test'. Refusing to connect to potentially unsafe database target.`
    );
  }

  return testUrl;
}

/**
 * Safely masks database credentials from a connection string for diagnostic logging.
 * Returns only the protocol, masked user/pass, host, port, and database name.
 */
export function maskConnectionUrl(url?: string): string {
  if (!url || url.trim() === "") return "<undefined>";
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const dbName = parsed.pathname.replace(/^\//, "");
    return `${parsed.protocol}//***:***@${host}${parsed.port ? `:${parsed.port}` : ""}/${dbName}`;
  } catch {
    const match = url.match(/@([^/?]+)(?:\/([^?]+))?/);
    if (match) {
      return `***@${match[1]}/${match[2] || ""}`;
    }
    return "<unparseable-url>";
  }
}

let _prismaInstance: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (_prismaInstance) return _prismaInstance;

  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

  if (isTest) {
    const safeTestUrl = validateTestDatabaseUrl(
      process.env.TEST_DATABASE_URL,
      process.env.DATABASE_URL
    );

    _prismaInstance = new PrismaClient({
      log: ["error"],
      datasources: {
        db: {
          url: safeTestUrl,
        },
      },
    });
  } else {
    _prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = _prismaInstance;
  }

  return _prismaInstance;
}

// Lazy proxy: Only instantiates PrismaClient upon first property access (e.g., prisma.user)
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = globalForPrisma.prisma ?? getPrismaClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});