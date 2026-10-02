"use client";

import { useCallback, useEffect, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import Link from "next/link";

type NexusContainerStats = {
  cpuPercent: number;
  memoryPercent: number;
  rxBytes: number;
  txBytes: number;
};

type ChartPoint = {
  time: string;
  cpu: number;
  memory: number;
};

export default function ContainerDetailPage() {
  const [stats, setStats] = useState<NexusContainerStats | null>(null);
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const containerId =
    typeof window !== "undefined"
      ? window.location.pathname.split("/").pop()
      : "";

  const loadData = useCallback(async () => {
    if (!containerId) return;

    try {
      const [statsResponse, logsResponse, historyResponse] =
        await Promise.all([
          fetch(`/api/docker/${containerId}/stats`),
          fetch(`/api/docker/${containerId}/logs?tail=100`),
          fetch(`/api/docker/${containerId}/metrics?limit=20`),
        ]);

      if (!statsResponse.ok) {
        throw new Error("Failed to load container metrics");
      }

      const statsData = await statsResponse.json();
      const logsData = logsResponse.ok
        ? await logsResponse.json()
        : { logs: "" };

      const historyData = historyResponse.ok
        ? await historyResponse.json()
        : { metrics: [] };

      setStats(statsData);
      setLogs(logsData.logs || "");

      if (historyData.metrics?.length) {
        setHistory(
          historyData.metrics.map(
            (metric: {
              cpuPercent: number;
              memoryPercent: number;
              recordedAt: string;
            }) => ({
              time: new Date(
                metric.recordedAt
              ).toLocaleTimeString(),
              cpu: metric.cpuPercent,
              memory: metric.memoryPercent,
            })
          )
        );
      }

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load container data"
      );
    } finally {
      setLoading(false);
    }
  }, [containerId]);

  const collectMetric = useCallback(async () => {
    if (!containerId) return;

    try {
      await fetch(`/api/docker/${containerId}/metrics`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Metric collection error:", error);
    }
  }, [containerId]);
  async function containerAction(
    action: "start" | "restart" | "stop"
  ) {
    if (!containerId) return;

    setActionLoading(true);

    try {
      const response = await fetch(
        `/api/docker/${containerId}/${action}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to ${action} container`);
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${action} container`
      );
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      loadData();
      collectMetric();
    }, 0);

    const interval = window.setInterval(() => {
      collectMetric();
      loadData();
    }, 3000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadData, collectMetric]);

  function formatBytes(bytes: number) {
    if (!bytes) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );

    return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080b12] p-8 text-white">
        <div className="text-slate-400">
          Loading container metrics...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080b12] text-white">
      <div className="mx-auto max-w-7xl p-6 md:p-8">

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/containers"
              className="text-sm text-slate-400 hover:text-white"
            >
              ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Back to Containers
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              Container Details
            </h1>

            <p className="mt-1 font-mono text-sm text-slate-500">
              {containerId}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => containerAction("start")}
              disabled={actionLoading}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              Start
            </button>

            <button
              onClick={() => containerAction("restart")}
              disabled={actionLoading}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-50"
            >
              Restart
            </button>

            <button
              onClick={() => containerAction("stop")}
              disabled={actionLoading}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50"
            >
              Stop
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {stats && (
          <>
            <div className="grid gap-4 md:grid-cols-4">

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-400">
                  CPU Usage
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {stats.cpuPercent.toFixed(1)}%
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-400">
                  Memory
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {stats.memoryPercent.toFixed(1)}%
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-400">
                  Network RX
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {formatBytes(stats.rxBytes)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm text-slate-400">
                  Network TX
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {formatBytes(stats.txBytes)}
                </p>
              </div>

            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Resource Usage
                </h2>

                <p className="text-sm text-slate-500">
                  Live CPU and memory monitoring
                </p>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                    />

                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                    />

                    <YAxis
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="cpu"
                      name="CPU %"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="memory"
                      name="Memory %"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30">
              <div className="border-b border-white/10 p-5">
                <h2 className="text-lg font-semibold">
                  Container Logs
                </h2>

                <p className="text-sm text-slate-500">
                  Last 100 log lines ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Auto refresh 3s
                </p>
              </div>

              <pre className="max-h-[500px] overflow-auto p-5 font-mono text-xs leading-6 text-slate-300">
                {logs || "No logs available."}
              </pre>
            </div>
          </>
        )}

      </div>
    </main>
  );
}