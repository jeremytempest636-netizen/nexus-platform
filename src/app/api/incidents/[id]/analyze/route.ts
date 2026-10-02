import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Docker from "dockerode";
import { requireAuth } from "@/lib/auth/rbac";

const docker = new Docker({
  socketPath:
    process.platform === "win32"
      ? "//./pipe/docker_engine"
      : "/var/run/docker.sock",
});

function buildPrompt(input: {
  incident: {
    title: string;
    description: string | null;
    severity: string;
    status: string;
  };
  container: unknown;
  metrics: unknown[];
  logs: string;
  deployment: unknown;
}) {
  return `
You are NEXUS AI DevOps Copilot.

Analyze this infrastructure incident using only the available evidence.

INCIDENT
Title: ${input.incident.title}
Description: ${input.incident.description ?? "No description"}
Severity: ${input.incident.severity}
Status: ${input.incident.status}

CONTAINER STATE
${JSON.stringify(input.container, null, 2)}

RECENT CONTAINER METRICS
${JSON.stringify(input.metrics, null, 2)}

CONTAINER LOGS
${input.logs || "No logs available"}

LATEST DEPLOYMENT
${JSON.stringify(input.deployment, null, 2)}

Return a concise operational analysis with these sections:

ROOT CAUSE:
Most likely technical root cause.

EVIDENCE:
Specific evidence supporting the conclusion.

IMPACT:
Likely impact on the application or infrastructure.

RECOMMENDED ACTIONS:
Concrete actions a DevOps engineer should take.

CONFIDENCE:
LOW, MEDIUM, or HIGH.

Do not invent evidence that is not present.
If evidence is insufficient, explicitly state what information is missing.
`;
}

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

    let container: unknown = null;
    let metrics: unknown[] = [];
    let logs = "";

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

    const deployment = latestDeployment
      ? {
          id: latestDeployment.id,
          status: latestDeployment.status,
          branch: latestDeployment.branch,
          imageName: latestDeployment.imageName,
          containerId: latestDeployment.containerId,
          startedAt: latestDeployment.startedAt,
          finishedAt: latestDeployment.finishedAt,
        }
      : null;

    if (latestDeployment?.containerId) {
      try {
        const dockerContainer = docker.getContainer(
          latestDeployment.containerId
        );

        const inspect = await dockerContainer.inspect();

        container = {
          id: inspect.Id,
          name: inspect.Name?.replace(/^\//, ""),
          state: inspect.State,
          image: inspect.Config?.Image,
          restartCount: inspect.RestartCount,
          ports: inspect.NetworkSettings?.Ports,
        };

        try {
          const stats = await dockerContainer.stats({
            stream: false,
          });

          const cpuDelta =
            Number(stats.cpu_stats?.cpu_usage?.total_usage ?? 0) -
            Number(stats.precpu_stats?.cpu_usage?.total_usage ?? 0);

          const systemDelta =
            Number(stats.cpu_stats?.system_cpu_usage ?? 0) -
            Number(stats.precpu_stats?.system_cpu_usage ?? 0);

          const onlineCpus =
            Number(stats.cpu_stats?.online_cpus ?? 1);

          const cpuPercent =
            systemDelta > 0
              ? (cpuDelta / systemDelta) * onlineCpus * 100
              : 0;

          const memoryUsage = Number(
            stats.memory_stats?.usage ?? 0
          );

          const memoryLimit = Number(
            stats.memory_stats?.limit ?? 0
          );

          const memoryPercent =
            memoryLimit > 0
              ? (memoryUsage / memoryLimit) * 100
              : 0;

          metrics.push({
            cpuPercent: Number(cpuPercent.toFixed(2)),
            memoryUsage,
            memoryLimit,
            memoryPercent: Number(memoryPercent.toFixed(2)),
          });
        } catch {
          metrics = [];
        }

        try {
          const logBuffer = await dockerContainer.logs({
            stdout: true,
            stderr: true,
            tail: 100,
          });

          logs = logBuffer.toString("utf8").slice(-12000);
        } catch {
          logs = "";
        }
      } catch {
        container = {
          status: "CONTAINER_NOT_FOUND",
          containerId: latestDeployment.containerId,
        };
      }
    }

    const prompt = buildPrompt({
      incident: {
        title: incident.title,
        description: incident.description,
        severity: incident.severity,
        status: incident.status,
      },
      container,
      metrics,
      logs,
      deployment,
    });

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENROUTER_API_KEY is not configured. Add it to .env before using AI analysis.",
        },
        { status: 503 }
      );
    }

    const model =
      process.env.OPENROUTER_MODEL ??
      "anthropic/claude-sonnet-4";

    const aiResponse = await fetch(
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
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content:
                "You are a senior DevOps and Site Reliability Engineering assistant. Analyze evidence conservatively and never invent infrastructure facts.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error("[NEXUS AI ERROR]", aiData);

      return NextResponse.json(
        {
          error:
            aiData?.error?.message ??
            "AI provider request failed",
        },
        { status: 502 }
      );
    }

    const analysis =
      aiData?.choices?.[0]?.message?.content;

    if (!analysis) {
      return NextResponse.json(
        { error: "AI returned an empty analysis" },
        { status: 502 }
      );
    }

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: {
        aiAnalysis: analysis,
        rootCause: analysis,
        status:
          incident.status === "OPEN"
            ? "INVESTIGATING"
            : incident.status,
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
          severity: incident.severity,
          projectId: incident.projectId,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      analysis,
      incident: updatedIncident,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to analyze incident";

    console.error("[NEXUS INCIDENT AI ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}