import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { docker } from "@/lib/docker/client";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

function calculateCpuPercent(
  stats: import("dockerode").ContainerStats
) {
  const cpuDelta =
    stats.cpu_stats.cpu_usage.total_usage -
    stats.precpu_stats.cpu_usage.total_usage;

  const systemDelta =
    stats.cpu_stats.system_cpu_usage -
    stats.precpu_stats.system_cpu_usage;

  const onlineCpus =
    stats.cpu_stats.online_cpus ||
    stats.cpu_stats.cpu_usage.percpu_usage?.length ||
    1;

  if (systemDelta <= 0 || cpuDelta <= 0) {
    return 0;
  }

  return Number(
    ((cpuDelta / systemDelta) * onlineCpus * 100).toFixed(2)
  );
}

export async function GET(
  request: Request,
  { params }: Params
) {
  try {
    await requireAuth();

    const { id } = await params;

    const limitParam =
      new URL(request.url).searchParams.get("limit");

    const limit = Math.min(
      Math.max(Number(limitParam) || 100, 1),
      500
    );

    const metrics = await prisma.containerMetric.findMany({
      where: {
        containerId: id,
      },
      orderBy: {
        recordedAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({
      containerId: id,
      metrics: metrics.reverse().map((metric) => ({
        id: metric.id,
        cpuPercent: metric.cpuPercent,
        memoryUsage: metric.memoryUsage.toString(),
        memoryLimit: metric.memoryLimit.toString(),
        memoryPercent: metric.memoryPercent,
        rxBytes: metric.rxBytes.toString(),
        txBytes: metric.txBytes.toString(),
        recordedAt: metric.recordedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Container metrics history error:", error);

    return NextResponse.json(
      {
        error: "Failed to load container metric history",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: Params
) {
  try {
    await requireAuth();

    const { id } = await params;

    const container = docker.getContainer(id);

    const stats = await container.stats({
      stream: false,
    });

    const cpuPercent = calculateCpuPercent(stats);

    const memoryUsage = stats.memory_stats.usage ?? 0;
    const memoryLimit = stats.memory_stats.limit ?? 0;

    const memoryPercent =
      memoryLimit > 0
        ? Number(
            ((memoryUsage / memoryLimit) * 100).toFixed(2)
          )
        : 0;

    const networkStats = Object.values(
      stats.networks ?? {}
    ).reduce(
      (total, network) => ({
        rxBytes:
          total.rxBytes + (network.rx_bytes ?? 0),
        txBytes:
          total.txBytes + (network.tx_bytes ?? 0),
      }),
      {
        rxBytes: 0,
        txBytes: 0,
      }
    );

    const metric = await prisma.containerMetric.create({
      data: {
        containerId: id,
        cpuPercent,
        memoryUsage: BigInt(memoryUsage),
        memoryLimit: BigInt(memoryLimit),
        memoryPercent,
        rxBytes: BigInt(networkStats.rxBytes),
        txBytes: BigInt(networkStats.txBytes),
      },
    });

    return NextResponse.json({
      success: true,
      metric: {
        id: metric.id,
        cpuPercent: metric.cpuPercent,
        memoryPercent: metric.memoryPercent,
        rxBytes: metric.rxBytes.toString(),
        txBytes: metric.txBytes.toString(),
        recordedAt: metric.recordedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Container metric collection error:", error);

    return NextResponse.json(
      {
        error: "Failed to collect container metrics",
      },
      { status: 500 }
    );
  }
}