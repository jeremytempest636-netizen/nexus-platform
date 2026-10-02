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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const deployment = await prisma.deployment.findUnique({
      where: {
        id,
      },
      include: {
        project: true,
        triggeredBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!deployment) {
      return NextResponse.json(
        {
          error: "Deployment not found",
        },
        { status: 404 }
      );
    }

    const membership = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.userId,
          projectId: deployment.projectId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: "You are not a member of this project",
        },
        { status: 403 }
      );
    }

    let container = null;
    let applicationUrl = null;
    let containerStatus = "NOT_FOUND";
    let ports: Array<{
      privatePort?: number;
      publicPort?: number;
      type?: string;
    }> = [];

    if (deployment.containerId) {
      try {
        const dockerContainer = docker.getContainer(
          deployment.containerId
        );

        const inspect = await dockerContainer.inspect();

        containerStatus = inspect.State?.Status ?? "UNKNOWN";

        ports = Object.entries(
          inspect.NetworkSettings?.Ports ?? {}
        ).flatMap(([containerPort, bindings]) => {
          const privatePort = Number(
            containerPort.split("/")[0]
          );

          if (!bindings) {
            return [
              {
                privatePort,
                publicPort: undefined,
                type: containerPort.split("/")[1] ?? "tcp",
              },
            ];
          }

          return bindings.map((binding) => ({
            privatePort,
            publicPort: binding?.HostPort
              ? Number(binding.HostPort)
              : undefined,
            type: containerPort.split("/")[1] ?? "tcp",
          }));
        });

        const publishedPort = ports.find(
          (port) => port.publicPort
        )?.publicPort;

        if (publishedPort) {
          applicationUrl =
            `http://localhost:${publishedPort}`;
        }

        container = {
          id: inspect.Id,
          name: inspect.Name?.replace(/^\//, ""),
          status: containerStatus,
          running: Boolean(inspect.State?.Running),
          startedAt: inspect.State?.StartedAt ?? null,
        };
      } catch {
        containerStatus = "NOT_FOUND";
      }
    }

    return NextResponse.json({
      success: true,
      deployment: {
        id: deployment.id,
        status: deployment.status,
        branch: deployment.branch,
        imageName: deployment.imageName,
        containerId: deployment.containerId,
        containerName: container?.name ?? null,
        containerStatus,
        container,
        ports,
        applicationUrl,
        project: {
          id: deployment.project.id,
          name: deployment.project.name,
          slug: deployment.project.slug,
        },
        triggeredBy: deployment.triggeredBy,
        logs: deployment.logs,
        startedAt: deployment.startedAt,
        finishedAt: deployment.finishedAt,
        createdAt: deployment.createdAt,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load deployment";

    console.error(
      "[NEXUS DEPLOYMENT DETAIL ERROR]",
      error
    );

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}