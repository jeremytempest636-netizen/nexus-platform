import { NextResponse } from "next/server";
import { docker } from "@/lib/docker/client";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

function classifyLog(line: string): LogLevel {
  if (/error|exception|fatal|failed/i.test(line)) {
    return "ERROR";
  }
  if (/warn|warning/i.test(line)) {
    return "WARN";
  }
  if (/debug/i.test(line)) {
    return "DEBUG";
  }
  return "INFO";
}

function parseLogs(raw: string) {
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => ({
      id: index,
      level: classifyLog(line),
      message: line,
    }));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const containerId = url.searchParams.get("containerId");

    const containers = await docker.listContainers({
      all: true,
    });

    const containerList = containers.map((container) => ({
      id: container.Id,
      name: (container.Names?.[0] ?? container.Id).replace(/^\//, ""),
      image: container.Image,
      state: container.State,
      status: container.Status,
    }));

    if (!containerId) {
      return NextResponse.json({
        success: true,
        containers: containerList,
      });
    }

    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    const rawLogs = await container.logs({
      stdout: true,
      stderr: true,
      timestamps: true,
      tail: 500,
    });

    const rawText =
      Buffer.isBuffer(rawLogs)
        ? rawLogs.toString("utf8")
        : String(rawLogs);

    const logs = parseLogs(rawText);

    return NextResponse.json({
      success: true,
      container: {
        id: info.Id,
        name: info.Name.replace(/^\//, ""),
        image: info.Config?.Image ?? "",
        state: info.State?.Status ?? "unknown",
      },
      logs,
    });
  } catch (error) {
    console.error("Logs API error:", error);
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