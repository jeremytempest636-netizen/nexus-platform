"use client";

import { useCallback, useEffect, useState } from "react";

type Metrics = {
  status: string;
  cpu: {
    usage: number;
    cores: number;
    load1m: number;
  };
  memory: {
    usage: number;
    total: number;
    used: number;
    available: number;
  };
  disk: {
    usage: number;
    total: number;
    used: number;
    available: number;
    mount: string;
  };
  network: {
    interface: string;
    rxBytes: number;
    txBytes: number;
    rxSec: number;
    txSec: number;
  };
  host: {
    hostname: string;
    platform: string;
    distro: string;
    release: string;
    architecture: string;
    manufacturer: string;
    model: string;
    uptime: number;
  };
  timestamp: string;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

function formatRate(bytes: number) {
  return `${formatBytes(Math.max(bytes, 0))}/s`;
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${days}d ${hours}h ${minutes}m`;
}

function MetricCard({
  title,
  value,
  subtitle,
  percentage,
}: {
  title: string;
  value: string;
  subtitle: string;
  percentage?: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>

        {percentage !== undefined && (
          <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
            {percentage.toFixed(1)}%
          </div>
        )}
      </div>

      {percentage !== undefined && (
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-500"
            style={{
              width: `${Math.min(Math.max(percentage, 0), 100)}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function InfrastructurePage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMetrics = useCallback(async () => {
    try {
      const response = await fetch("/api/metrics", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to collect infrastructure metrics"
        );
      }

      setMetrics(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to collect metrics"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadMetrics();
    }, 0);

    const interval = window.setInterval(() => {
      void loadMetrics();
    }, 3000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadMetrics]);

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <a
              href="/app"
              className="mb-3 inline-block text-sm text-cyan-400 hover:text-cyan-300"
            >
              ← Back to Dashboard
            </a>

            <h1 className="text-4xl font-bold">
              Infrastructure
            </h1>

            <p className="mt-2 text-slate-400">
              Real-time infrastructure monitoring powered by NEXUS.
            </p>
          </div>

          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              metrics
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-orange-500/20 bg-orange-500/10 text-orange-400"
            }`}
          >
            ● {metrics ? "Monitoring Active" : "Connecting..."}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && !metrics ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center text-slate-400">
            Collecting infrastructure metrics...
          </div>
        ) : metrics ? (
          <>
            <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="CPU Usage"
                value={`${metrics.cpu.usage.toFixed(1)}%`}
                subtitle={`${metrics.cpu.cores} CPU cores`}
                percentage={metrics.cpu.usage}
              />

              <MetricCard
                title="Memory Usage"
                value={`${metrics.memory.usage.toFixed(1)}%`}
                subtitle={`${formatBytes(metrics.memory.used)} used / ${formatBytes(metrics.memory.total)}`}
                percentage={metrics.memory.usage}
              />

              <MetricCard
                title="Disk Usage"
                value={`${metrics.disk.usage.toFixed(1)}%`}
                subtitle={`${formatBytes(metrics.disk.used)} used / ${formatBytes(metrics.disk.total)}`}
                percentage={metrics.disk.usage}
              />

              <MetricCard
                title="Load Average"
                value={metrics.cpu.load1m.toFixed(2)}
                subtitle="1-minute system load"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-lg font-semibold">
                  Network Activity
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Interface: {metrics.network.interface}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                    <p className="text-sm text-slate-500">
                      Download
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {formatRate(metrics.network.rxSec)}
                    </p>

                    <p className="mt-2 text-xs text-slate-600">
                      Total {formatBytes(metrics.network.rxBytes)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                    <p className="text-sm text-slate-500">
                      Upload
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {formatRate(metrics.network.txSec)}
                    </p>

                    <p className="mt-2 text-xs text-slate-600">
                      Total {formatBytes(metrics.network.txBytes)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-lg font-semibold">
                  Host Information
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-600">
                      Hostname
                    </p>
                    <p className="mt-1 text-sm">
                      {metrics.host.hostname}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">
                      Platform
                    </p>
                    <p className="mt-1 text-sm">
                      {metrics.host.platform}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">
                      OS
                    </p>
                    <p className="mt-1 text-sm">
                      {metrics.host.distro}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">
                      Architecture
                    </p>
                    <p className="mt-1 text-sm">
                      {metrics.host.architecture}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">
                      Manufacturer
                    </p>
                    <p className="mt-1 text-sm">
                      {metrics.host.manufacturer}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">
                      Model
                    </p>
                    <p className="mt-1 text-sm">
                      {metrics.host.model}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">
                      Uptime
                    </p>
                    <p className="mt-1 text-sm">
                      {formatUptime(metrics.host.uptime)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600">
                      Last Update
                    </p>
                    <p className="mt-1 text-sm">
                      {new Date(metrics.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 rounded-2xl border border-cyan-500/10 bg-cyan-500/[0.03] p-6">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h2 className="font-semibold">
                    NEXUS Monitoring Engine
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Metrics are collected automatically every 3 seconds.
                  </p>
                </div>

                <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-300">
                  LIVE
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
