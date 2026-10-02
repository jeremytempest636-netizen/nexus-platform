export default function Dashboard() {
  const stats = [
    ["Applications", "12"],
    ["Containers", "24"],
    ["CPU Usage", "42%"],
    ["Memory", "61%"],
  ];

  const services = [
    ["Frontend", "Running", "99.99%"],
    ["Backend API", "Running", "99.95%"],
    ["PostgreSQL", "Running", "99.98%"],
    ["Redis", "Running", "99.99%"],
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-sm text-slate-500">NEXUS CONTROL CENTER</p>
        <h1 className="mt-1 text-3xl font-bold">Overview</h1>
        <p className="mt-2 text-slate-400">
          Monitor applications, infrastructure and intelligent operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map(([name, value]) => (
          <div
            key={name}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5"
          >
            <p className="text-sm text-slate-500">{name}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Services</h2>

          <div className="mt-5 space-y-3">
            {services.map(([name, status, uptime]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border border-slate-800 p-4"
              >
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-green-400">{status}</p>
                </div>

                <span className="text-sm text-slate-400">
                  {uptime}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">AI DevOps Copilot</h2>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            NEXUS AI continuously analyzes infrastructure metrics,
            containers, logs and incidents to identify possible root causes.
          </p>

          <a
            href="/ai-copilot"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium hover:bg-blue-500"
          >
            Open AI Copilot
          </a>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Recent Incidents</h2>

        <div className="mt-5 space-y-3">
          {[
            ["#1042", "Backend API high latency", "Investigating"],
            ["#1041", "Container restarted", "Resolved"],
            ["#1040", "High memory usage", "Resolved"],
          ].map(([id, title, status]) => (
            <div
              key={id}
              className="flex items-center justify-between border-b border-slate-800 pb-3"
            >
              <div>
                <span className="mr-3 text-xs text-slate-500">{id}</span>
                <span>{title}</span>
              </div>

              <span className="text-sm text-yellow-400">
                {status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
