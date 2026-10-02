import { NextResponse } from "next/server";
import { docker } from "@/lib/docker/client";

type FindingSeverity = "PASS" | "WARNING" | "CRITICAL";

type Finding = {
  severity: FindingSeverity;
  title: string;
  description: string;
  container?: string;
};

export async function GET() {
  try {
    
    const containers = await docker.listContainers({ all: true });

    const findings: Finding[] = [];
    const scannedContainers = [];

    for (const containerInfo of containers) {
      const container = docker.getContainer(containerInfo.Id);
      const inspect = await container.inspect();

      const name =
        inspect.Name?.replace(/^\//, "") ||
        containerInfo.Id.slice(0, 12);

      const hostConfig = inspect.HostConfig ?? {};
      const networkSettings = inspect.NetworkSettings ?? {};
      const config = inspect.Config ?? {};

      scannedContainers.push({
        id: containerInfo.Id,
        name,
        image: inspect.Config?.Image ?? containerInfo.Image,
        state: inspect.State?.Status ?? "unknown",
      });

      if (hostConfig.Privileged) {
        findings.push({
          severity: "CRITICAL",
          title: "Privileged container",
          description:
            "Container berjalan dengan mode privileged dan memiliki akses host yang sangat luas.",
          container: name,
        });
      } else {
        findings.push({
          severity: "PASS",
          title: "Privileged mode disabled",
          description: "Container tidak berjalan dalam privileged mode.",
          container: name,
        });
      }

      if (hostConfig.NetworkMode === "host") {
        findings.push({
          severity: "WARNING",
          title: "Host network enabled",
          description:
            "Container menggunakan network host sehingga isolasi jaringan berkurang.",
          container: name,
        });
      } else {
        findings.push({
          severity: "PASS",
          title: "Network isolation enabled",
          description: "Container menggunakan network namespace terisolasi.",
          container: name,
        });
      }

      if (hostConfig.PidMode === "host") {
        findings.push({
          severity: "CRITICAL",
          title: "Host PID namespace enabled",
          description:
            "Container dapat melihat process namespace milik host.",
          container: name,
        });
      } else {
        findings.push({
          severity: "PASS",
          title: "PID isolation enabled",
          description: "Container tidak menggunakan host PID namespace.",
          container: name,
        });
      }

      if (hostConfig.ReadonlyRootfs) {
        findings.push({
          severity: "PASS",
          title: "Read-only root filesystem",
          description:
            "Root filesystem container bersifat read-only.",
          container: name,
        });
      } else {
        findings.push({
          severity: "WARNING",
          title: "Writable root filesystem",
          description:
            "Root filesystem container masih dapat ditulis.",
          container: name,
        });
      }

      const exposedPorts = Object.keys(config.ExposedPorts ?? {});
      const publishedPorts = Object.values(
        networkSettings.Ports ?? {}
      ).flatMap((bindings) =>
        bindings?.map((binding) => ({
          privatePort: binding?.HostPort,
          hostIp: binding?.HostIp,
        })) ?? []
      );

      if (publishedPorts.length > 0) {
        findings.push({
          severity: "WARNING",
          title: "Published ports detected",
          description:
            `Container memiliki ${publishedPorts.length} port yang dipublish ke host.`,
          container: name,
        });
      } else if (exposedPorts.length > 0) {
        findings.push({
          severity: "PASS",
          title: "Ports not published",
          description:
            "Container mendeklarasikan port tetapi tidak mempublish port ke host.",
          container: name,
        });
      } else {
        findings.push({
          severity: "PASS",
          title: "No exposed ports",
          description:
            "Tidak ditemukan port yang diekspos oleh container.",
          container: name,
        });
      }
    }

    const critical = findings.filter(
      (item) => item.severity === "CRITICAL"
    ).length;

    const warning = findings.filter(
      (item) => item.severity === "WARNING"
    ).length;

    const pass = findings.filter(
      (item) => item.severity === "PASS"
    ).length;

    const status =
      critical > 0
        ? "CRITICAL"
        : warning > 0
          ? "WARNING"
          : "PASS";

    return NextResponse.json({
      success: true,
      status,
      scannedContainers,
      summary: {
        containers: scannedContainers.length,
        critical,
        warning,
        pass,
      },
      findings,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Security scan error:", error);

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
