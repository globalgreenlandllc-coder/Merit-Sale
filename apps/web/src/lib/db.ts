import { PrismaClient } from '@prisma/client';

const g = globalThis as unknown as { __etkPrisma?: PrismaClient };
export const db = g.__etkPrisma ?? new PrismaClient({ log: ['error'] });
if (process.env.NODE_ENV !== 'production') g.__etkPrisma = db;
