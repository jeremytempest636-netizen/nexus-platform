"use client";

import { useEffect, useMemo, useState } from "react";

type Incident = {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  rootCause: string | null;
  aiAnalysis: string | null;
  resolution: string | null;
  detectedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    slug: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
};

function severityClass(severity: string) {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "HIGH":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "MEDIUM":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    default:
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  }
}

function statusClass(status: string) {
  switch (status.toUpperCase()) {
    case "OPEN":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "INVESTIGATING":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "RESOLVED":
      return "bg-green-500/15 text-green-400 border-green-500/30";
    case "CLOSED":
      return "bg-gray-500/15 text-gray-400 border-gray-500/30";
    default:
      return "bg-gray-500/15 text-gray-400 border-gray-500/30";
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");

  async function loadIncidents() {
    try {
      const response = await fetch("/api/incidents", {
        cache: "no-store",
      });

      const data = await response.json();

      if (data.success) {
        setIncidents(data.incidents);
      }
    } catch (error) {
      console.error("Failed to load incidents", error);
    } finally {
      setLoading(false);
    }
  }

  async function analyzeIncident(incidentId: string) {
    try {
      setAnalyzing(true);

      const response = await fetch(`/api/incidents/${incidentId}/analyze`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI analysis failed");
      }

      if (data.incident) {
        setIncidents((current) =>
          current.map((item) =>
            item.id === data.incident.id ? data.incident : item
          )
        );

        setSelectedIncident(data.incident);
      }

      alert("AI Root Cause Analysis selesai.");
    } catch (error) {
      console.error("AI incident analysis failed:", error);

      alert(
        error instanceof Error
          ? error.message
          : "AI incident analysis failed"
      );
    } finally {
      setAnalyzing(false);
    }
  }
  useEffect(() => {
    let cancelled = false;

    async function fetchIncidents() {
      try {
        const response = await fetch("/api/incidents", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!cancelled && data.success) {
          setIncidents(data.incidents);
        }
      } catch (error) {
        console.error("Failed to load incidents", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchIncidents();

    return () => {
      cancelled = true;
    };
  }, []);

  async function createIncident() {
    if (!title.trim()) {
      alert("Incident title is required.");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          severity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "Failed to create incident.");
        return;
      }

      setTitle("");
      setDescription("");
      setSeverity("MEDIUM");
      setShowCreate(false);

      await loadIncidents();

      if (data.incident) {
        setSelected(data.incident);
      }
    } catch (error) {
      console.error("Failed to create incident", error);
      alert("Failed to create incident.");
    } finally {
      setCreating(false);
    }
  }

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        incident.status.toUpperCase() === statusFilter;

      const matchesSeverity =
        severityFilter === "ALL" ||
        incident.severity.toUpperCase() === severityFilter;

      return matchesStatus && matchesSeverity;
    });
  }, [incidents, statusFilter, severityFilter]);

  const stats = useMemo(() => {
    return {
      total: incidents.length,
      open: incidents.filter((i) => i.status === "OPEN").length,
      investigating: incidents.filter(
        (i) => i.status === "INVESTIGATING"
      ).length,
      critical: incidents.filter((i) => i.severity === "CRITICAL").length,
    };
  }, [incidents]);

  return (
    <main className="min-h-screen bg-[#070b14] text-white p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-blue-400 font-medium">
              NEXUS / INCIDENT MANAGEMENT
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Incidents
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Monitor, investigate, and resolve infrastructure incidents.
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
          >
            + Create Incident
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Total Incidents", stats.total],
            ["Open", stats.open],
            ["Investigating", stats.investigating],
            ["Critical", stats.critical],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
            >
              <p className="text-sm text-gray-400">{label}</p>
              <p className="mt-2 text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:flex-row">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0c1220] px-4 py-2 text-sm outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0c1220] px-4 py-2 text-sm outline-none"
          >
            <option value="ALL">All Severity</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <div className="ml-auto flex items-center text-sm text-gray-400">
            Showing {filteredIncidents.length} of {incidents.length}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          {loading ? (
            <div className="p-10 text-center text-gray-400">
              Loading incidents...
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-semibold">No incidents found</p>
              <p className="mt-2 text-sm text-gray-500">
                Create an incident to start monitoring operational issues.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredIncidents.map((incident) => (
                <button
                  key={incident.id}
                  onClick={() => setSelected(incident)}
                  className="block w-full p-5 text-left transition hover:bg-white/[0.04]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{incident.title}</h2>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${severityClass(
                            incident.severity
                          )}`}
                        >
                          {incident.severity}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                            incident.status
                          )}`}
                        >
                          {incident.status}
                        </span>
                      </div>

                      <p className="mt-2 truncate text-sm text-gray-400">
                        {incident.description || "No description provided."}
                      </p>
                    </div>

                    <div className="shrink-0 text-right text-xs text-gray-500">
                      <p>{incident.project?.name ?? "No project"}</p>
                      <p className="mt-1">{formatDate(incident.detectedAt)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c1220] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Create Incident</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Record a new operational incident.
                </p>
              </div>

              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="API response time degraded"
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what happened..."
                  rows={5}
                  className="w-full resize-none rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  onClick={createIncident}
                  disabled={creating}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Incident"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4">
          <div className="mx-auto my-8 max-w-4xl rounded-2xl border border-white/10 bg-[#0c1220] shadow-2xl">
            <div className="border-b border-white/10 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${severityClass(
                        selected.severity
                      )}`}
                    >
                      {selected.severity}
                    </span>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                        selected.status
                      )}`}
                    >
                      {selected.status}
                    </span>
                  </div>

                  <h2 className="mt-3 text-2xl font-bold">
                    {selected.title}
                  </h2>

                  <p className="mt-2 text-sm text-gray-400">
                    Detected {formatDate(selected.detectedAt)}
                  </p>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2">
              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="font-semibold">Incident Details</h3>

                <div className="mt-4 space-y-4 text-sm">
                  <div>
                    <p className="text-gray-500">Project</p>
                    <p className="mt-1">
                      {selected.project?.name ?? "No project"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Created By</p>
                    <p className="mt-1">
                      {selected.createdBy?.name ?? "Unknown"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Description</p>
                    <p className="mt-1 whitespace-pre-wrap text-gray-300">
                      {selected.description || "No description provided."}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
                <h3 className="font-semibold text-blue-300">
                  AI Root Cause Analysis
                </h3>

                <div className="mt-4 text-sm text-gray-400">
                  {selected.aiAnalysis ? (
                    <p className="whitespace-pre-wrap">
                      {selected.aiAnalysis}
                    </p>
                  ) : (
                    <div>
                      <p>
                        AI analysis has not been generated yet.
                      </p>
                      <button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">
                        Analyze with AI
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="font-semibold">Root Cause</h3>
                <p className="mt-4 whitespace-pre-wrap text-sm text-gray-400">
                  {selected.rootCause || "Root cause not identified yet."}
                </p>
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="font-semibold">Resolution</h3>
                <p className="mt-4 whitespace-pre-wrap text-sm text-gray-400">
                  {selected.resolution || "No resolution recorded yet."}
                </p>
              </section>
            </div>

            <div className="border-t border-white/10 p-6">
              <h3 className="font-semibold">Incident Timeline</h3>

              <div className="mt-5 space-y-4 text-sm">
                <div className="flex gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="font-medium">Incident detected</p>
                    <p className="text-gray-500">
                      {formatDate(selected.detectedAt)}
                    </p>
                  </div>
                </div>

                {selected.resolvedAt && (
                  <div className="flex gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                    <div>
                      <p className="font-medium">Incident resolved</p>
                      <p className="text-gray-500">
                        {formatDate(selected.resolvedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
