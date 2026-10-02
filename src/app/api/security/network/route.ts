import { NextResponse } from "next/server";
import { docker } from "@/lib/docker/client";

type NetworkFinding = {
  containerId: string;
  containerName: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  type: string;
  title: string;
  description: string;
  port?: string;
  binding?: string;
};

export async function GET() {
  try {
    const containers = await docker.listContainers({
      all: true,
    });

    const findings: NetworkFinding[] = [];

    for (const container of containers) {
      const containerName =
        container.Names?.[0]?.replace(/^\//, "") ||
        container.Id.slice(0, 12);

      const hostConfig = container.HostConfig ?? {};
      const networkMode =
        typeof hostConfig.NetworkMode === "string"
          ? hostConfig.NetworkMode
          : "";

      if (networkMode === "host") {
        findings.push({
          containerId: container.Id,
          containerName,
          severity: "CRITICAL",
          type: "HOST_NETWORK",
          title: "Host network mode enabled",
          description:
            "Container menggunakan host network sehingga isolasi jaringan Docker dilewati.",
        });
      }

      const ports = container.Ports ?? [];

      if (ports.length === 0) {
        continue;
      }

      for (const port of ports) {
        const privatePort = port.PrivatePort;
        const publicPort = port.PublicPort;

        const bindings =
          Array.isArray(port.IP) && port.IP.length > 0
            ? port.IP
            : ["0.0.0.0"];

        for (const binding of bindings) {
          const portLabel = `${publicPort ?? privatePort}/${port.Type ?? "tcp"}`;

          if (binding === "0.0.0.0" || binding === "::") {
            const severity =
              publicPort === 22 ||
              publicPort === 2375 ||
              publicPort === 2376
                ? "CRITICAL"
                : "WARNING";

            findings.push({
              containerId: container.Id,
              containerName,
              severity,
              type: "PUBLIC_BINDING",
              title: "Port exposed on all interfaces",
              description:
                `Port ${portLabel} dipublish pada ${binding} dan dapat menerima koneksi dari semua network interface host.`,
              port: portLabel,
              binding,
            });
          } else {
            findings.push({
              containerId: container.Id,
              containerName,
              severity: "INFO",
              type: "BOUND_PORT",
              title: "Published container port",
              description:
                `Port ${portLabel} hanya dibind pada ${binding}.`,
              port: portLabel,
              binding,
            });
          }
        }
      }
    }

    const summary = {
      total: findings.length,
      critical: findings.filter(
        (item) => item.severity === "CRITICAL"
      ).length,
      warning: findings.filter(
        (item) => item.severity === "WARNING"
      ).length,
      info: findings.filter(
        (item) => item.severity === "INFO"
      ).length,
    };

    const status =
      summary.critical > 0
        ? "CRITICAL"
        : summary.warning > 0
          ? "WARNING"
          : "PASS";

    return NextResponse.json({
      success: true,
      status,
      summary,
      findings,
      scannedContainers: containers.length,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Network security scan error:", error);

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