"use client";

import { useState } from "react";

export default function AICopilotPage() {
  const [prompt, setPrompt] = useState("");

  return (
    <main className="min-h-screen bg-[#05070d] p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-blue-400">
            NEXUS AI
          </p>

          <h1 className="text-3xl font-bold">
            AI DevOps Copilot
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Analyze infrastructure, deployments, incidents, logs, and
            application health.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-zinc-800 bg-[#0b0f18] p-6 lg:col-span-2">
            <div className="mb-5">
              <h2 className="font-semibold">
                Infrastructure Assistant
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Ask NEXUS to investigate an infrastructure problem.
              </p>
            </div>

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Example: Why is my API container using high CPU?"
              rows={7}
              className="w-full resize-none rounded-xl border border-zinc-800 bg-[#070a11] p-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-blue-500"
            />

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={!prompt.trim()}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Analyze with AI
              </button>
            </div>
          </section>

          <aside className="rounded-2xl border border-zinc-800 bg-[#0b0f18] p-6">
            <h2 className="font-semibold">
              Available Context
            </h2>

            <div className="mt-5 space-y-3">
              {[
                ["CPU Metrics", "Available"],
                ["Memory Metrics", "Available"],
                ["Docker Containers", "Available"],
                ["Application Logs", "Available"],
                ["Deployment History", "Available"],
                ["Incident History", "Available"],
              ].map(([name, status]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-[#070a11] px-4 py-3"
                >
                  <span className="text-sm text-zinc-300">
                    {name}
                  </span>

                  <span className="text-xs text-emerald-400">
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-[#0b0f18] p-6">
          <h2 className="font-semibold">
            AI Diagnosis
          </h2>

          <div className="mt-4 rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <p className="text-sm text-zinc-500">
              No analysis yet.
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              Submit an infrastructure question to generate a diagnosis.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
