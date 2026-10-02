export default function SecurityPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Security</h1>
      <p className="mt-2 text-slate-400">
        Security posture, vulnerabilities and configuration checks.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {["Container Scan", "Dependencies", "Configuration"].map((item) => (
          <div
            key={item}
            className="rounded-xl border border-slate-800 bg-slate-900 p-6"
          >
            <p className="font-medium">{item}</p>
            <p className="mt-2 text-sm text-slate-500">
              Scanner not connected
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
