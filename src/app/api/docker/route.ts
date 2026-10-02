import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { docker } from "@/lib/docker/client";

export async function GET() {
  try {
    await requireAuth();

    const containers = await docker.listContainers({
      all: true,
    });

    const result = containers.map((container) => ({
      id: container.Id,
      shortId: container.Id.substring(0, 12),
      name: container.Names?.[0]?.replace("/", "") ?? "unknown",
      image: container.Image,
      state: container.State,
      status: container.Status,
      ports:
        container.Ports?.map((port) => ({
          privatePort: port.PrivatePort,
          publicPort: port.PublicPort,
          type: port.Type,
          ip: port.IP,
        })) ?? [],
      created: container.Created,
    }));

    return NextResponse.json({
      connected: true,
      count: result.length,
      containers: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Docker API error:", error);

    return NextResponse.json(
      {
        connected: false,
        error: "Unable to connect to Docker Engine",
        containers: [],
      },
      { status: 503 }
    );
  }
}
