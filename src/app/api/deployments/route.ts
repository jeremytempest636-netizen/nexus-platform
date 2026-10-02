import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/rbac";

export async function GET() {
  try {
    const user = await requireAuth();

    const deployments = await prisma.deployment.findMany({
      where: {
        project: {
          members: {
            some: {
              userId: user.userId,
            },
          },
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        triggeredBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json({
      deployments,
    });
  } catch (error) {
    console.error("GET /api/deployments error:", error);

    return NextResponse.json(
      {
        error: "Failed to load deployments",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    const body = await request.json();

    const projectId =
      typeof body.projectId === "string" ? body.projectId.trim() : "";

    const branch =
      typeof body.branch === "string" && body.branch.trim()
        ? body.branch.trim()
        : "main";

    const commitHash =
      typeof body.commitHash === "string"
        ? body.commitHash.trim()
        : "";

    const imageName =
      typeof body.imageName === "string"
        ? body.imageName.trim()
        : "";

    if (!projectId) {
      return NextResponse.json(
        {
          error: "projectId is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!imageName) {
      return NextResponse.json(
        {
          error: "imageName is required",
        },
        {
          status: 400,
        }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId: user.userId,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          error: "Project not found or access denied",
        },
        {
          status: 404,
        }
      );
    }

    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        triggeredById: user.userId,
        branch,
        commitHash: commitHash || null,
        imageName,
        status: "PENDING",
        logs: "Deployment queued by NEXUS.",
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "CREATE_DEPLOYMENT",
        entity: "Deployment",
        entityId: deployment.id,
        metadata: JSON.stringify({
          projectId,
          branch,
          imageName,
        }),
      },
    });

    return NextResponse.json(
      {
        deployment,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("POST /api/deployments error:", error);

    return NextResponse.json(
      {
        error: "Failed to create deployment",
      },
      {
        status: 500,
      }
    );
  }
}
