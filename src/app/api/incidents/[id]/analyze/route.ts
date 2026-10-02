import { NextResponse } from "next/server";
import Docker from "dockerode";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/rbac";

const docker = new Docker({
  socketPath:
    process.platform === "win32"
      ? "//./pipe/docker_engine"
      : "/var/run/docker.sock",
});

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    if (incident.projectId) {
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: user.userId,
            projectId: incident.projectId,
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "You are not a member of this project" },
          { status: 403 }
        );
      }
    }

    const latestDeployment = incident.projectId
      ? await prisma.deployment.findFirst({
          where: {
            projectId: incident.projectId,
          },
          orderBy: {
            createdAt: "desc",
          },
        })
      : null;

    let containerStats: unknown = null;
    let containerLogs = "";

    if (latestDeployment?.containerId) {
      try {
        const container = docker.getContainer(latestDeployment.containerId);

        const stats = await container.stats({
          stream: false,
        });

        containerStats = {
          cpuPercent: calculateCpuPercent(stats),
          memoryUsage: stats.memory_stats?.usage ?? 0,
          memoryLimit: stats.memory_stats?.limit ?? 0,
          memoryPercent: calculateMemoryPercent(stats),
          networkRxBytes: getNetworkBytes(stats, "rx_bytes"),
          networkTxBytes: getNetworkBytes(stats, "tx_bytes"),
        };

        const logs = await container.logs({
          stdout: true,
          stderr: true,
          tail: 100,
          timestamps: true,
        });

        containerLogs = Buffer.from(logs).toString("utf8");
      } catch (error) {
        containerLogs =
          error instanceof Error
            ? `Docker inspection failed: ${error.message}`
            : "Docker inspection failed";
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENROUTER_API_KEY is not configured. Add it to the local .env file.",
        },
        { status: 500 }
      );
    }

    const model =
      process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4";

    const prompt = `
You are NEXUS AI, an expert DevOps incident response assistant.

Analyze the following production incident using the available evidence.

INCIDENT
Title: ${incident.title}
Description: ${incident.description ?? "No description provided"}
Severity: ${incident.severity}
Status: ${incident.status}

PROJECT
Name: ${incident.project?.name ?? "Unknown"}

LATEST DEPLOYMENT
Status: ${latestDeployment?.status ?? "No deployment found"}
Branch: ${latestDeployment?.branch ?? "Unknown"}
Image: ${latestDeployment?.imageName ?? "Unknown"}
Container ID: ${latestDeployment?.containerId ?? "No container"}

CONTAINER METRICS
${JSON.stringify(containerStats, null, 2)}

RECENT CONTAINER LOGS
${containerLogs || "No container logs available"}

Return the analysis using exactly these sections:

ROOT CAUSE
Explain the most likely technical root cause.

EVIDENCE
List concrete evidence from the incident, deployment, metrics, or logs.

IMPACT
Explain the likely impact on the application or infrastructure.

RECOMMENDED ACTIONS
Provide practical actions to investigate, mitigate, and prevent recurrence.

CONFIDENCE
Give a confidence level as LOW, MEDIUM, or HIGH and briefly explain why.

Do not invent evidence that is not present in the supplied data.
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "NEXUS Intelligent Infrastructure Platform",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          messages: [
            {
              role: "system",
              content:
                "You are a senior DevOps and Site Reliability Engineering assistant.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          error: "OpenRouter request failed",
          details: errorText,
        },
        { status: 502 }
      );
    }

    const result = await response.json();

    const analysis =
      result?.choices?.[0]?.message?.content?.trim() ||
      "AI returned an empty analysis.";

    const rootCauseMatch = analysis.match(
      /ROOT CAUSE\s*([\s\S]*?)(?=\nEVIDENCE|$)/i
    );

    const rootCause =
      rootCauseMatch?.[1]?.trim() || analysis.slice(0, 1000);

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: {
        aiAnalysis: analysis,
        rootCause,
        status: incident.status === "OPEN" ? "INVESTIGATING" : incident.status,
      },
      include: {
        project: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "AI_INCIDENT_ANALYSIS",
        entity: "Incident",
        entityId: incident.id,
        metadata: JSON.stringify({
          model,
          deploymentId: latestDeployment?.id ?? null,
          containerId: latestDeployment?.containerId ?? null,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      incident: updatedIncident,
      analysis,
      model,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to analyze incident";

    console.error("[NEXUS AI INCIDENT ANALYSIS ERROR]", error);

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}

function calculateCpuPercent(stats: Docker.ContainerStats): number {
  const cpuDelta =
    (stats.cpu_stats?.cpu_usage?.total_usage ?? 0) -
    (stats.precpu_stats?.cpu_usage?.total_usage ?? 0);

  const systemDelta =
    (stats.cpu_stats?.system_cpu_usage ?? 0) -
    (stats.precpu_stats?.system_cpu_usage ?? 0);

  const cpuCount = stats.cpu_stats?.online_cpus ?? 1;

  if (systemDelta <= 0 || cpuDelta <= 0) {
    return 0;
  }

  return Number(((cpuDelta / systemDelta) * cpuCount * 100).toFixed(2));
}

function calculateMemoryPercent(stats: Docker.ContainerStats): number {
  const usage = stats.memory_stats?.usage ?? 0;
  const limit = stats.memory_stats?.limit ?? 0;

  if (!limit) {
    return 0;
  }

  return Number(((usage / limit) * 100).toFixed(2));
}

function getNetworkBytes(
  stats: Docker.ContainerStats,
  field: "rx_bytes" | "tx_bytes"
): number {
  const networks = stats.networks ?? {};

  return Object.values(networks).reduce(
    (total, network) => total + Number(network[field] ?? 0),
    0
  );
}
