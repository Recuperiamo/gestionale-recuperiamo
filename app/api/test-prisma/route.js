import { NextResponse } from "next/server";

/**
 * Test endpoint to diagnose Prisma import issues
 * GET /api/test-prisma
 */
export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  // Test 1: Try importing from lib/prisma
  try {
    const { prisma: libPrisma } = await import("../../../lib/prisma");
    results.tests.push({
      name: "Import from lib/prisma",
      status: "success",
      prismaType: typeof libPrisma,
      isUndefined: libPrisma === undefined,
      constructorName: libPrisma?.constructor?.name
    });
    
    // Try a simple query
    try {
      const count = await libPrisma.lavagna.count();
      results.tests.push({
        name: "Query with lib/prisma",
        status: "success",
        lavagnaCount: count
      });
    } catch (err) {
      results.tests.push({
        name: "Query with lib/prisma",
        status: "error",
        error: err.message
      });
    }
  } catch (err) {
    results.tests.push({
      name: "Import from lib/prisma",
      status: "error",
      error: err.message,
      stack: err.stack
    });
  }

  // Test 2: Try importing PrismaClient directly
  try {
    const { PrismaClient } = await import("@prisma/client");
    const directPrisma = new PrismaClient();
    results.tests.push({
      name: "Direct PrismaClient import",
      status: "success",
      prismaType: typeof directPrisma,
      constructorName: directPrisma?.constructor?.name
    });
    
    // Try a simple query
    try {
      const count = await directPrisma.lavagna.count();
      results.tests.push({
        name: "Query with direct PrismaClient",
        status: "success",
        lavagnaCount: count
      });
      await directPrisma.$disconnect();
    } catch (err) {
      results.tests.push({
        name: "Query with direct PrismaClient",
        status: "error",
        error: err.message
      });
      await directPrisma.$disconnect();
    }
  } catch (err) {
    results.tests.push({
      name: "Direct PrismaClient import",
      status: "error",
      error: err.message,
      stack: err.stack
    });
  }

  // Test 3: Check LavagnaShape model availability via both imports
  try {
    const { prisma: libPrisma2 } = await import("../../../lib/prisma");
    if (libPrisma2?.lavagnaShape?.count) {
      try {
        const c = await libPrisma2.lavagnaShape.count();
        results.tests.push({ name: "LavagnaShape count (lib)", status: "success", count: c });
      } catch (err) {
        results.tests.push({ name: "LavagnaShape count (lib)", status: "error", error: err.message });
      }
    } else {
      results.tests.push({ name: "LavagnaShape model (lib)", status: "missing" });
    }
  } catch (err) {
    results.tests.push({ name: "LavagnaShape model (lib)", status: "error", error: err.message });
  }

  try {
    const { PrismaClient } = await import("@prisma/client");
    const pc = new PrismaClient();
    if (pc?.lavagnaShape?.count) {
      try {
        const c = await pc.lavagnaShape.count();
        results.tests.push({ name: "LavagnaShape count (direct)", status: "success", count: c });
      } catch (err) {
        results.tests.push({ name: "LavagnaShape count (direct)", status: "error", error: err.message });
      } finally {
        await pc.$disconnect();
      }
    } else {
      results.tests.push({ name: "LavagnaShape model (direct)", status: "missing" });
      await pc.$disconnect();
    }
  } catch (err) {
    results.tests.push({ name: "LavagnaShape model (direct)", status: "error", error: err.message });
  }

  // Environment
  results.environment = {
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL ? "SET" : "NOT SET",
    vercel: process.env.VERCEL ? "YES" : "NO",
    vercelEnv: process.env.VERCEL_ENV
  };

  return NextResponse.json(results, { status: 200 });
}
