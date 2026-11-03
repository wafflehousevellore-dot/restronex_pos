import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrSetCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const healthData = await getOrSetCache(
    "health_check_status",
    async () => {
      const startTime = Date.now();
      let dbStatus = "healthy";
      let latencyMs = 0;

      try {
        await prisma.$queryRaw`SELECT 1`;
        latencyMs = Date.now() - startTime;
      } catch (err: any) {
        dbStatus = `unhealthy: ${err?.message || "connection error"}`;
      }

      const isHealthy = dbStatus === "healthy";
      return {
        status: isHealthy ? "ok" : "degraded",
        database: { status: dbStatus, latencyMs },
        isHealthy,
      };
    },
    10 // Cache health check for 10 seconds under high load
  );

  return NextResponse.json(
    {
      status: healthData.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: healthData.database,
      environment: process.env.NODE_ENV || "development",
      version: "0.1.0",
    },
    { status: healthData.isHealthy ? 200 : 503 }
  );
}
