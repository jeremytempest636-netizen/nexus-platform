"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

type ProjectsResponse = {
  projects?: Project[];
  data?: Project[];
  success?: boolean;
  error?: string;
};

export default function ApplicationsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");

  async function loadProjects() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/projects", {
        cache: "no-store",
      });

      const result =
        (await response.json()) as ProjectsResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to load applications");
      }

      setProjects(result.projects ?? result.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load applications"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProjects();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  async function createApplication(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Application name wajib diisi.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Failed to create application"
        );
      }

      setName("");
      setShowCreate(false);
      setMessage("Application berhasil dibuat.");

      await loadProjects();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create application"
      );
    } finally {
      setCreating(false);
    }
  }

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        project.slug
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const activeCount = projects.filter(
    (project) => project.status === "ACTIVE"
  ).length;

  const archivedCount = projects.filter(
    (project) => project.status === "ARCHIVED"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-cyan-400">
              APPLICATION MANAGEMENT
            </p>

            <h1 className="text-3xl font-bold">
              Applications
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage applications, projects, deployments, and
              operational workloads.
            </p>
          </div>

          <button
            onClick={() => {
              setShowCreate(true);
              setError("");
              setMessage("");
            }}
            className="rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            + Create Application
          </button>
        </div>

        {message && (
          <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Total Applications
            </p>
            <p className="mt-2 text-3xl font-bold">
              {projects.length}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Active
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {activeCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Archived
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-400">
              {archivedCount}
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 md:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search application..."
            className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <button
            onClick={() => void loadProjects()}
            className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-medium transition hover:border-slate-500"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="font-semibold">
              Application Registry
            </h2>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              Loading applications...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="text-4xl">Ã°Å¸â€œÂ¦</div>
              <h3 className="mt-4 text-lg font-semibold">
                No applications found
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Create your first application to start managing
                deployments and infrastructure.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-800/30 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-lg">
                      Ã¢â€”Ë†
                    </div>

                    <div>
                      <h3 className="font-semibold">
                        {project.name}
                      </h3>

                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {project.slug}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        project.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {project.status}
                    </span>

                    <a
                      href={`/deployments?projectId=${encodeURIComponent(
                        project.id
                      )}`}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-500 hover:text-cyan-400"
                    >
                      Deployments
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    Create Application
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Register a new application in NEXUS.
                  </p>
                </div>

                <button
                  onClick={() => setShowCreate(false)}
                  className="text-xl text-slate-500 hover:text-white"
                >
                  Ãƒâ€”
                </button>
              </div>

              <form onSubmit={createApplication}>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Application Name
                </label>

                <input
                  autoFocus
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="e.g. My Production API"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-500"
                />

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creating
                      ? "Creating..."
                      : "Create Application"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}