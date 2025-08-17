import { PrismaClient } from '@prisma/client';

// Usa una property su globalThis per singleton (senza typecast TypeScript)
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  (globalForPrisma.prisma = new PrismaClient());

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;