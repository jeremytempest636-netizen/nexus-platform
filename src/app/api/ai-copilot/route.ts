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

type DockerTelemetry = {
  containerId: string;
  containerName: string;
  status: string;
  running: boolean;
  restartCount: number;
  image: string;
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  logs: string;
};

function calculateCpuPercent(
  stats: Docker.ContainerStats,
): number {
  const cpuDelta =
    (stats.cpu_stats?.cpu_usage?.total_usage ?? 0) -
    (stats.precpu_stats?.cpu_usage?.total_usage ?? 0);

  const systemDelta =
    (stats.cpu_stats?.system_cpu_usage ?? 0) -
    (stats.precpu_stats?.system_cpu_usage ?? 0);

  const cpuCount =
    stats.cpu_stats?.online_cpus ??
    stats.cpu_stats?.cpu_usage?.percpu_usage?.length ??
    1;

  if (systemDelta <= 0 || cpuDelta < 0) {
    return 0;
  }

  return Number(
    ((cpuDelta / systemDelta) * cpuCount * 100).toFixed(2),
  );
}

function calculateMemoryPercent(
  stats: Docker.ContainerStats,
): number {
  const usage = stats.memory_stats?.usage ?? 0;
  const limit = stats.memory_stats?.limit ?? 0;

  if (!limit) {
    return 0;
  }

  return Number(((usage / limit) * 100).toFixed(2));
}

async function getDockerTelemetry(
  containerId: string,
): Promise<DockerTelemetry | null> {
  try {
    const container = docker.getContainer(containerId);
    const inspect = await container.inspect();

    let stats: Docker.ContainerStats | null = null;

    try {
      stats = await container.stats({ stream: false });
    } catch {
      stats = null;
    }

    let logs = "";

    try {
      logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: 25,
        timestamps: true,
      }) as unknown as string;

      logs = logs
        .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
        .slice(-6000);
    } catch {
      logs = "Docker logs unavailable.";
    }

    return {
      containerId: inspect.Id,
      containerName:
        inspect.Name?.replace(/^\//, "") ?? "unknown",
      status: inspect.State?.Status ?? "unknown",
      running: Boolean(inspect.State?.Running),
      restartCount: inspect.RestartCount ?? 0,
      image: inspect.Config?.Image ?? "unknown",
      cpuPercent: stats ? calculateCpuPercent(stats) : 0,
      memoryUsage: stats?.memory_stats?.usage ?? 0,
      memoryLimit: stats?.memory_stats?.limit ?? 0,
      memoryPercent: stats
        ? calculateMemoryPercent(stats)
        : 0,
      logs,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    const body = await request.json();

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    const projectId =
      typeof body?.projectId === "string"
        ? body.projectId
        : "";

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "Project is required" },
        { status: 400 },
      );
    }

    const membership =
      await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: user.userId,
            projectId,
          },
        },
      });

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "You are not a member of this project",
        },
        { status: 403 },
      );
    }

    const project =
      await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          deployments: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
          incidents: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
      });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    const latestDeployment =
      project.deployments[0] ?? null;

    const telemetry =
      latestDeployment?.containerId
        ? await getDockerTelemetry(
            latestDeployment.containerId,
          )
        : null;

    const deploymentContext =
      project.deployments.length > 0
        ? project.deployments
            .map(
              (deployment) =>
                `Deployment ${deployment.id}: status=${deployment.status}, branch=${deployment.branch}, image=${deployment.imageName}, container=${deployment.containerId ?? "none"}`
            )
            .join("\n")
        : "No deployments found.";

    const incidentContext =
      project.incidents.length > 0
        ? project.incidents
            .map(
              (incident) =>
                `Incident: ${incident.title}, severity=${incident.severity}, status=${incident.status}, rootCause=${incident.rootCause ?? "unknown"}`
            )
            .join("\n")
        : "No incidents found.";

    const telemetryContext = telemetry
      ? [
          `Container: ${telemetry.containerName}`,
          `Status: ${telemetry.status}`,
          `Running: ${telemetry.running}`,
          `Restart count: ${telemetry.restartCount}`,
          `Image: ${telemetry.image}`,
          `CPU: ${telemetry.cpuPercent}%`,
          `Memory: ${telemetry.memoryPercent}%`,
          `Docker logs: ${telemetry.logs}`,
        ].join("\n")
      : "No Docker telemetry available.";

    const prompt = `
PROJECT
Name: ${project.name}
Status: ${project.status}
Repository: ${project.repository ?? "not configured"}

RECENT DEPLOYMENTS
${deploymentContext}

RECENT INCIDENTS
${incidentContext}

DOCKER TELEMETRY
${telemetryContext}

USER QUESTION
${message}
`;

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENROUTER_API_KEY is not configured",
        },
        { status: 500 },
      );
    }

    const model =
      process.env.OPENROUTER_MODEL ??
      "openrouter/free";

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "NEXUS AI DevOps Copilot",
        },
        body: JSON.stringify({
          model,
          max_tokens: 500,
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content: `
You are NEXUS AI, a professional DevOps and SRE assistant.

Rules:
- Answer directly. Never output hidden reasoning or chain-of-thought.
- Never mention a thinking process.
- Never invent infrastructure data.
- Use only the project context supplied by NEXUS.
- Answer in Indonesian.
- Be concise and operational.
- When asked about deployment, report the actual deployment status and Docker telemetry when available.
- Distinguish observed facts from possible causes.
- If data is unavailable, say exactly what is missing.
- Use Markdown bullet points when useful.
`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      console.error(
        "[NEXUS AI COPILOT OPENROUTER ERROR]",
        response.status,
        JSON.stringify(result),
      );

      return NextResponse.json(
        {
          error:
            result?.error?.message ??
            "OpenRouter request failed",
        },
        { status: 502 },
      );
    }

    const messageResult = result?.choices?.[0]?.message;

    const rawContent = messageResult?.content;

    let answer =
      typeof rawContent === "string"
        ? rawContent.trim()
        : Array.isArray(rawContent)
          ? rawContent
              .map((item: unknown) => {
                if (
                  typeof item === "object" &&
                  item !== null &&
                  "text" in item &&
                  typeof (item as { text?: unknown }).text === "string"
                ) {
                  return (item as { text: string }).text;
                }

                return "";
              })
              .join("")
              .trim()
          : "";

    /*
     * Some OpenRouter free models return the response
     * inside the reasoning field instead of content.
     * Extract only the final operational answer from it.
     */
    if (!answer && typeof messageResult?.reasoning === "string") {
      const reasoning = messageResult.reasoning.trim();

      const marker =
        reasoning.lastIndexOf("Final Answer:");

      if (marker >= 0) {
        answer = reasoning
          .slice(marker + "Final Answer:".length)
          .trim();
      } else {
        const lines = reasoning
          .split("\n")
          .map((line: string) => line.trim())
          .filter(Boolean);

        const usefulLines = lines.filter(
          (line: string) =>
            !/^thinking process:?$/i.test(line) &&
            !/^\d+\.\s+\*\*.*\*\*:?$/i.test(line) &&
            !/^\*\*\w.*\*\*:?$/i.test(line) &&
            !/^\*\s+\*\*.*\*\*:?$/i.test(line),
        );

        answer = usefulLines
          .filter(
            (line: string) =>
              !/^[-*]\s+(analyze|extract|context|language|constraints)/i.test(
                line,
              ),
          )
          .slice(-8)
          .join("\n")
          .trim();
      }
    }

    if (!answer) {
      console.error(
        "[NEXUS AI COPILOT EMPTY RESPONSE]",
        JSON.stringify(result),
      );

      return NextResponse.json(
        {
          error: "AI returned an empty response.",
        },
        { status: 502 },
      );
    }

    await prisma.aiCopilotSession.create({
      data: {
        userId: user.userId,
        projectId,
        message,
        answer,
        model,
        telemetryAvailable: Boolean(
          telemetry,
        ),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "AI_COPILOT_QUERY",
        entity: "Project",
        entityId: projectId,
        metadata: JSON.stringify({
          model,
          telemetryAvailable: Boolean(
            telemetry,
          ),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      answer,
      model,
      projectId,
      telemetryAvailable: Boolean(
        telemetry,
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "AI Copilot request failed";

    console.error(
      "[NEXUS AI COPILOT ERROR]",
      error,
    );

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
