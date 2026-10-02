"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

type PageProps = {
  params: Promise<{ id: string }>;
};

type PortInfo = {
  privatePort?: number;
  publicPort?: number;
  type?: string;
};

type Metrics = {
  cpuPercent: number;
  memoryPercent: number;
  rxBytes: number;
  txBytes: number;
  memoryUsage: number;
  memoryLimit: number;
  timestamp?: string;
};

type Deployment = {
  id: string;
  status: string;
  branch: string;
  imageName: string;
  containerId?: string | null;
  logs?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt?: string;
  applicationUrl?: string | null;
  hostPort?: number | null;
  project?: {
    id: string;
    name: string;
    slug?: string;
  } | null;
  triggeredBy?: {
    name?: string | null;
    email?: string | null;
  } | null;
  container?: {
    id?: string;
    name?: string;
    state?: string;
    status?: string;
    image?: string;
    ports?: PortInfo[];
  } | null;
  ports?: PortInfo[];
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );

  return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${
    units[index]
  }`;
}

function statusClass(status?: string) {
  switch ((status ?? "UNKNOWN").toUpperCase()) {
    case "SUCCESS":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    case "FAILED":
      return "border-red-500/20 bg-red-500/10 text-red-400";
    case "BUILDING":
    case "DEPLOYING":
    case "PENDING":
      return "border-amber-500/20 bg-amber-500/10 text-amber-400";
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300";
  }
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-semibold text-white">{value}</p>
      {detail && (
        <p className="mt-1 truncate text-xs text-zinc-500">{detail}</p>
      )}
    </div>
  );
}

export default function DeploymentDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const deploymentId = resolvedParams.id;

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDeployment = useCallback(async () => {
    try {
      const response = await fetch(`/api/deployments/${deploymentId}`, {
        cache: "no-store",
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load deployment");
      }

      setDeployment(data.deployment);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deployment");
    } finally {
      setLoading(false);
    }
  }, [deploymentId]);

  const loadMetrics = useCallback(async () => {
    if (!deployment?.containerId) return;

    try {
      const response = await fetch(
        `/api/docker/${deployment.containerId}/stats`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) return;

      const data = await response.json();

      setMetrics({
        cpuPercent: Number(data.cpuPercent ?? 0),
        memoryPercent: Number(data.memoryPercent ?? 0),
        rxBytes: Number(data.rxBytes ?? 0),
        txBytes: Number(data.txBytes ?? 0),
        memoryUsage: Number(data.memoryUsage ?? 0),
        memoryLimit: Number(data.memoryLimit ?? 0),
        timestamp: data.timestamp,
      });
    } catch {
      // Metrics are optional.
    }
  }, [deployment]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDeployment();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadDeployment]);

  useEffect(() => {
    if (!deployment?.containerId) return;

    const timer = setTimeout(() => {
      void loadMetrics();
      void loadDeployment();
    }, 0);

    const interval = setInterval(() => {
      void loadMetrics();
      void loadDeployment();
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [deployment, loadMetrics, loadDeployment]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090d] p-6 text-zinc-200">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-500">
            Loading deployment...
          </div>
        </div>
      </main>
    );
  }

  if (error || !deployment) {
    return (
      <main className="min-h-screen bg-[#07090d] p-6 text-zinc-200">
        <div className="mx-auto max-w-6xl space-y-4">
          <Link
            href="/deployments"
            className="text-sm text-zinc-400 hover:text-white"
          >
            â† Back to Deployments
          </Link>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-400">
            {error || "Deployment not found"}
          </div>
        </div>
      </main>
    );
  }

  const ports = deployment.ports ?? deployment.container?.ports ?? [];
  const status = (deployment.status ?? "UNKNOWN").toUpperCase();

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#07090d] text-zinc-200">
      <div className="mx-auto w-full max-w-6xl min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/deployments"
              className="text-xs text-zinc-500 transition hover:text-zinc-300"
            >
              â† Deployments
            </Link>

            <div className="mt-2 flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight text-white">
                  Deployment Details
                </h1>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {deployment.project?.name ?? "Unknown project"} Â·{" "}
                  {deployment.id}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${statusClass(
                  status
                )}`}
              >
                {status}
              </span>
            </div>
          </div>

          <button
            onClick={() => void loadDeployment()}
            className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            Refresh
          </button>
        </div>

        {/* Overview */}
        <section className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Project"
            value={deployment.project?.name ?? "-"}
          />
          <StatCard label="Branch" value={deployment.branch || "main"} />
          <StatCard label="Image" value={deployment.imageName} />
          <StatCard
            label="Container"
            value={deployment.container?.name ?? "Managed container"}
          />
        </section>

        {/* Application */}
        {deployment.applicationUrl && (
          <section className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-500">
                  Application is running
                </p>
                <p className="mt-1 truncate text-sm font-medium text-white">
                  {deployment.applicationUrl}
                </p>
              </div>

              <a
                href={deployment.applicationUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-emerald-400"
              >
                Open Application â†—
              </a>
            </div>
          </section>
        )}

        {/* Live metrics */}
        <section className="mt-4 grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="CPU"
            value={`${(metrics?.cpuPercent ?? 0).toFixed(2)}%`}
            detail="Live container usage"
          />
          <StatCard
            label="Memory"
            value={`${(metrics?.memoryPercent ?? 0).toFixed(2)}%`}
            detail={
              metrics
                ? `${formatBytes(metrics.memoryUsage)} / ${formatBytes(
                    metrics.memoryLimit
                  )}`
                : "Waiting for metrics"
            }
          />
          <StatCard
            label="Network RX"
            value={formatBytes(metrics?.rxBytes ?? 0)}
            detail="Received"
          />
          <StatCard
            label="Network TX"
            value={formatBytes(metrics?.txBytes ?? 0)}
            detail="Transmitted"
          />
        </section>

        {/* Main content */}
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Container */}
          <section className="min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
            <div className="border-b border-zinc-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">
                Container Information
              </h2>
            </div>

            <div className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Status
                  </p>
                  <p className="mt-1 text-sm text-emerald-400">
                    {deployment.container?.state ??
                      deployment.container?.status ??
                      "Unknown"}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Image
                  </p>
                  <p className="mt-1 truncate text-sm text-zinc-300">
                    {deployment.container?.image ??
                      deployment.imageName ??
                      "-"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Container ID
                </p>
                <p className="mt-1 truncate font-mono text-xs text-zinc-400">
                  {deployment.containerId ?? deployment.container?.id ?? "-"}
                </p>
              </div>

              {/* Compact Ports */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Ports
                  </p>
                </div>

                {ports.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {ports.map((port, index) => (
                      <div
                        key={`${port.privatePort}-${port.publicPort}-${index}`}
                        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2"
                      >
                        <span className="font-mono text-xs font-medium text-white">
                          {port.privatePort ?? "-"}
                        </span>

                        <span className="mx-2 text-zinc-600">â†’</span>

                        <span className="font-mono text-xs font-medium text-cyan-400">
                          {port.publicPort ?? "-"}
                        </span>

                        <span className="ml-2 text-[10px] uppercase text-zinc-600">
                          {port.type ?? "tcp"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600">No published ports</p>
                )}
              </div>
            </div>
          </section>

          {/* Deployment Logs */}
          <section className="min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">
                Deployment Logs
              </h2>
              <span className="text-[10px] text-zinc-600">LIVE</span>
            </div>

            <div className="h-[360px] min-w-0 overflow-auto bg-[#050608] p-4">
              <pre className="min-w-0 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-zinc-400">
                {deployment.logs || "No deployment logs available."}
              </pre>
            </div>
          </section>
        </div>

        {/* Metadata */}
        <section className="mt-4 min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
          <div className="border-b border-zinc-800 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">
              Deployment Metadata
            </h2>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                Deployment ID
              </p>
              <p className="mt-1 truncate font-mono text-xs text-zinc-400">
                {deployment.id}
              </p>
            </div>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                Created
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {formatDate(deployment.createdAt)}
              </p>
            </div>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                Started
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {formatDate(deployment.startedAt)}
              </p>
            </div>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                Finished
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {formatDate(deployment.finishedAt)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}