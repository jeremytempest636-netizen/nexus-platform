import { NextResponse } from "next/server";
import { docker } from "@/lib/docker/client";

type SecretFinding = {
  containerId: string;
  containerName: string;
  variable: string;
  severity: "WARNING" | "CRITICAL";
  reason: string;
};

const SECRET_PATTERNS = [
  "PASSWORD",
  "PASSWD",
  "SECRET",
  "TOKEN",
  "API_KEY",
  "APIKEY",
  "PRIVATE_KEY",
  "ACCESS_KEY",
  "AUTH",
  "CREDENTIAL",
  "DATABASE_URL",
  "CONNECTION_STRING",
];

function looksLikeSecret(name: string) {
  const normalized = name.toUpperCase();
  return SECRET_PATTERNS.some((pattern) =>
    normalized.includes(pattern)
  );
}

function isHighRiskSecret(name: string) {
  const normalized = name.toUpperCase();

  return [
    "PRIVATE_KEY",
    "AWS_SECRET",
    "SECRET_KEY",
    "API_KEY",
    "ACCESS_TOKEN",
    "AUTH_TOKEN",
    "DATABASE_URL",
    "CONNECTION_STRING",
  ].some((pattern) => normalized.includes(pattern));
}

export async function GET() {
  try {
    const containers = await docker.listContainers({
      all: true,
    });

    const findings: SecretFinding[] = [];

    for (const container of containers) {
      const details = await docker.getContainer(
        container.Id
      ).inspect();

      const env = details.Config?.Env ?? [];

      for (const entry of env) {
        const separator = entry.indexOf("=");

        if (separator === -1) {
          continue;
        }

        const variable = entry.slice(0, separator);

        if (!looksLikeSecret(variable)) {
          continue;
        }

        const severity = isHighRiskSecret(variable)
          ? "CRITICAL"
          : "WARNING";

        findings.push({
          containerId: container.Id,
          containerName:
            details.Name?.replace(/^\//, "") ||
            container.Id.slice(0, 12),
          variable,
          severity,
          reason:
            severity === "CRITICAL"
              ? "Environment variable appears to contain a high-risk credential or secret."
              : "Environment variable name suggests sensitive configuration.",
        });
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
      note: "Secret values are never returned by this endpoint.",
    });
  } catch (error) {
    console.error("Secrets security scan error:", error);

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