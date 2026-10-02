import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "NEXUS Platform",
  description: "AI-Powered Infrastructure and Application Operations Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">
        <Sidebar />

        <main className="min-h-screen pl-64">
          {children}
        </main>
      </body>
    </html>
  );
}
