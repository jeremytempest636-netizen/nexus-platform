import Docker from "dockerode";

const globalForDocker = globalThis as unknown as {
  docker: Docker | undefined;
};

export const docker =
  globalForDocker.docker ??
  new Docker({
    socketPath:
      process.platform === "win32"
        ? "//./pipe/docker_engine"
        : "/var/run/docker.sock",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDocker.docker = docker;
}
