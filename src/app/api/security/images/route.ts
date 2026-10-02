import { NextResponse } from "next/server";
import { docker } from "@/lib/docker/client";

export async function GET() {
  try {
    const images = await docker.listImages({ all: true });

    const results = [];

    for (const imageInfo of images) {
      const image = docker.getImage(imageInfo.Id);
      const inspect = await image.inspect();

      const repoTags = inspect.RepoTags ?? [];
      const config = inspect.Config ?? {};

      const findings = [];

      const user = config.User || "root";

      if (!config.User) {
        findings.push({
          severity: "WARNING",
          title: "Image runs as root",
          description:
            "Image tidak menentukan USER non-root. Container dapat berjalan sebagai root secara default.",
        });
      } else {
        findings.push({
          severity: "PASS",
          title: "Non-default container user configured",
          description: `Image menentukan user "${config.User}".`,
        });
      }

      const exposedPorts = Object.keys(config.ExposedPorts ?? {});

      if (exposedPorts.length > 0) {
        findings.push({
          severity: "INFO",
          title: "Exposed ports detected",
          description: exposedPorts.join(", "),
        });
      }

      if (config.Healthcheck) {
        findings.push({
          severity: "PASS",
          title: "Healthcheck configured",
          description:
            "Image memiliki Docker healthcheck.",
        });
      } else {
        findings.push({
          severity: "WARNING",
          title: "No healthcheck configured",
          description:
            "Image tidak memiliki Docker healthcheck.",
        });
      }

      results.push({
        id: imageInfo.Id,
        tags: repoTags,
        size: imageInfo.Size,
        created: inspect.Created,
        architecture: inspect.Architecture,
        os: inspect.Os,
        user,
        exposedPorts,
        findings,
      });
    }

    const critical = results.reduce(
      (count, image) =>
        count +
        image.findings.filter(
          (finding) => finding.severity === "CRITICAL"
        ).length,
      0
    );

    const warning = results.reduce(
      (count, image) =>
        count +
        image.findings.filter(
          (finding) => finding.severity === "WARNING"
        ).length,
      0
    );

    return NextResponse.json({
      success: true,
      images: results,
      summary: {
        images: results.length,
        critical,
        warning,
      },
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Image security scan error:", error);

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
