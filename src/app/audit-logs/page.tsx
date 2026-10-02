"use client";

import { useEffect, useMemo, useState } from "react";

type AuditLog = {
  id: string;
  action: string;
  createdAt: string;
  userId?: string | null;
  projectId?: string | null;
  metadata?: unknown;
};

type ActionCount = {
  action: string;
  count: number;
};

type AuditResponse = {
  success: boolean;
  logs: AuditLog[];
  summary: {
    total: number;
    returned: number;
    actionTypes: number;
  };
  actionCounts: ActionCount[];
  error?: string;
};

function formatAction(action: string) {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function actionClass(action: string) {
  if (
    /DELETE|REMOVE|FAIL|SECURITY|REVOKE/i.test(action)
  ) {
    return "bg-red-500/10 text-red-400 border-red-500/20";
  }

  if (
    /CREATE|DEPLOY|LOGIN|SUCCESS|START/i.test(action)
  ) {
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }

  if (/AI|COPILOT|SCAN/i.test(action)) {
    return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
  }

  return "bg-slate-700/50 text-slate-300 border-slate-700";
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionCounts, setActionCounts] = useState<ActionCount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  async function loadAuditLogs() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/audit-logs?limit=200",
        {
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as AuditResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Failed to load audit logs"
        );
      }

      setLogs(result.logs ?? []);
      setActionCounts(result.actionCounts ?? []);
      setTotal(result.summary?.total ?? 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load audit logs"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void loadAuditLogs();
    }, 0);

    const interval = setInterval(() => {
      void loadAuditLogs();
    }, 15000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const actions = useMemo(() => {
    return actionCounts.map((item) => item.action);
  }, [actionCounts]);

  const filteredLogs = useMemo(() => {
    const query = search.toLowerCase();

    return logs.filter((log) => {
      const matchesAction =
        actionFilter === "ALL" ||
        log.action === actionFilter;

      const searchable = [
        log.action,
        log.userId ?? "",
        log.projectId ?? "",
        JSON.stringify(log.metadata ?? ""),
      ]
        .join(" ")
        .toLowerCase();

      return matchesAction && searchable.includes(query);
    });
  }, [logs, search, actionFilter]);

  const securityEvents = logs.filter((log) =>
    /SECURITY|SCAN|AUTH|LOGIN|RBAC/i.test(log.action)
  ).length;

  const deploymentEvents = logs.filter((log) =>
    /DEPLOY/i.test(log.action)
  ).length;

  const aiEvents = logs.filter((log) =>
    /AI|COPILOT/i.test(log.action)
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-cyan-400">
              AUDIT & COMPLIANCE
            </p>

            <h1 className="text-3xl font-bold">
              Audit Logs
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Operational activity, security events, deployments,
              and administrative actions recorded by NEXUS.
            </p>
          </div>

          <button
            onClick={() => void loadAuditLogs()}
            className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-medium transition hover:border-cyan-500 hover:text-cyan-400"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Total Events
            </p>
            <p className="mt-2 text-3xl font-bold">
              {total}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Deployment Events
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {deploymentEvents}
            </p>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Security Events
            </p>
            <p className="mt-2 text-3xl font-bold text-red-400">
              {securityEvents}
            </p>
          </div>

          <div className="rounded-xl border border-cyan-500/20 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              AI / Copilot Events
            </p>
            <p className="mt-2 text-3xl font-bold text-cyan-400">
              {aiEvents}
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search audit events..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-500"
              />

              <select
                value={actionFilter}
                onChange={(event) =>
                  setActionFilter(event.target.value)
                }
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Actions</option>

                {actions.map((action) => (
                  <option key={action} value={action}>
                    {formatAction(action)}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">
                      Action
                    </th>
                    <th className="px-3 py-3">
                      User
                    </th>
                    <th className="px-3 py-3">
                      Project
                    </th>
                    <th className="px-3 py-3">
                      Timestamp
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-12 text-center text-slate-500"
                      >
                        Loading audit events...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-12 text-center text-slate-500"
                      >
                        No audit events found.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-slate-800/70 hover:bg-slate-800/30"
                      >
                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${actionClass(
                              log.action
                            )}`}
                          >
                            {formatAction(log.action)}
                          </span>
                        </td>

                        <td className="px-3 py-4 font-mono text-xs text-slate-400">
                          {log.userId ?? "system"}
                        </td>

                        <td className="px-3 py-4 font-mono text-xs text-slate-400">
                          {log.projectId ?? "Ã¢â‚¬â€"}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-500">
                          {new Date(
                            log.createdAt
                          ).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="font-semibold">
              Activity Breakdown
            </h2>

            <div className="mt-4 space-y-3">
              {actionCounts.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No activity recorded yet.
                </p>
              ) : (
                actionCounts.map((item) => (
                  <div
                    key={item.action}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="truncate text-xs text-slate-400">
                      {formatAction(item.action)}
                    </span>

                    <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-semibold">
                      {item.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="font-semibold">
            Compliance Notes
          </h2>

          <div className="mt-4 grid gap-3 text-sm text-slate-400 md:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <p className="font-medium text-slate-200">
                Traceability
              </p>
              <p className="mt-1">
                Administrative and operational actions are
                recorded with timestamps.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <p className="font-medium text-slate-200">
                Security Monitoring
              </p>
              <p className="mt-1">
                Security, authentication, and scanning activity
                can be reviewed from one location.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <p className="font-medium text-slate-200">
                Operational History
              </p>
              <p className="mt-1">
                Deployment and AI operational events provide an
                audit trail for troubleshooting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}