import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { docker } from "@/lib/docker/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;
    const container = docker.getContainer(id);

    const stats = await container.stats({
      stream: false,
    });

    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage -
      stats.precpu_stats.cpu_usage.total_usage;

    const systemDelta =
      stats.cpu_stats.system_cpu_usage -
      stats.precpu_stats.system_cpu_usage;

    const onlineCpus =
      stats.cpu_stats.online_cpus ??
      stats.cpu_stats.cpu_usage.percpu_usage?.length ??
      1;

    const cpuPercent =
      systemDelta > 0
        ? (cpuDelta / systemDelta) * onlineCpus * 100
        : 0;

    const memoryUsage = stats.memory_stats.usage ?? 0;
    const memoryLimit = stats.memory_stats.limit ?? 0;

    const memoryPercent =
      memoryLimit > 0
        ? (memoryUsage / memoryLimit) * 100
        : 0;

    let rxBytes = 0;
    let txBytes = 0;

    if (stats.networks) {
      for (const network of Object.values(stats.networks)) {
        rxBytes += network.rx_bytes ?? 0;
        txBytes += network.tx_bytes ?? 0;
      }
    }

    return NextResponse.json({
      containerId: id,
      cpuPercent: Number(cpuPercent.toFixed(2)),
      memoryUsage,
      memoryLimit,
      memoryPercent: Number(memoryPercent.toFixed(2)),
      rxBytes,
      txBytes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Docker stats error:", error);

    return NextResponse.json(
      {
        error: "Failed to retrieve container statistics",
      },
      { status: 500 }
    );
  }
}