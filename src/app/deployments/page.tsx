"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  slug: string;
};

type Deployment = {
  id: string;
  status: string;
  branch: string;
  imageName: string;
  containerId: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
  };
  triggeredBy: {
    name: string;
    email: string;
  } | null;
};

function statusClass(status: string) {
  switch (status) {
    case "SUCCESS":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "FAILED":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "BUILDING":
    case "DEPLOYING":
    case "PENDING":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  }
}

export default function DeploymentsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [projectId, setProjectId] = useState("");
  const [branch, setBranch] = useState("main");
  const [imageName, setImageName] = useState("nexus-test:latest");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [projectsResponse, deploymentsResponse] =
        await Promise.all([
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/deployments", { cache: "no-store" }),
        ]);

      const projectsData = await projectsResponse.json();
      const deploymentsData = await deploymentsResponse.json();

      if (!projectsResponse.ok) {
        throw new Error(
          projectsData.error || "Failed to load projects"
        );
      }

      if (!deploymentsResponse.ok) {
        throw new Error(
          deploymentsData.error || "Failed to load deployments"
        );
      }

      setProjects(projectsData.projects ?? []);
      setDeployments(deploymentsData.deployments ?? []);

      if (!projectId && projectsData.projects?.length > 0) {
        setProjectId(projectsData.projects[0].id);
      }

      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load deployment data"
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    const interval = setInterval(() => {
      void loadData();
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [loadData]);

  async function createDeployment(event: FormEvent) {
    event.preventDefault();

    if (!projectId) {
      setError("Select a project first.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response = await fetch("/api/deployments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          branch,
          imageName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create deployment"
        );
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create deployment"
      );
    } finally {
      setCreating(false);
    }
  }

  async function runDeployment(id: string) {
    try {
      setRunningId(id);
      setError("");

      const response = await fetch(
        `/api/deployments/${id}/deploy`,
        {
          method: "POST",
        }
      );

      const text = await response.text();

      let data: {
        error?: string;
      } = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error || text || "Deployment failed"
        );
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Deployment failed"
      );
    } finally {
      setRunningId(null);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-200 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-white">
            Deployments
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Build, deploy, and monitor application releases.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-5 font-semibold text-white">
            Create Deployment
          </h2>

          <form
            onSubmit={createDeployment}
            className="grid gap-4 md:grid-cols-4"
          >
            <div>
              <label className="mb-2 block text-xs text-zinc-500">
                Project
              </label>

              <select
                value={projectId}
                onChange={(event) =>
                  setProjectId(event.target.value)
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
              >
                <option value="">Select project</option>

                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                  >
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs text-zinc-500">
                Branch
              </label>

              <input
                value={branch}
                onChange={(event) =>
                  setBranch(event.target.value)
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                placeholder="main"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-zinc-500">
                Docker Image
              </label>

              <input
                value={imageName}
                onChange={(event) =>
                  setImageName(event.target.value)
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-violet-500"
                placeholder="my-app:latest"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating
                  ? "Creating..."
                  : "Create Deployment"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 p-6">
            <h2 className="font-semibold text-white">
              Deployment History
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-zinc-500">
              Loading deployments...
            </div>
          ) : deployments.length === 0 ? (
            <div className="p-6 text-sm text-zinc-500">
              No deployments found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-800 text-xs text-zinc-500">
                  <tr>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Branch</th>
                    <th className="px-6 py-4">Image</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Triggered By</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-800">
                  {deployments.map((deployment) => (
                    <tr
                      key={deployment.id}
                      className="hover:bg-zinc-800/30"
                    >
                      <td className="px-6 py-4 font-medium text-white">
                        {deployment.project.name}
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                        {deployment.branch}
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-violet-400">
                        {deployment.imageName}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                            deployment.status
                          )}`}
                        >
                          {deployment.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-zinc-400">
                        {deployment.triggeredBy?.name || "-"}
                      </td>

                      <td className="px-6 py-4 text-xs text-zinc-500">
                        {new Date(
                          deployment.createdAt
                        ).toLocaleString("id-ID")}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">

                          <Link
                            href={`/deployments/${deployment.id}`}
                            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
                          >
                            Details
                          </Link>

                          <button
                            onClick={() =>
                              void runDeployment(
                                deployment.id
                              )
                            }
                            disabled={
                              runningId === deployment.id
                            }
                            className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {runningId === deployment.id
                              ? "Deploying..."
                              : "Deploy Now"}
                          </button>

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