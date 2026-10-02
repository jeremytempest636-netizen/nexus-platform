"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Overview", href: "/" },
  { name: "Applications", href: "/applications" },
  { name: "Deployments", href: "/deployments" },
  { name: "Infrastructure", href: "/infrastructure" },
  { name: "Kubernetes", href: "/kubernetes" },
  { name: "Containers", href: "/containers" },
  { name: "Incidents", href: "/incidents" },
  { name: "AI Copilot", href: "/ai-copilot" },
  { name: "Logs", href: "/logs" },
  { name: "Security", href: "/security" },
  { name: "Settings", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-800 bg-slate-950 px-4 py-6">
      <div className="mb-8 px-3">
        <div className="text-2xl font-bold tracking-wider text-white">
          NEXUS
        </div>
        <div className="text-xs text-slate-500">
          Intelligent Operations Platform
        </div>
      </div>

      <nav className="space-y-1">
        {navigation.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-4 py-3 text-sm transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-6 left-4 right-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-2 text-xs text-slate-500">
          SYSTEM STATUS
        </div>

        <div className="flex items-center gap-2 text-sm text-green-400">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          All systems operational
        </div>
      </div>
    </aside>
  );
}
