import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { docker } from "@/lib/docker/client";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: Params
) {
  try {
    await requireAuth();

    const { id } = await params;
    const container = docker.getContainer(id);

    const tail =
      new URL(request.url).searchParams.get("tail") || "100";

    const logs = await container.logs({
      stdout: true,
      stderr: true,
      timestamps: true,
      tail: Number(tail),
    });

    const text = logs
      .toString("utf8")
      .replace(
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
        ""
      );

    return NextResponse.json({
      containerId: id,
      logs: text,
      lines: text ? text.split("\n").length : 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Docker logs error:", error);

    return NextResponse.json(
      {
        error: "Failed to read container logs",
      },
      { status: 500 }
    );
  }
}