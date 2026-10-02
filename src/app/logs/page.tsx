"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Container = {
  id: string;
  shortId: string;
  name: string;
  image: string;
  state: string;
  status: string;
};

type LogEntry = {
  id: string;
  level: string;
  message: string;
};

type LogsResponse = {
  success: boolean;
  containers: Container[];
  logs: LogEntry[];
  selectedContainer: {
    id: string;
    name: string;
    image: string;
    state: string;
  } | null;
  error?: string;
};

export default function LogsPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadContainers = useCallback(async () => {
    try {
      const response = await fetch("/api/logs", {
        cache: "no-store",
      });

      const result = (await response.json()) as LogsResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Failed to load containers");
      }

      setContainers(result.containers ?? []);

      if (!selectedId && result.containers?.length) {
        setSelectedId(result.containers[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load containers"
      );
    }
  }, [selectedId]);

  const loadLogs = useCallback(async () => {
    if (!selectedId) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/logs?containerId=${encodeURIComponent(selectedId)}&tail=500`,
        {
          cache: "no-store",
        }
      );

      const result = (await response.json()) as LogsResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Failed to load logs");
      }

      setLogs(result.logs ?? []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load logs"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadContainers();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadContainers]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const timer = setTimeout(() => {
      void loadLogs();
    }, 0);

    const interval = setInterval(() => {
      void loadLogs();
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [selectedId, loadLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      const matchesLevel =
        level === "ALL" || item.level === level;

      const matchesSearch =
        !search ||
        item.message.toLowerCase().includes(
          search.toLowerCase()
        );

      return matchesLevel && matchesSearch;
    });
  }, [logs, search, level]);

  return (
    <main className="min-h-screen bg-[#08090b] p-6 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Observability
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Logs
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Centralized Docker container log viewer.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">
                Containers
              </h2>

              <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-white/50">
                {containers.length}
              </span>
            </div>

            <div className="space-y-2">
              {containers.map((container) => (
                <button
                  key={container.id}
                  onClick={() =>
                    setSelectedId(container.id)
                  }
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedId === container.id
                      ? "border-cyan-500/40 bg-cyan-500/10"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {container.name}
                    </span>

                    <span
                      className={`h-2 w-2 rounded-full ${
                        container.state === "running"
                          ? "bg-emerald-400"
                          : "bg-white/30"
                      }`}
                    />
                  </div>

                  <p className="mt-1 truncate text-xs text-white/40">
                    {container.image}
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    {container.status}
                  </p>
                </button>
              ))}

              {!containers.length && (
                <p className="py-6 text-center text-sm text-white/40">
                  No containers found.
                </p>
              )}
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 p-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search logs..."
                  className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-cyan-500/40"
                />

                <select
                  value={level}
                  onChange={(event) =>
                    setLevel(event.target.value)
                  }
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none"
                >
                  <option value="ALL">All levels</option>
                  <option value="INFO">INFO</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                  <option value="DEBUG">DEBUG</option>
                </select>

                <button
                  onClick={loadLogs}
                  className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-cyan-400"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-white/40">
                <span>
                  {loading
                    ? "Loading..."
                    : `${filteredLogs.length} log entries`}
                </span>

                <span>
                  Auto refresh: 5s
                </span>
              </div>
            </div>

            {error && (
              <div className="m-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="max-h-[650px] overflow-auto p-4 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="flex min-h-[300px] items-center justify-center text-white/30">
                  No logs available.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredLogs.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg px-3 py-2 hover:bg-white/[0.04]"
                    >
                      <span
                        className={`mr-3 inline-block w-14 font-semibold ${
                          item.level === "ERROR"
                            ? "text-red-400"
                            : item.level === "WARN"
                              ? "text-yellow-400"
                              : item.level === "DEBUG"
                                ? "text-purple-400"
                                : "text-emerald-400"
                        }`}
                      >
                        {item.level}
                      </span>

                      <span className="break-all text-white/70">
                        {item.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}