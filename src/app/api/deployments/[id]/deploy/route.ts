import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Docker from "dockerode";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { requireAuth } from "@/lib/auth/rbac";

const execFileAsync = promisify(execFile);

const docker = new Docker({
  socketPath:
    process.platform === "win32"
      ? "//./pipe/docker_engine"
      : "/var/run/docker.sock",
});

type Params = {
  params: Promise<{
    id: string;
  }>;
};

function cleanImageName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._/-]/g, "-")
    .replace(/\/+/g, "/")
    .replace(/-+/g, "-");
}

function createLog(message: string) {
  return `[${new Date().toISOString()}] ${message}`;
}

async function findAvailableHostPort() {
  const containers = await docker.listContainers({ all: true });

  const usedPorts = new Set<number>();

  for (const container of containers) {
    for (const port of container.Ports ?? []) {
      if (port.PublicPort) {
        usedPorts.add(port.PublicPort);
      }
    }
  }

  for (let port = 3000; port <= 3999; port++) {
    if (!usedPorts.has(port)) {
      return port;
    }
  }

  throw new Error("No available host port in range 3000-3999.");
}

export async function POST(
  _request: Request,
  { params }: Params
) {
  let deploymentId = "";

  try {
    const user = await requireAuth();

    const { id } = await params;
    deploymentId = id;

    const deployment = await prisma.deployment.findUnique({
      where: {
        id,
      },
      include: {
        project: true,
      },
    });

    const repository = deployment?.project?.repository ?? "";

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

    if (!(repository)) {
      return NextResponse.json(
        {
          error: "Project repository is required before deployment",
        },
        { status: 400 }
      );
    }

    const imageName = cleanImageName(deployment.imageName ?? "");

    const workDir = path.join(
      os.tmpdir(),
      `nexus-deployment-${deployment.id}`
    );

    const containerName =
      `nexus-${deployment.project.slug}-${deployment.id.slice(-8)}`
        .replace(/[^a-zA-Z0-9_.-]/g, "-");

    const logs: string[] = [];

    const log = (message: string) => {
      const entry = createLog(message);
      logs.push(entry);
      return entry;
    };

    await prisma.deployment.update({
      where: {
        id: deployment.id,
      },
      data: {
        status: "BUILDING",
        startedAt: new Date(),
        finishedAt: null,
        containerId: null,
        logs: log(
          `Starting deployment for "${deployment.project.name}".`
        ),
      },
    });

    try {
      await fs.rm(workDir, {
        recursive: true,
        force: true,
      });

      await fs.mkdir(workDir, {
        recursive: true,
      });

      logs.push(
        log(`Repository: ${(repository)}`)
      );

      logs.push(
        log(`Branch: ${deployment.branch}`)
      );

      logs.push(
        log(`Docker image: ${imageName}`)
      );

      logs.push(
        log("Cloning repository...")
      );

      await execFileAsync(
        "git",
        [
          "clone",
          "--depth",
          "1",
          "--branch",
          deployment.branch ?? "main",
          (repository) ?? "",
          workDir,
        ],
        {
          windowsHide: true,
        }
      );

      logs.push(
        log("Repository cloned successfully.")
      );

      const dockerfilePath = path.join(
        workDir,
        "Dockerfile"
      );

      try {
        await fs.access(dockerfilePath);
      } catch {
        throw new Error(
          "Dockerfile not found in repository."
        );
      }

      logs.push(
        log("Dockerfile detected.")
      );

      await prisma.deployment.update({
        where: {
          id: deployment.id,
        },
        data: {
          status: "BUILDING",
          logs: logs.join("\n"),
        },
      });

      logs.push(
        log("Building Docker image...")
      );

      const buildStream = await docker.buildImage(
        {
          context: workDir,
          src: ["."],
        },
        {
          t: imageName,
        }
      );

      await new Promise<void>((resolve, reject) => {
        docker.modem.followProgress(
          buildStream,
          (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          },
          (event) => {
            if (event?.stream) {
              const line = event.stream.trim();

              if (line) {
                logs.push(line);
              }
            }

            if (event?.error) {
              logs.push(event.error);
            }
          }
        );
      });

      logs.push(
        log(`Docker image "${imageName}" built successfully.`)
      );

      await prisma.deployment.update({
        where: {
          id: deployment.id,
        },
        data: {
          status: "DEPLOYING",
          logs: logs.join("\n"),
        },
      });

      try {
        const oldContainer =
          docker.getContainer(containerName);

        await oldContainer.inspect();

        try {
          await oldContainer.stop();
        } catch {
          // Already stopped.
        }

        try {
          await oldContainer.remove({
            force: true,
          });
        } catch {
          // Ignore cleanup failure.
        }
      } catch {
        // Container does not exist.
      }

      const hostPort = await findAvailableHostPort();

      logs.push(
        log(
          `Selected host port ${hostPort} -> container port 80.`
        )
      );

      const container =
        await docker.createContainer({
          Image: imageName,
          name: containerName,
          Labels: {
            "nexus.managed": "true",
            "nexus.deployment": deployment.id,
            "nexus.project": deployment.projectId,
          },
          ExposedPorts: {
            "80/tcp": {},
          },
          HostConfig: {
            PortBindings: {
              "80/tcp": [
                {
                  HostPort: String(hostPort),
                },
              ],
            },
          },
        });

      logs.push(
        log(`Container created: ${container.id}`)
      );

      await container.start();

      logs.push(
        log("Container started successfully.")
      );

      const inspect = await container.inspect();

      if (!inspect.State?.Running) {
        throw new Error(
          "Container started but is not running."
        );
      }

      logs.push(
        log("Health check passed: container is running.")
      );

      logs.push(
        log(
          `Application available at http://localhost:${hostPort}`
        )
      );

      const finalLogs = logs.join("\n");

      await prisma.deployment.update({
        where: {
          id: deployment.id,
        },
        data: {
          status: "SUCCESS",
          containerId: container.id,
          logs: finalLogs,
          finishedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "DEPLOYMENT_SUCCESS",
          entity: "Deployment",
          entityId: deployment.id,
          metadata: JSON.stringify({
            imageName,
            containerId: container.id,
            containerName,
            hostPort,
            applicationUrl: `http://localhost:${hostPort}`,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        status: "SUCCESS",
        deploymentId: deployment.id,
        imageName,
        containerId: container.id,
        containerName,
        hostPort,
        applicationUrl: `http://localhost:${hostPort}`,
        logs: finalLogs,
      });
    } finally {
      await fs.rm(workDir, {
        recursive: true,
        force: true,
      }).catch(() => undefined);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown deployment error";

    console.error("[NEXUS DEPLOYMENT ERROR]", {
      deploymentId,
      error,
    });

    if (deploymentId) {
      try {
        const current = await prisma.deployment.findUnique({
          where: {
            id: deploymentId,
          },
        });

        if (current) {
          await prisma.deployment.update({
            where: {
              id: deploymentId,
            },
            data: {
              status: "FAILED",
              logs: `${current.logs ?? ""}\n${createLog(
                `Deployment failed: ${message}`
              )}`,
              finishedAt: new Date(),
            },
          });
        }
      } catch (dbError) {
        console.error(
          "[NEXUS DEPLOYMENT DB ERROR]",
          dbError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        status: "FAILED",
        deploymentId,
        error: message,
      },
      { status: 500 }
    );
  }
}