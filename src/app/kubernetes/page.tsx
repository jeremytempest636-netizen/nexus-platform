"use client";

import { useCallback, useEffect, useState } from "react";

type Deployment = {
  name: string;
  namespace: string;
  replicas?: number;
  readyReplicas?: number;
  availableReplicas?: number;
  updatedReplicas?: number;
};

type KubernetesData = {
  success: boolean;
  context?: string;
  counts?: {
    nodes: number;
    namespaces: number;
    deployments: number;
    pods: number;
    services: number;
  };
  nodes?: Array<{
    name: string;
    status: string;
    version?: string;
  }>;
  deployments?: Deployment[];
  pods?: Array<{
    name: string;
    namespace: string;
    status: string;
    ready?: string;
    restarts?: number;
  }>;
  services?: Array<{
    name: string;
    namespace: string;
    type: string;
    clusterIP?: string;
  }>;
  error?: string;
};

export default function KubernetesPage() {
  const [data, setData] = useState<KubernetesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");

  const loadCluster = useCallback(async () => {
    try {
      const response = await fetch("/api/kubernetes", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to load Kubernetes data"
        );
      }

      setData(result);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to Kubernetes cluster"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (cancelled) return;
      await loadCluster();
    };

    initialize();

    const interval = setInterval(() => {
      if (!cancelled) {
        loadCluster();
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadCluster]);

  async function runAction(
    action: "scale" | "restart",
    deployment: Deployment,
    replicas?: number
  ) {
    const key = `${action}-${deployment.namespace}-${deployment.name}`;

    setActionLoading(key);
    setMessage("");
    setError("");

    try {
      const body: {
        action: string;
        namespace: string;
        name: string;
        replicas?: number;
      } = {
        action,
        namespace: deployment.namespace,
        name: deployment.name,
      };

      if (action === "scale") {
        body.replicas = replicas;
      }

      const response = await fetch("/api/kubernetes/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || `Failed to ${action} deployment`
        );
      }

      if (action === "scale") {
        setMessage(
          `${deployment.name} scaled to ${replicas} replicas.`
        );
      } else {
        setMessage(
          `${deployment.name} restart initiated successfully.`
        );
      }

      await loadCluster();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${action} deployment`
      );
    } finally {
      setActionLoading("");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">
            Loading Kubernetes cluster...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="text-sm font-medium text-cyan-400">
            NEXUS INFRASTRUCTURE
          </p>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                Kubernetes
              </h1>
              <p className="mt-2 text-slate-400">
                Monitor and control Kubernetes workloads directly
                from NEXUS.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
              <p className="text-xs text-slate-500">
                Context
              </p>
              <p className="mt-1 font-mono text-sm text-cyan-300">
                {data?.context || "unknown"}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            ["Nodes", data?.counts?.nodes ?? 0],
            ["Namespaces", data?.counts?.namespaces ?? 0],
            ["Deployments", data?.counts?.deployments ?? 0],
            ["Pods", data?.counts?.pods ?? 0],
            ["Services", data?.counts?.services ?? 0],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <p className="text-sm text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-3xl font-bold">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              Deployments
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Scale and restart Kubernetes workloads.
            </p>
          </div>

          <div className="space-y-4">
            {data?.deployments?.map((deployment) => {
              const replicas = deployment.replicas ?? 0;
              const ready = deployment.readyReplicas ?? 0;
              const restartKey = `restart-${deployment.namespace}-${deployment.name}`;

              return (
                <div
                  key={`${deployment.namespace}/${deployment.name}`}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold">
                          {deployment.name}
                        </h3>

                        <span className="rounded-full bg-slate-800 px-2 py-1 font-mono text-xs text-slate-400">
                          {deployment.namespace}
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            ready === replicas && replicas > 0
                              ? "bg-emerald-950 text-emerald-300"
                              : "bg-amber-950 text-amber-300"
                          }`}
                        >
                          {ready}/{replicas} Ready
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-5 text-sm text-slate-500">
                        <span>
                          Available:{" "}
                          <strong className="text-slate-300">
                            {deployment.availableReplicas ?? 0}
                          </strong>
                        </span>

                        <span>
                          Updated:{" "}
                          <strong className="text-slate-300">
                            {deployment.updatedReplicas ?? 0}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mr-1 text-sm text-slate-500">
                        Replicas
                      </span>

                      <button
                        type="button"
                        disabled={
                          replicas <= 0 ||
                          actionLoading !== ""
                        }
                        onClick={() =>
                          runAction(
                            "scale",
                            deployment,
                            replicas - 1
                          )
                        }
                        className="h-9 w-9 rounded-lg border border-slate-700 bg-slate-800 text-lg hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>

                      <span className="min-w-10 text-center font-mono">
                        {replicas}
                      </span>

                      <button
                        type="button"
                        disabled={
                          replicas >= 50 ||
                          actionLoading !== ""
                        }
                        onClick={() =>
                          runAction(
                            "scale",
                            deployment,
                            replicas + 1
                          )
                        }
                        className="h-9 w-9 rounded-lg border border-slate-700 bg-slate-800 text-lg hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading !== ""}
                        onClick={() =>
                          runAction("restart", deployment)
                        }
                        className="ml-2 rounded-lg border border-cyan-800 bg-cyan-950/40 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-900/50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {actionLoading === restartKey
                          ? "Restarting..."
                          : "Restart"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {(!data?.deployments ||
              data.deployments.length === 0) && (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-10 text-center text-slate-500">
                No Kubernetes deployments found.
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              Pods
            </h2>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Pod</th>
                    <th className="px-5 py-4">Namespace</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Ready</th>
                    <th className="px-5 py-4">Restarts</th>
                  </tr>
                </thead>

                <tbody>
                  {data?.pods?.map((pod) => (
                    <tr
                      key={`${pod.namespace}/${pod.name}`}
                      className="border-b border-slate-800/70 last:border-0"
                    >
                      <td className="px-5 py-4 font-mono text-xs text-slate-300">
                        {pod.name}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {pod.namespace}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-emerald-400">
                          {pod.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {pod.ready || "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {pod.restarts ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}