"use client";

import { FormEvent, useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  repository: string | null;
  status: string;
  _count: {
    deployments: number;
    incidents: number;
  };
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repository, setRepository] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function loadProjects() {
    try {
      const response = await fetch("/api/projects", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load projects");
      }

      const data = await response.json();
      setProjects(data.projects ?? []);
      setError("");
    } catch {
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProjects();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          repository,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      setProjects((current) => [data.project, ...current]);
      setName("");
      setDescription("");
      setRepository("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create project"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <a
              href="/app"
              className="mb-3 inline-block text-sm text-cyan-400 hover:text-cyan-300"
            >
              ← Back to Dashboard
            </a>

            <h1 className="text-4xl font-bold tracking-tight">
              Projects
            </h1>

            <p className="mt-2 text-slate-400">
              Manage applications and infrastructure projects.
            </p>
          </div>

          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300">
            NEXUS Platform
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Create Project</h2>

            <p className="mt-1 text-sm text-slate-400">
              Add a new application to NEXUS.
            </p>

            <form onSubmit={createProject} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Project Name
                </label>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-production-app"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Production application..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Repository
                </label>

                <input
                  value={repository}
                  onChange={(e) => setRepository(e.target.value)}
                  placeholder="https://github.com/user/repository"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition focus:border-cyan-400"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Project"}
              </button>
            </form>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Projects</h2>

              <span className="text-sm text-slate-500">
                {projects.length} project{projects.length === 1 ? "" : "s"}
              </span>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-slate-400">
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
                <div className="text-4xl">🚀</div>

                <h3 className="mt-4 text-lg font-semibold">
                  No projects yet
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Create your first project to start using NEXUS.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {projects.map((project) => (
                  <article
                    key={project.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-cyan-400/30"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-semibold">
                            {project.name}
                          </h3>

                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                            {project.status}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-400">
                          {project.description || "No description"}
                        </p>

                        <p className="mt-3 text-xs text-slate-500">
                          {project.repository || "No repository connected"}
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center">
                          <div className="text-lg font-bold">
                            {project._count.deployments}
                          </div>

                          <div className="text-xs text-slate-500">
                            Deployments
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center">
                          <div className="text-lg font-bold">
                            {project._count.incidents}
                          </div>

                          <div className="text-xs text-slate-500">
                            Incidents
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
