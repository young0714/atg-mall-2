import { PrismaClient } from "@prisma/client";

// Standard Next.js-safe Prisma singleton: avoids exhausting DB connections
// from hot-reloaded route handlers / server components in development.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
