"use client";

import { useEffect, useState } from "react";

type Finding = {
  severity: "PASS" | "WARNING" | "CRITICAL";
  title: string;
  description: string;
  container?: string;
};

type ImageSecurityFinding = {
  severity: "PASS" | "WARNING" | "CRITICAL" | "INFO";
  title: string;
  description: string;
};

type SecretSecurityFinding = {
  containerId: string;
  containerName: string;
  variable: string;
  severity: "WARNING" | "CRITICAL";
  reason: string;
};

type SecretSecuritySummary = {
  total: number;
  critical: number;
  warning: number;
};

type SecretSecurityResult = {
  success: boolean;
  status: string;
  summary: SecretSecuritySummary;
  findings: SecretSecurityFinding[];
  scannedContainers: number;
  scannedAt: string;
  note: string;
};
type NetworkSecurityFinding = {
  containerId: string;
  containerName: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  type: string;
  title: string;
  description: string;
  port?: string;
  binding?: string;
};

type NetworkSecuritySummary = {
  total: number;
  critical: number;
  warning: number;
  info: number;
};

type NetworkSecurityResult = {
  success: boolean;
  status: string;
  summary: NetworkSecuritySummary;
  findings: NetworkSecurityFinding[];
  scannedContainers: number;
  scannedAt: string;
};
type DependencySecurityPackage = {
  name: string;
  severity: string;
  direct: boolean;
  range: string;
  fixAvailable: boolean;
  fix: {
    name: string;
    version: string;
    major: boolean;
  } | null;
};

type DependencySecuritySummary = {
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
};

type DependencySecurityResult = {
  success: boolean;
  status: string;
  summary: DependencySecuritySummary;
  packages: DependencySecurityPackage[];
  scannedAt: string;
  source: string;
};

type ImageSecurityResult = {
  id: string;
  tags: string[];
  size: number;
  created: string;
  architecture: string;
  os: string;
  user: string;
  exposedPorts: string[];
  findings: ImageSecurityFinding[];
};
type SecurityData = {
  success: boolean;
  status: "PASS" | "WARNING" | "CRITICAL";
  summary: {
    containers: number;
    critical: number;
    warning: number;
    pass: number;
  };
  findings: Finding[];
  scannedContainers: {
    id: string;
    name: string;
    image: string;
    state: string;
  }[];
  scannedAt: string;
  error?: string;
};

export default function SecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [images, setImages] = useState<ImageSecurityResult[]>([]);
  const [secretFindings, setSecretFindings] = useState<SecretSecurityFinding[]>([]);
const [secretSummary, setSecretSummary] = useState<SecretSecuritySummary>({
  total: 0,
  critical: 0,
  warning: 0,
});
const [secretStatus, setSecretStatus] = useState("PASS");
const [networkFindings, setNetworkFindings] = useState<NetworkSecurityFinding[]>([]);
  const [networkSummary, setNetworkSummary] = useState<NetworkSecuritySummary>({
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
  });
  const [networkStatus, setNetworkStatus] = useState("PASS");
  const [dependencyPackages, setDependencyPackages] = useState<DependencySecurityPackage[]>([]);
  const [dependencySummary, setDependencySummary] = useState<DependencySecuritySummary>({
    total: 0,
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    info: 0,
  });
  const [dependencyStatus, setDependencyStatus] = useState("PASS");
  const [imageSummary, setImageSummary] = useState({
    images: 0,
    critical: 0,
    warning: 0,
  });

  async function scanSecrets() {
  try {
    const response = await fetch(
      "/api/security/secrets",
      {
        cache: "no-store",
      }
    );

    const result =
      (await response.json()) as SecretSecurityResult;

    if (!response.ok || !result.success) {
      return;
    }

    setSecretFindings(result.findings ?? []);

    setSecretSummary(
      result.summary ?? {
        total: 0,
        critical: 0,
        warning: 0,
      }
    );

    setSecretStatus(result.status ?? "PASS");
  } catch (err) {
    console.error(
      "Secrets security scan failed:",
      err
    );
  }
}
async function scanNetwork() {
    try {
      const response = await fetch(
        "/api/security/network",
        {
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as NetworkSecurityResult;

      if (!response.ok || !result.success) {
        return;
      }

      setNetworkFindings(result.findings ?? []);

      setNetworkSummary(
        result.summary ?? {
          total: 0,
          critical: 0,
          warning: 0,
          info: 0,
        }
      );

      setNetworkStatus(result.status ?? "PASS");
    } catch (err) {
      console.error(
        "Network security scan failed:",
        err
      );
    }
  }
  async function scanDependencies() {
    try {
      const response = await fetch(
        "/api/security/dependencies",
        {
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as DependencySecurityResult;

      if (!response.ok || !result.success) {
        return;
      }

      setDependencyPackages(result.packages ?? []);

      setDependencySummary(
        result.summary ?? {
          total: 0,
          critical: 0,
          high: 0,
          moderate: 0,
          low: 0,
          info: 0,
        }
      );

      setDependencyStatus(result.status ?? "PASS");
    } catch (err) {
      console.error(
        "Dependency security scan failed:",
        err
      );
    }
  }

  async function scan() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/security", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Security scan gagal");
      }

      setData(result);

      const imageResponse = await fetch("/api/security/images", {
        cache: "no-store",
      });

      const imageResult = await imageResponse.json();

      if (imageResponse.ok && imageResult.success) {
        setImages(imageResult.images ?? []);
        setImageSummary(
          imageResult.summary ?? {
            images: 0,
            critical: 0,
            warning: 0,
          }
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Security scan gagal"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialScan = setTimeout(() => {
      scan();
      scanDependencies();
      scanSecrets();
    scanNetwork();
    }, 0);

    const interval = setInterval(() => {
      scan();
      scanDependencies();
      scanSecrets();
    scanNetwork();
    }, 15000);

    return () => {
      clearTimeout(initialScan);
      clearInterval(interval);
    };
  }, []);

  const statusClass =
    data?.status === "CRITICAL"
      ? "border-red-500/40 bg-red-500/10 text-red-400"
      : data?.status === "WARNING"
        ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
        : "border-green-500/40 bg-green-500/10 text-green-400";

  return (
    <main className="min-h-screen bg-slate-950 px-8 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-xs font-semibold tracking-[0.3em] text-blue-400">
              NEXUS SECURITY
            </div>

            <h1 className="text-3xl font-bold">
              Security Center
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Runtime security analysis for Docker containers.
            </p>
          </div>

          <button
            onClick={scan}
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Scanning..." : "Run Scan"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {data && (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <div className={`rounded-xl border p-5 ${statusClass}`}>
                <div className="text-xs uppercase tracking-wider opacity-70">
                  Security Status
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {data.status}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="text-xs text-slate-500">
                  Containers
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {data.summary.containers}
                </div>
              </div>

              <div className="rounded-xl border border-red-500/20 bg-slate-900 p-5">
                <div className="text-xs text-red-400">
                  Critical
                </div>
                <div className="mt-2 text-2xl font-bold text-red-400">
                  {data.summary.critical}
                </div>
              </div>

              <div className="rounded-xl border border-yellow-500/20 bg-slate-900 p-5">
                <div className="text-xs text-yellow-400">
                  Warnings
                </div>
                <div className="mt-2 text-2xl font-bold text-yellow-400">
                  {data.summary.warning}
                </div>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">
                    Scanned Containers
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Docker runtime security inventory
                  </p>
                </div>

                <div className="text-xs text-slate-500">
                  Last scan{" "}
                  {new Date(data.scannedAt).toLocaleTimeString()}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Container</th>
                      <th className="px-3 py-3">Image</th>
                      <th className="px-3 py-3">State</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.scannedContainers.map((container) => (
                      <tr
                        key={container.id}
                        className="border-b border-slate-800/60"
                      >
                        <td className="px-3 py-3 font-medium">
                          {container.name}
                        </td>
                        <td className="px-3 py-3 text-slate-400">
                          {container.image}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-400">
                            {container.state}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">
                    Dependency Security
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    npm audit vulnerability analysis
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    dependencyStatus === "CRITICAL"
                      ? "bg-red-500/10 text-red-400"
                      : dependencyStatus === "HIGH"
                        ? "bg-orange-500/10 text-orange-400"
                        : dependencyStatus === "WARNING"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-green-500/10 text-green-400"
                  }`}
                >
                  {dependencyStatus}
                </span>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-5">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs text-slate-500">
                    Total
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {dependencySummary.total}
                  </div>
                </div>

                <div className="rounded-lg border border-red-500/20 bg-slate-950 p-4">
                  <div className="text-xs text-red-400">
                    Critical
                  </div>
                  <div className="mt-2 text-2xl font-bold text-red-400">
                    {dependencySummary.critical}
                  </div>
                </div>

                <div className="rounded-lg border border-orange-500/20 bg-slate-950 p-4">
                  <div className="text-xs text-orange-400">
                    High
                  </div>
                  <div className="mt-2 text-2xl font-bold text-orange-400">
                    {dependencySummary.high}
                  </div>
                </div>

                <div className="rounded-lg border border-yellow-500/20 bg-slate-950 p-4">
                  <div className="text-xs text-yellow-400">
                    Moderate
                  </div>
                  <div className="mt-2 text-2xl font-bold text-yellow-400">
                    {dependencySummary.moderate}
                  </div>
                </div>

                <div className="rounded-lg border border-green-500/20 bg-slate-950 p-4">
                  <div className="text-xs text-green-400">
                    Low
                  </div>
                  <div className="mt-2 text-2xl font-bold text-green-400">
                    {dependencySummary.low}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Package</th>
                      <th className="px-3 py-3">Severity</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Range</th>
                      <th className="px-3 py-3">Fix</th>
                    </tr>
                  </thead>

                  <tbody>
                    {dependencyPackages.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-8 text-center text-sm text-slate-500"
                        >
                          No dependency vulnerabilities detected.
                        </td>
                      </tr>
                    ) : (
                      dependencyPackages.map((pkg) => (
                        <tr
                          key={pkg.name}
                          className="border-b border-slate-800/60 last:border-0"
                        >
                          <td className="px-3 py-3 font-medium">
                            {pkg.name}
                          </td>

                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                pkg.severity === "critical"
                                  ? "bg-red-500/10 text-red-400"
                                  : pkg.severity === "high"
                                    ? "bg-orange-500/10 text-orange-400"
                                    : pkg.severity === "moderate"
                                      ? "bg-yellow-500/10 text-yellow-400"
                                      : "bg-green-500/10 text-green-400"
                              }`}
                            >
                              {pkg.severity.toUpperCase()}
                            </span>
                          </td>

                          <td className="px-3 py-3 text-slate-400">
                            {pkg.direct ? "Direct" : "Transitive"}
                          </td>

                          <td className="px-3 py-3 text-xs text-slate-500">
                            {pkg.range || "-"}
                          </td>

                          <td className="px-3 py-3">
                            {pkg.fixAvailable && pkg.fix ? (
                              <div>
                                <div className="text-green-400">
                                  Available
                                </div>
                                <div className="text-xs text-slate-500">
                                  {pkg.fix.name} {pkg.fix.version}
                                  {pkg.fix.major ? " Ã¢â‚¬Â¢ major" : ""}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500">
                                No fix
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">
                    Network Exposure
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Docker port and network exposure analysis
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    networkStatus === "CRITICAL"
                      ? "bg-red-500/10 text-red-400"
                      : networkStatus === "WARNING"
                        ? "bg-orange-500/10 text-orange-400"
                        : "bg-green-500/10 text-green-400"
                  }`}
                >
                  {networkStatus}
                </span>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs text-slate-500">
                    Exposures
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {networkSummary.total}
                  </div>
                </div>

                <div className="rounded-lg border border-red-500/20 bg-slate-950 p-4">
                  <div className="text-xs text-red-400">
                    Critical
                  </div>
                  <div className="mt-2 text-2xl font-bold text-red-400">
                    {networkSummary.critical}
                  </div>
                </div>

                <div className="rounded-lg border border-orange-500/20 bg-slate-950 p-4">
                  <div className="text-xs text-orange-400">
                    Warning
                  </div>
                  <div className="mt-2 text-2xl font-bold text-orange-400">
                    {networkSummary.warning}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs text-slate-500">
                    Containers Scanned
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {data?.scannedContainers?.length ?? 0}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Container</th>
                      <th className="px-3 py-3">Severity</th>
                      <th className="px-3 py-3">Port</th>
                      <th className="px-3 py-3">Binding</th>
                      <th className="px-3 py-3">Finding</th>
                    </tr>
                  </thead>

                  <tbody>
                    {networkFindings.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-8 text-center text-sm text-slate-500"
                        >
                          No network exposure detected.
                        </td>
                      </tr>
                    ) : (
                      networkFindings.map((finding, index) => (
                        <tr
                          key={`${finding.containerId}-${finding.port}-${index}`}
                          className="border-b border-slate-800/60 last:border-0"
                        >
                          <td className="px-3 py-3 font-medium">
                            {finding.containerName}
                          </td>

                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                finding.severity === "CRITICAL"
                                  ? "bg-red-500/10 text-red-400"
                                  : finding.severity === "WARNING"
                                    ? "bg-orange-500/10 text-orange-400"
                                    : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {finding.severity}
                            </span>
                          </td>

                          <td className="px-3 py-3 font-mono text-xs">
                            {finding.port ?? "-"}
                          </td>

                          <td className="px-3 py-3 font-mono text-xs text-slate-400">
                            {finding.binding ?? "-"}
                          </td>

                          <td className="px-3 py-3">
                            <div className="font-medium">
                              {finding.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {finding.description}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5">
                <h2 className="font-semibold">
                  Image Security
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Docker image configuration analysis
                </p>
              </div>

              <div className="mb-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs text-slate-500">
                    Images Scanned
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {imageSummary.images}
                  </div>
                </div>

                <div className="rounded-lg border border-red-500/20 bg-slate-950 p-4">
                  <div className="text-xs text-red-400">
                    Critical
                  </div>
                  <div className="mt-2 text-2xl font-bold text-red-400">
                    {imageSummary.critical}
                  </div>
                </div>

                <div className="rounded-lg border border-yellow-500/20 bg-slate-950 p-4">
                  <div className="text-xs text-yellow-400">
                    Warnings
                  </div>
                  <div className="mt-2 text-2xl font-bold text-yellow-400">
                    {imageSummary.warning}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {images.length === 0 ? (
                  <div className="rounded-lg border border-slate-800 p-4 text-sm text-slate-500">
                    Tidak ada Docker image yang ditemukan.
                  </div>
                ) : (
                  images.map((image) => (
                    <div
                      key={image.id}
                      className="rounded-lg border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium">
                            {image.tags?.length
                              ? image.tags.join(", ")
                              : "<untagged>"}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {image.os} / {image.architecture}
                          </div>
                        </div>

                        <div className="text-xs text-slate-500">
                          {(image.size / 1024 / 1024).toFixed(1)} MB
                        </div>
                      </div>

                      <div className="space-y-2">
                        {image.findings?.map(
                          (finding: ImageSecurityFinding, index: number) => (
                            <div
                              key={`${image.id}-${index}`}
                              className="flex items-center justify-between rounded border border-slate-800 px-3 py-2"
                            >
                              <div>
                                <div className="text-sm">
                                  {finding.title}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {finding.description}
                                </div>
                              </div>

                              <span
                                className={`text-xs font-bold ${
                                  finding.severity === "WARNING"
                                    ? "text-yellow-400"
                                    : finding.severity === "CRITICAL"
                                      ? "text-red-400"
                                      : "text-green-400"
                                }`}
                              >
                                {finding.severity}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5">
                <h2 className="font-semibold">
                  Security Findings
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Container configuration checks
                </p>
              </div>

              <div className="space-y-3">
                {data.findings.map((finding, index) => {
                  const findingClass =
                    finding.severity === "CRITICAL"
                      ? "border-red-500/20 bg-red-500/5"
                      : finding.severity === "WARNING"
                        ? "border-yellow-500/20 bg-yellow-500/5"
                        : "border-green-500/20 bg-green-500/5";

                  const badgeClass =
                    finding.severity === "CRITICAL"
                      ? "text-red-400"
                      : finding.severity === "WARNING"
                        ? "text-yellow-400"
                        : "text-green-400";

                  return (
                    <div
                      key={`${finding.title}-${finding.container}-${index}`}
                      className={`rounded-lg border p-4 ${findingClass}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium">
                            {finding.title}
                          </div>

                          <div className="mt-1 text-sm text-slate-400">
                            {finding.description}
                          </div>

                          {finding.container && (
                            <div className="mt-2 text-xs text-slate-500">
                              Container: {finding.container}
                            </div>
                          )}
                        </div>

                        <span
                          className={`text-xs font-bold ${badgeClass}`}
                        >
                          {finding.severity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Secrets & Environment Security
              </h2>
              <p className="mt-1 text-sm text-white/50">
                Detects environment variables that may contain sensitive credentials.
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                secretStatus === "CRITICAL"
                  ? "bg-red-500/15 text-red-400"
                  : secretStatus === "WARNING"
                    ? "bg-yellow-500/15 text-yellow-400"
                    : "bg-emerald-500/15 text-emerald-400"
              }`}
            >
              {secretStatus}
            </span>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-white/40">
                Findings
              </p>
              <p className="mt-2 text-2xl font-bold">
                {secretSummary.total}
              </p>
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-xs uppercase tracking-wide text-red-300/60">
                Critical
              </p>
              <p className="mt-2 text-2xl font-bold text-red-400">
                {secretSummary.critical}
              </p>
            </div>

            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
              <p className="text-xs uppercase tracking-wide text-yellow-300/60">
                Warning
              </p>
              <p className="mt-2 text-2xl font-bold text-yellow-400">
                {secretSummary.warning}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40">
                  <th className="px-3 py-3 font-medium">Container</th>
                  <th className="px-3 py-3 font-medium">Variable</th>
                  <th className="px-3 py-3 font-medium">Severity</th>
                  <th className="px-3 py-3 font-medium">Finding</th>
                </tr>
              </thead>

              <tbody>
                {secretFindings.map((finding, index) => (
                  <tr
                    key={`${finding.containerId}-${finding.variable}-${index}`}
                    className="border-b border-white/5"
                  >
                    <td className="px-3 py-3">
                      {finding.containerName}
                    </td>

                    <td className="px-3 py-3 font-mono text-xs">
                      {finding.variable}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={
                          finding.severity === "CRITICAL"
                            ? "text-red-400"
                            : "text-yellow-400"
                        }
                      >
                        {finding.severity}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-white/60">
                      {finding.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-white/30">
            Secret values are never displayed or returned by the security scan.
          </p>
        </section>
</main>
  );
}




