"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setError("Unable to connect to NEXUS server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold shadow-lg shadow-blue-600/20">
            N
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            NEXUS
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Intelligent Infrastructure & Application Platform
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#0b0f18] p-7 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Welcome back
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Sign in to your NEXUS workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@nexus.local"
                required
                className="w-full rounded-xl border border-zinc-800 bg-[#070a11] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-zinc-800 bg-[#070a11] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 border-t border-zinc-800 pt-6 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              Create one
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          NEXUS Platform • Secure Infrastructure Operations
        </p>
      </div>
    </main>
  );
}
