import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Handle Vercel / AWS Lambda read-only serverless environment:
// Vercel serverless functions have a read-only root directory; only /tmp is writable.
// If using SQLite (file:), copy the bundled seeded dev.db to /tmp so SQLite can open, lock, and write without EROFS errors.
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  try {
    const tmpDbPath = path.join('/tmp', 'dev.db');
    // Check multiple possible locations in serverless bundles
    const possiblePaths = [
      path.join(process.cwd(), 'prisma', 'dev.db'),
      path.join(process.cwd(), 'dev.db'),
      path.join(__dirname, 'prisma', 'dev.db'),
    ];

    if (!fs.existsSync(tmpDbPath)) {
      for (const src of possiblePaths) {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, tmpDbPath);
          break;
        }
      }
    }

    if (fs.existsSync(tmpDbPath)) {
      process.env.DATABASE_URL = `file:${tmpDbPath}`;
    }
  } catch (err) {
    console.warn('[Prisma] Could not prepare SQLite in /tmp:', err);
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
