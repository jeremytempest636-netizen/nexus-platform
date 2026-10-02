"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Bot,
  Send,
  Sparkles,
  User,
  AlertCircle,
  FolderKanban,
} from "lucide-react";

type Project = {
  id: string;
  name: string;
  slug: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function AICopilotPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Halo! Saya NEXUS AI DevOps Copilot. Saya dapat membantu menganalisis deployment, incident, Docker, infrastructure, logs, CI/CD, dan troubleshooting aplikasi.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      try {
        const response = await fetch("/api/projects", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load projects");
        }

        if (!cancelled) {
          const projectList = Array.isArray(data.projects)
            ? data.projects
            : [];

          setProjects(projectList);

          if (projectList.length > 0) {
            setProjectId(projectList[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load projects"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();

    const message = input.trim();

    if (!message || sending) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setSending(true);

    try {
      const response = await fetch("/api/ai-copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          projectId: projectId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "AI Copilot request failed"
        );
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          data.answer || "AI returned an empty response.",
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "AI Copilot request failed";

      setError(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600/20 p-3 text-blue-400">
                <Bot size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  AI DevOps Copilot
                </h1>
                <p className="text-sm text-slate-400">
                  Intelligent infrastructure investigation and operations assistant.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
            <FolderKanban size={18} className="text-slate-400" />

            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              disabled={loadingProjects || projects.length === 0}
              className="min-w-56 bg-transparent text-sm outline-none"
            >
              {projects.length === 0 ? (
                <option value="">
                  No project available
                </option>
              ) : (
                projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                    className="bg-slate-900"
                  >
                    {project.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex min-h-[650px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-4">
            <Sparkles size={18} className="text-blue-400" />

            <div>
              <h2 className="font-semibold">
                NEXUS AI
              </h2>

              <p className="text-xs text-slate-500">
                Project-aware DevOps assistant
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Online
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
                    <Bot size={18} />
                  </div>
                )}

                <div
                  className={`max-w-3xl whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "border border-slate-800 bg-slate-950 text-slate-200"
                  }`}
                >
                  {message.content}
                </div>

                {message.role === "user" && (
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                    <User size={18} />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
                  <Bot size={18} />
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">
                  NEXUS AI sedang menganalisis...
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={sendMessage}
            className="border-t border-slate-800 p-4"
          >
            <div className="flex items-end gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3 focus-within:border-blue-500">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ask NEXUS AI about your infrastructure..."
                rows={2}
                disabled={sending}
                className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-600"
              />

              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={18} />
              </button>
            </div>

            <p className="mt-2 px-1 text-xs text-slate-600">
              Enter untuk mengirim � Shift + Enter untuk baris baru
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
