import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type NpmAuditData = {
  metadata?: {
    vulnerabilities?: {
      info?: number;
      low?: number;
      moderate?: number;
      high?: number;
      critical?: number;
      total?: number;
    };
  };
  vulnerabilities?: Record<
    string,
    {
      severity?: string;
      isDirect?: boolean;
      via?: unknown[];
      fixAvailable?: unknown;
    }
  >;
};

export async function GET() {
  try {
    const { stdout } = await execFileAsync(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["audit", "--json", "--audit-level=none"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    const data = JSON.parse(stdout) as NpmAuditData;

    const vulnerabilities = data.metadata?.vulnerabilities ?? {};

    const critical = vulnerabilities.critical ?? 0;
    const high = vulnerabilities.high ?? 0;
    const moderate = vulnerabilities.moderate ?? 0;
    const low = vulnerabilities.low ?? 0;
    const info = vulnerabilities.info ?? 0;
    const total = vulnerabilities.total ?? (
      critical + high + moderate + low + info
    );

    const findings = Object.entries(data.vulnerabilities ?? {}).map(
      ([name, vulnerability]) => ({
        package: name,
        severity: String(vulnerability.severity ?? "unknown").toUpperCase(),
        direct: Boolean(vulnerability.isDirect),
        via: vulnerability.via ?? [],
        fixAvailable: Boolean(vulnerability.fixAvailable),
      })
    );

    let status: "PASS" | "WARNING" | "HIGH" | "CRITICAL" = "PASS";

    if (critical > 0) {
      status = "CRITICAL";
    } else if (high > 0) {
      status = "HIGH";
    } else if (moderate > 0 || low > 0) {
      status = "WARNING";
    }

    return NextResponse.json({
      success: true,
      status,
      summary: {
        total,
        critical,
        high,
        moderate,
        low,
        info,
      },
      findings,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "npm audit failed";

    return NextResponse.json(
      {
        success: false,
        status: "ERROR",
        error: message,
        scannedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}