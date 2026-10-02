"use client";

import { useEffect, useState } from "react";

type Session = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type SystemInfo = {
  node: string;
  platform: string;
  arch: string;
  database: string;
  aiModel: string;
  docker: string;
  kubernetes: string;
};

export default function SettingsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [system, setSystem] = useState<SystemInfo>({
    node: "Loading...",
    platform: "Loading...",
    arch: "Loading...",
    database: "PostgreSQL",
    aiModel: "OpenRouter",
    docker: "Docker Engine",
    kubernetes: "Kubernetes",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });

        if (response.ok) {
          const result = await response.json();

          if (result?.user) {
            setSession(result.user);
          }
        }
      } catch {
        // Session endpoint may not exist in this project.
      }

      setSystem({
        node: "Node.js 24",
        platform: "Windows / Docker Desktop",
        arch: "x64",
        database: "PostgreSQL + Prisma",
        aiModel: "OpenRouter",
        docker: "Docker Engine",
        kubernetes: "kind / Kubernetes",
      });
    };

    load();
  }, []);

  return (
    <main className="min-h-screen bg-[#08090b] p-6 text-white md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Settings
          </h1>

          <p className="mt-2 text-sm text-white/50">
            Manage NEXUS account, platform configuration, and runtime information.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">
              Account
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/30">
                  Name
                </p>
                <p className="mt-1 text-sm">
                  {session?.name ?? "NEXUS Admin"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-white/30">
                  Email
                </p>
                <p className="mt-1 text-sm">
                  {session?.email ?? "admin@nexus.local"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-white/30">
                  Role
                </p>
                <span className="mt-2 inline-flex rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
                  {session?.role ?? "OWNER"}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">
              Access Control
            </h2>

            <div className="mt-5 space-y-3">
              {[
                ["OWNER", "Full platform access"],
                ["ADMIN", "Administrative access"],
                ["DEVOPS", "Infrastructure and deployment access"],
                ["DEVELOPER", "Project and deployment development access"],
                ["VIEWER", "Read-only access"],
              ].map(([role, description]) => (
                <div
                  key={role}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {role}
                    </p>
                    <p className="text-xs text-white/40">
                      {description}
                    </p>
                  </div>

                  <span className="text-xs text-emerald-400">
                    RBAC
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">
              Platform Runtime
            </h2>

            <div className="mt-5 grid gap-3">
              {Object.entries(system).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3"
                >
                  <span className="text-sm capitalize text-white/50">
                    {key}
                  </span>

                  <span className="text-sm font-medium">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">
              AI & Security
            </h2>

            <div className="mt-5 space-y-3">
              {[
                ["AI DevOps Copilot", "Enabled", "text-emerald-400"],
                ["Incident RCA", "Enabled", "text-emerald-400"],
                ["Docker Security", "Active", "text-emerald-400"],
                ["Dependency Scan", "Active", "text-emerald-400"],
                ["Network Exposure Scan", "Active", "text-emerald-400"],
                ["Secrets Scan", "Active", "text-emerald-400"],
              ].map(([name, status, color]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3"
                >
                  <span className="text-sm">
                    {name}
                  </span>

                  <span className={`text-xs ${color}`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:col-span-2">
            <h2 className="text-lg font-semibold">
              Configuration
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs text-white/40">
                  Database
                </p>
                <p className="mt-2 text-sm font-semibold">
                  PostgreSQL
                </p>
                <p className="mt-1 text-xs text-emerald-400">
                  Prisma ORM
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs text-white/40">
                  Cache
                </p>
                <p className="mt-2 text-sm font-semibold">
                  Redis
                </p>
                <p className="mt-1 text-xs text-white/40">
                  Available for platform services
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs text-white/40">
                  CI/CD
                </p>
                <p className="mt-2 text-sm font-semibold">
                  GitHub Actions
                </p>
                <p className="mt-1 text-xs text-emerald-400">
                  Build pipeline enabled
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6 md:col-span-2">
            <h2 className="text-lg font-semibold text-yellow-400">
              Security Notice
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/60">
              Production credentials, JWT secrets, API keys, and database
              passwords should be stored using environment secrets or a
              dedicated secrets manager. Never commit them to Git.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}