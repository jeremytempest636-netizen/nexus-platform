import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    const [users, projects, deployments, incidents] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.deployment.count(),
      prisma.incident.count(),
    ]);

    return NextResponse.json({
      status: "ok",
      database: "connected",
      service: "nexus-platform",
      responseTimeMs: Date.now() - startedAt,
      data: {
        users,
        projects,
        deployments,
        incidents,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        service: "nexus-platform",
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
