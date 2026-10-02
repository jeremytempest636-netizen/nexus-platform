export default function LogsPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Logs</h1>
      <p className="mt-2 text-slate-400">
        Centralized application and infrastructure logs.
      </p>

      <div className="mt-8 rounded-xl border border-slate-800 bg-black p-6 font-mono text-sm text-green-400">
        NEXUS LOG STREAM
        <br />
        Waiting for log collector...
      </div>
    </div>
  );
}
