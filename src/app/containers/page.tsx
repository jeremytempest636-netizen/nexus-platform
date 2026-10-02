"use client";

import { useCallback, useEffect, useState } from "react";

type Container = {
  id: string;
  shortId: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: {
    privatePort: number;
    publicPort?: number;
    type?: string;
    ip?: string;
  }[];
  created: number;
};

type DockerResponse = {
  connected: boolean;
  count: number;
  containers: Container[];
  timestamp?: string;
  error?: string;
};

export default function ContainersPage() {
  const [data, setData] = useState<DockerResponse>({
    connected: false,
    count: 0,
    containers: [],
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");

  const loadContainers = useCallback(async () => {
    try {
      const response = await fetch("/api/docker", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to connect to Docker"
        );
      }

      setData(result);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Docker connection failed"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadContainers();
    }, 0);

    const interval = window.setInterval(() => {
      void loadContainers();
    }, 5000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadContainers]);

  async function performAction(
    id: string,
    action: "start" | "stop" | "restart"
  ) {
    setActionLoading(`${id}-${action}`);

    try {
      const response = await fetch(
        `/api/docker/${id}/${action}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Docker action failed"
        );
      }

      await loadContainers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Docker action failed"
      );
    } finally {
      setActionLoading("");
    }
  }

  const running = data.containers.filter(
    (container) => container.state === "running"
  ).length;

  const stopped = data.containers.filter(
    (container) => container.state !== "running"
  ).length;

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <a
              href="/app"
              className="mb-3 inline-block text-sm text-cyan-400 hover:text-cyan-300"
            >
              â† Back to Dashboard
            </a>

            <h1 className="text-4xl font-bold">
              Docker Containers
            </h1>

            <p className="mt-2 text-slate-400">
              Monitor and manage Docker Engine containers.
            </p>
          </div>

          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              data.connected
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            â— Docker{" "}
            {data.connected ? "Connected" : "Disconnected"}
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-slate-500">
              Total Containers
            </p>

            <p className="mt-2 text-3xl font-bold">
              {data.count}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.03] p-6">
            <p className="text-sm text-slate-500">
              Running
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {running}
            </p>
          </div>

          <div className="rounded-2xl border border-orange-500/10 bg-orange-500/[0.03] p-6">
            <p className="text-sm text-slate-500">
              Stopped
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-400">
              {stopped}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <h2 className="font-semibold">
                Container Inventory
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Auto-refresh every 5 seconds
              </p>
            </div>

            <button
              onClick={() => void loadContainers()}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              Connecting to Docker Engine...
            </div>
          ) : data.containers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl">ðŸ³</div>

              <h3 className="mt-4 font-semibold">
                No containers found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Start a Docker container and refresh NEXUS.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Container</th>
                    <th className="px-6 py-4">Image</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Ports</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {data.containers.map((container) => (
                    <tr
                      key={container.id}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="px-6 py-5">
                        <div className="font-medium">
                          {container.name}
                        </div>

                        <div className="mt-1 text-xs text-slate-600">
                          {container.shortId}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-lg bg-black/30 px-3 py-2 font-mono text-xs text-slate-300">
                          {container.image}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
                            container.state === "running"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-orange-500/10 text-orange-400"
                          }`}
                        >
                          <span>â—</span>
                          {container.state}
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                          {container.status}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        {container.ports.length > 0 ? (
                          <div className="space-y-1">
                            {container.ports.map(
                              (port, index) => (
                                <div
                                  key={`${port.privatePort}-${index}`}
                                  className="font-mono text-xs text-slate-400"
                                >
                                  {port.publicPort
                                    ? `${port.publicPort}:`
                                    : ""}
                                  {port.privatePort}/
                                  {port.type || "tcp"}
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">
                            -
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`/containers/${container.id}`}
                            className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-400 hover:bg-violet-500/20"
                          >
                            Details
                          </a>

                          {container.state !== "running" && (
                            <button
                              onClick={() =>
                                void performAction(
                                  container.id,
                                  "start"
                                )
                              }
                              disabled={actionLoading !== ""}
                              className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                              Start
                            </button>
                          )}

                          {container.state === "running" && (
                            <>
                              <button
                                onClick={() =>
                                  void performAction(
                                    container.id,
                                    "restart"
                                  )
                                }
                                disabled={actionLoading !== ""}
                                className="rounded-lg bg-cyan-500/10 px-3 py-2 text-xs text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50"
                              >
                                Restart
                              </button>

                              <button
                                onClick={() =>
                                  void performAction(
                                    container.id,
                                    "stop"
                                  )
                                }
                                disabled={actionLoading !== ""}
                                className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                              >
                                Stop
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
