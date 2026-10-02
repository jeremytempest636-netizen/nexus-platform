import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/rbac";

export async function GET() {
  try {
    const user = await requireAuth();

    const incidents = await prisma.incident.findMany({
      where: {
        OR: [
          {
            project: {
              members: {
                some: {
                  userId: user.userId,
                },
              },
            },
          },
          {
            createdById: user.userId,
          },
        ],
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        detectedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      incidents,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load incidents";

    console.error("[NEXUS INCIDENTS GET ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const title =
      typeof body.title === "string" ? body.title.trim() : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const projectId =
      typeof body.projectId === "string"
        ? body.projectId.trim()
        : "";

    const severity =
      typeof body.severity === "string"
        ? body.severity.toUpperCase()
        : "MEDIUM";

    const validSeverities = [
      "LOW",
      "MEDIUM",
      "HIGH",
      "CRITICAL",
    ];

    if (!title) {
      return NextResponse.json(
        { error: "Incident title is required" },
        { status: 400 }
      );
    }

    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: "Invalid incident severity" },
        { status: 400 }
      );
    }

    if (projectId) {
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: user.userId,
            projectId,
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

    const incident = await prisma.incident.create({
      data: {
        title,
        description: description || null,
        severity: severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        status: "OPEN",
        projectId: projectId || null,
        createdById: user.userId,
        detectedAt: new Date(),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "CREATE_INCIDENT",
        entity: "Incident",
        entityId: incident.id,
        metadata: JSON.stringify({
          title: incident.title,
          severity: incident.severity,
          projectId: incident.projectId,
        }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        incident,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create incident";

    console.error("[NEXUS INCIDENTS POST ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
