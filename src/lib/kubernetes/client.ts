import * as k8s from "@kubernetes/client-node";

let cachedClient: {
  kc: k8s.KubeConfig;
  core: k8s.CoreV1Api;
  apps: k8s.AppsV1Api;
} | null = null;

export function getKubernetesClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();

  cachedClient = {
    kc,
    core: kc.makeApiClient(k8s.CoreV1Api),
    apps: kc.makeApiClient(k8s.AppsV1Api),
  };

  return cachedClient;
}
