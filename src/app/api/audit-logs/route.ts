import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);

    const action = url.searchParams.get("action") ?? "";
    const limitParam = Number(url.searchParams.get("limit") ?? "100");

    const limit = Math.min(
      Math.max(Number.isFinite(limitParam) ? limitParam : 100, 1),
      200
    );

    const where = action
      ? {
          action,
        }
      : undefined;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    const total = await prisma.auditLog.count();

    const actionCounts = await prisma.auditLog.groupBy({
      by: ["action"],
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: "desc",
        },
      },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      logs,
      summary: {
        total,
        returned: logs.length,
        actionTypes: actionCounts.length,
      },
      actionCounts: actionCounts.map((item) => ({
        action: item.action,
        count: item._count.action,
      })),
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Audit logs API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}