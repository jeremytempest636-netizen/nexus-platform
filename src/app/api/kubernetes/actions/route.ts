import { NextRequest, NextResponse } from "next/server";
import { getKubernetesClient } from "@/lib/kubernetes/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      action,
      namespace,
      name,
      replicas,
    } = body;

    if (!action || !namespace || !name) {
      return NextResponse.json(
        {
          success: false,
          error: "action, namespace, and name are required",
        },
        { status: 400 }
      );
    }

    const { apps } = getKubernetesClient();

    if (action === "scale") {
      const replicaCount = Number(replicas);

      if (
        !Number.isInteger(replicaCount) ||
        replicaCount < 0 ||
        replicaCount > 50
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "replicas must be an integer between 0 and 50",
          },
          { status: 400 }
        );
      }

      const result = await apps.patchNamespacedDeployment({
        name,
        namespace,
        body: [
          {
            op: "replace",
            path: "/spec/replicas",
            value: replicaCount,
          },
        ],
      });

      return NextResponse.json({
        success: true,
        action: "scale",
        namespace,
        name,
        replicas: replicaCount,
        deployment: result,
      });
    }

    if (action === "restart") {
      const restartedAt = new Date().toISOString();

      const deployment = await apps.readNamespacedDeployment({
        name,
        namespace,
      });

      const existingAnnotations =
        deployment.spec?.template?.metadata?.annotations ?? {};

      const annotations = {
        ...existingAnnotations,
        "nexus.io/restarted-at": restartedAt,
      };

      const result = await apps.patchNamespacedDeployment({
        name,
        namespace,
        body: [
          {
            op: "add",
            path: "/spec/template/metadata/annotations",
            value: annotations,
          },
        ],
      });

      return NextResponse.json({
        success: true,
        action: "restart",
        namespace,
        name,
        restartedAt,
        deployment: result,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: `Unsupported action: ${action}`,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Kubernetes action error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}