import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "healthy";
  let latencyMs = 0;

  try {
    // Quick DB query to verify connection
    await prisma.$queryRaw`SELECT 1`;
    latencyMs = Date.now() - startTime;
  } catch (err: any) {
    dbStatus = `unhealthy: ${err?.message || "connection error"}`;
  }

  const isHealthy = dbStatus === "healthy";

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        latencyMs,
      },
      environment: process.env.NODE_ENV || "development",
      version: "0.1.0",
    },
    { status: isHealthy ? 200 : 503 }
  );
}
