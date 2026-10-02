import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/rbac";

export async function GET() {
  try {
    const session = await requireAuth();

    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: session.userId,
          },
        },
      },
      include: {
        _count: {
          select: {
            deployments: true,
            incidents: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      projects,
      count: projects.length,
    });
  } catch (error) {
    console.error("GET /api/projects error:", error);

    return NextResponse.json(
      { error: "Unauthorized or failed to load projects" },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const repository = String(body.repository ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) {
      return NextResponse.json(
        { error: "Invalid project name" },
        { status: 400 }
      );
    }

    const existing = await prisma.project.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A project with this name already exists" },
        { status: 409 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        slug,
        description: description || null,
        repository: repository || null,
        members: {
          create: {
            userId: session.userId,
          },
        },
      },
      include: {
        _count: {
          select: {
            deployments: true,
            incidents: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "PROJECT_CREATED",
        entity: "Project",
        entityId: project.id,
        metadata: JSON.stringify({
          name: project.name,
          slug: project.slug,
        }),
      },
    });

    return NextResponse.json(
      { project },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/projects error:", error);

    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
