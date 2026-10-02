import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AppPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const [projects, deployments, incidents] = await Promise.all([
    prisma.project.count(),
    prisma.deployment.count(),
    prisma.incident.count({
      where: {
        status: {
          in: ["OPEN", "INVESTIGATING"],
        },
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <div className="flex min-h-screen">
        <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-zinc-800 bg-[#080b12] lg:block">
          <div className="flex h-16 items-center border-b border-zinc-800 px-6">
            <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold">
              N
            </div>

            <div>
              <div className="font-bold tracking-wide">NEXUS</div>
              <div className="text-[10px] text-zinc-500">PLATFORM</div>
            </div>
          </div>

          <nav className="p-4">
            {[
              ["Overview", "/app"],
              ["Applications", "/applications"],
              ["Deployments", "/deployments"],
              ["Infrastructure", "/infrastructure"],
              ["Kubernetes", "/kubernetes"],
              ["Containers", "/containers"],
              ["Incidents", "/incidents"],
              ["AI Copilot", "/ai-copilot"],
              ["Logs", "/logs"],
              ["Security", "/security"],
              ["Settings", "/settings"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className={`mb-1 block rounded-xl px-4 py-3 text-sm transition ${
                  href === "/app"
                    ? "bg-blue-600/10 font-medium text-blue-400"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {user.name}
                </div>
                <div className="truncate text-xs text-zinc-500">
                  {user.role}
                </div>
              </div>
            </div>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-400 transition hover:border-red-900 hover:text-red-400"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <section className="min-w-0 flex-1 lg:ml-64">
          <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-[#080b12] px-6">
            <div>
              <h1 className="font-semibold">Overview</h1>
              <p className="text-xs text-zinc-500">
                Intelligent Infrastructure Operations
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-xs text-zinc-500">{user.email}</div>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-2xl font-bold">
                Welcome back, {user.name.split(" ")[0]}.
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Here is the current state of your NEXUS platform.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Projects", projects, "Active workspaces"],
                ["Deployments", deployments, "Total deployments"],
                ["Open Incidents", incidents, "Requires attention"],
                ["Your Role", user.role, "Access level"],
              ].map(([label, value, description]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-zinc-800 bg-[#0b0f18] p-5"
                >
                  <div className="text-sm text-zinc-500">{label}</div>

                  <div className="mt-3 text-2xl font-bold">{value}</div>

                  <div className="mt-1 text-xs text-zinc-600">
                    {description}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800 bg-[#0b0f18] p-6 xl:col-span-2">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">Platform Status</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Core NEXUS services
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Operational
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Next.js Application", "Operational"],
                    ["PostgreSQL", "Connected"],
                    ["Prisma", "Operational"],
                    ["Authentication", "Operational"],
                  ].map(([name, status]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-xl border border-zinc-800 bg-[#070a11] px-4 py-4"
                    >
                      <span className="text-sm text-zinc-300">{name}</span>

                      <span className="text-xs text-emerald-400">
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-900/40 bg-blue-950/10 p-6">
                <div className="mb-3 text-sm font-medium text-blue-400">
                  AI DevOps Copilot
                </div>

                <h2 className="text-lg font-semibold">
                  Investigate infrastructure
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Analyze metrics, logs, containers, deployments, and
                  incidents using AI-powered root cause analysis.
                </p>

                <a
                  href="/ai-copilot"
                  className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-blue-500"
                >
                  Open Copilot
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
