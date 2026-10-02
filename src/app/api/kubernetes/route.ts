import { NextResponse } from "next/server";
import { getKubernetesClient } from "@/lib/kubernetes/client";

export async function GET() {
  try {
    const { kc, core, apps } = getKubernetesClient();

    const [
      nodesResponse,
      namespacesResponse,
      deploymentsResponse,
      podsResponse,
      servicesResponse,
    ] = await Promise.all([
      core.listNode(),
      core.listNamespace(),
      apps.listDeploymentForAllNamespaces(),
      core.listPodForAllNamespaces(),
      core.listServiceForAllNamespaces(),
    ]);

    const nodes = nodesResponse.items.map((node) => ({
      name: node.metadata?.name ?? "unknown",
      status:
        node.status?.conditions?.find(
          (condition) => condition.type === "Ready"
        )?.status === "True"
          ? "Ready"
          : "NotReady",
      version: node.status?.nodeInfo?.kubeletVersion ?? "unknown",
      architecture: node.status?.nodeInfo?.architecture ?? "unknown",
      os: node.status?.nodeInfo?.osImage ?? "unknown",
    }));

    const namespaces = namespacesResponse.items.map((namespace) => ({
      name: namespace.metadata?.name ?? "unknown",
      status: namespace.status?.phase ?? "Unknown",
    }));

    const deployments = deploymentsResponse.items.map((deployment) => ({
      name: deployment.metadata?.name ?? "unknown",
      namespace: deployment.metadata?.namespace ?? "default",
      replicas: deployment.spec?.replicas ?? 0,
      readyReplicas: deployment.status?.readyReplicas ?? 0,
      availableReplicas: deployment.status?.availableReplicas ?? 0,
      updatedReplicas: deployment.status?.updatedReplicas ?? 0,
    }));

    const pods = podsResponse.items.map((pod) => ({
      name: pod.metadata?.name ?? "unknown",
      namespace: pod.metadata?.namespace ?? "default",
      status: pod.status?.phase ?? "Unknown",
      node: pod.spec?.nodeName ?? "unknown",
      restartCount:
        pod.status?.containerStatuses?.reduce(
          (total, container) => total + (container.restartCount ?? 0),
          0
        ) ?? 0,
    }));

    const services = servicesResponse.items.map((service) => ({
      name: service.metadata?.name ?? "unknown",
      namespace: service.metadata?.namespace ?? "default",
      type: service.spec?.type ?? "ClusterIP",
      clusterIP: service.spec?.clusterIP ?? "None",
      ports:
        service.spec?.ports?.map((port) => ({
          port: port.port,
          targetPort: port.targetPort,
          protocol: port.protocol,
        })) ?? [],
    }));

    return NextResponse.json({
      success: true,
      context: kc.getCurrentContext(),
      cluster: {
        nodes: nodes.length,
        namespaces: namespaces.length,
        deployments: deployments.length,
        pods: pods.length,
        services: services.length,
      },
      nodes,
      namespaces,
      deployments,
      pods,
      services,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Kubernetes API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to connect to Kubernetes cluster",
      },
      { status: 500 }
    );
  }
}
