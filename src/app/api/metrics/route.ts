import { NextResponse } from "next/server";
import si from "systeminformation";
import { requireAuth } from "@/lib/auth/rbac";

export async function GET() {
  try {
    await requireAuth();

    const [cpu, memory, disk, network, osInfo, system, time] =
      await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.networkStats(),
        si.osInfo(),
        si.system(),
        si.time(),
      ]);

    const primaryDisk =
      disk.find((item) => item.mount === "C:") ??
      disk.find((item) => item.mount === "/") ??
      disk[0];

    const primaryNetwork = network[0];

    const cpuUsage = Number(cpu.currentLoad.toFixed(2));

    const memoryUsage = Number(
      (((memory.total - memory.available) / memory.total) * 100).toFixed(2)
    );

    const diskUsage = primaryDisk
      ? Number(primaryDisk.use.toFixed(2))
      : 0;

    return NextResponse.json({
      status: "ok",

      cpu: {
        usage: cpuUsage,
        cores: cpu.cpus.length,
        load1m: Number(cpu.avgLoad.toFixed(2)),
      },

      memory: {
        usage: memoryUsage,
        total: memory.total,
        used: memory.used,
        available: memory.available,
      },

      disk: {
        usage: diskUsage,
        total: primaryDisk?.size ?? 0,
        used: primaryDisk?.used ?? 0,
        available: primaryDisk
          ? primaryDisk.size - primaryDisk.used
          : 0,
        mount: primaryDisk?.mount ?? "unknown",
      },

      network: {
        interface: primaryNetwork?.iface ?? "unknown",
        rxBytes: primaryNetwork?.rx_bytes ?? 0,
        txBytes: primaryNetwork?.tx_bytes ?? 0,
        rxSec: primaryNetwork?.rx_sec ?? 0,
        txSec: primaryNetwork?.tx_sec ?? 0,
      },

      host: {
        hostname: osInfo.hostname,
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        architecture: osInfo.arch,
        manufacturer: system.manufacturer,
        model: system.model,
        uptime: time.uptime,
      },

      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Metrics API error:", error);

    return NextResponse.json(
      {
        status: "error",
        error: "Failed to collect infrastructure metrics",
      },
      { status: 500 }
    );
  }
}
